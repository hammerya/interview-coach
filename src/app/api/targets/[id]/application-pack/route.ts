import { createClient } from "@/lib/supabase/server";
import { getAnthropic, CLAUDE_MODEL, extractJson } from "@/lib/anthropic";
import type { InterviewTarget, Profile, ResumeReview } from "@/lib/types";

export const runtime = "nodejs";
// Vercel Hobby caps at 60s. Stay well under.
export const maxDuration = 60;

interface PackResponse {
  pitch_headline: string;
  cover_letter: string;
  resume_review: ResumeReview;
}

function buildPrompt(profile: Profile, target: InterviewTarget) {
  const today = new Date().toISOString().slice(0, 10);
  return `You are helping a candidate apply to a specific role. Generate three artifacts:
a one-paragraph pitch headline, a tailored cover letter, and a focused resume review.
Write in the candidate's voice — warm, specific, grounded. Avoid corporate filler.

CANDIDATE PROFILE
- Name: ${profile.full_name ?? "(not set)"}
- Pronouns: ${profile.pronouns ?? "(not set)"}
- Current/recent role: ${profile.current_role_title ?? "(not set)"}
- Years of experience: ${profile.years_experience ?? "(not set)"}
- Strengths: ${(profile.strengths ?? []).join(", ") || "(not set)"}
- Growth areas: ${(profile.growth_areas ?? []).join(", ") || "(not set)"}
- What energizes them: ${profile.energizers ?? "(not set)"}
- Short-term goals: ${profile.short_term_goals ?? "(not set)"}
- Long-term goals: ${profile.long_term_goals ?? "(not set)"}
- Proudest accomplishment: ${profile.proudest_accomplishment ?? "(not set)"}
- A challenge overcome: ${profile.challenge_overcome ?? "(not set)"}

RESUME TEXT (may be truncated — preserve the candidate's voice and concrete numbers):
${profile.resume_text ? profile.resume_text.slice(0, 8000) : "(no resume uploaded)"}

JOB
- Company: ${target.company_name}
- Location: ${target.company_location || "(not specified)"}
- Company notes: ${target.company_notes || "(none)"}
- Role: ${target.job_title}
- Job description / role details:
${target.job_details || "(none)"}
- Interviewer (if known): ${target.interviewer_name || "(unknown)"}
- Today's date: ${today}

YOUR TASK — output three artifacts as a single JSON object:

1. pitch_headline (string)
   1–2 sentences. The candidate's strongest "why this candidate, why this role" pitch
   in their voice. Specific. References at least one concrete experience or strength.
   No platitudes. No "I am a passionate, results-driven…".

2. cover_letter (string, plain text — line breaks are fine, no markdown)
   A complete cover letter, 220–320 words. Address it to "Hiring Team at ${target.company_name}"
   unless an interviewer name is given (then address them by name). Open with a hook
   that's specific to this company or role — not "I am writing to apply for…".
   Use one or two concrete examples from the resume that map directly to what the JD
   asks for. Close with a warm, confident ask for the conversation. Sign off with the
   candidate's name only.

3. resume_review (object) with two fields:
   - summary: 2–3 sentences on how the candidate's resume currently positions them for
     this specific role, and the single biggest gap or sharpening opportunity.
   - edits: 4–7 specific, line-level edit suggestions. For each edit:
       - section: a short label identifying where in the resume this lives
         (e.g. "Summary", "Experience: Senior PM at Acme · 2022–2024", "Skills").
       - original: the EXACT text from the candidate's resume to replace. If the
         section doesn't exist yet, use the literal string "(new line — add this)"
         and explain in the "why" field.
       - suggested: the rewritten text. Match the resume's voice and bullet style.
         Quantify whenever the JD signals a metric (revenue, scale, time saved, etc.).
       - why: ONE sentence explaining why this edit makes the candidate a stronger fit
         for the specific JD.

Return ONLY valid JSON in this shape, no prose before or after:
{
  "pitch_headline": "…",
  "cover_letter": "…",
  "resume_review": {
    "summary": "…",
    "edits": [
      { "section": "…", "original": "…", "suggested": "…", "why": "…" }
    ]
  }
}`;
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

  const { data: targetRow, error: targetErr } = await supabase
    .from("interview_targets")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (targetErr || !targetRow) {
    return jsonResponse({ error: "Target not found" }, 404);
  }
  const target = targetRow as InterviewTarget;

  // Idempotency — if pack already exists, skip the LLM call.
  if (target.pitch_headline && target.cover_letter && target.resume_review) {
    return jsonResponse({ ok: true, alreadyGenerated: true }, 200);
  }

  const { data: profileRow, error: profileErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profileErr || !profileRow) {
    return jsonResponse({ error: "Complete your profile first" }, 400);
  }
  const profile = profileRow as Profile;
  if (!profile.resume_text) {
    return jsonResponse(
      {
        error: "Upload a resume on your profile first — we need it to tailor the pack.",
      },
      400,
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(" "));
        } catch {
          /* controller already closed */
        }
      }, 1000);

      try {
        const client = getAnthropic();
        const streamResp = client.messages.stream({
          model: CLAUDE_MODEL,
          max_tokens: 3500,
          system:
            "You are a warm, sharp career coach who writes specific, evidence-based application materials. You reply ONLY with valid JSON — no prose outside the JSON object.",
          messages: [{ role: "user", content: buildPrompt(profile, target) }],
        });

        const final = await streamResp.finalMessage();
        const text = final.content
          .filter((b) => b.type === "text")
          .map((b) => (b as { text: string }).text)
          .join("\n");
        const llm = extractJson<PackResponse>(text);

        const pitch = (llm.pitch_headline ?? "").trim();
        const cover = (llm.cover_letter ?? "").trim();
        const review: ResumeReview = {
          summary: llm.resume_review?.summary?.trim() ?? "",
          edits: Array.isArray(llm.resume_review?.edits) ? llm.resume_review.edits : [],
        };

        if (!pitch || !cover || !review.summary) {
          throw new Error("Generated pack was incomplete");
        }

        const { error: updateErr } = await supabase
          .from("interview_targets")
          .update({
            pitch_headline: pitch,
            cover_letter: cover,
            resume_review: review,
          })
          .eq("id", id);
        if (updateErr) throw new Error(updateErr.message);

        controller.enqueue(
          encoder.encode("\n" + JSON.stringify({ ok: true }) + "\n"),
        );
      } catch (err) {
        console.error("Application pack generation failed", err);
        controller.enqueue(
          encoder.encode(
            "\n" +
              JSON.stringify({
                ok: false,
                error: "Generation failed",
                detail: String(err),
              }) +
              "\n",
          ),
        );
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
