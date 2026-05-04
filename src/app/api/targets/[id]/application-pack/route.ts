import { createClient } from "@/lib/supabase/server";
import { getAnthropic, CLAUDE_MODEL, extractJson } from "@/lib/anthropic";
import type { InterviewTarget, Profile, ResumeReview } from "@/lib/types";

export const runtime = "nodejs";
// Vercel Hobby caps at 60s. Stay well under.
export const maxDuration = 60;

type Which = "pitch" | "cover" | "review" | "all";

interface PackResponse {
  pitch_headline?: string;
  cover_letter?: string;
  resume_review?: ResumeReview;
}

function profileBlock(profile: Profile) {
  return `CANDIDATE PROFILE
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
${profile.resume_text ? profile.resume_text.slice(0, 8000) : "(no resume uploaded)"}`;
}

function jobBlock(target: InterviewTarget) {
  const today = new Date().toISOString().slice(0, 10);
  return `JOB
- Company: ${target.company_name}
- Location: ${target.company_location || "(not specified)"}
- Company notes: ${target.company_notes || "(none)"}
- Role: ${target.job_title}
- Job description / role details:
${target.job_details || "(none)"}
- Interviewer (if known): ${target.interviewer_name || "(unknown)"}
- Today's date: ${today}`;
}

function pitchTask(companyName: string) {
  void companyName;
  return `YOUR TASK
Output JSON containing one field, pitch_headline. 1–2 sentences in the candidate's voice
explaining why this candidate, why this role. Reference at least one concrete experience
or strength from the resume. No platitudes. No "I am a passionate, results-driven…".

Return ONLY valid JSON, no prose before or after:
{ "pitch_headline": "…" }`;
}

function coverTask(companyName: string, interviewerName: string | null) {
  const greeting = interviewerName
    ? `address the named interviewer "${interviewerName}" by first name`
    : `address "Hiring Team at ${companyName}"`;
  return `YOUR TASK
Output JSON containing one field, cover_letter (plain text, line breaks fine, no markdown).
Write a complete cover letter, 220–320 words. ${greeting}. Open with a hook specific to
this company or role — not "I am writing to apply for…". Use one or two concrete examples
from the resume that map directly to what the JD asks for. Close with a warm, confident
ask for the conversation. Sign off with the candidate's name only.

Return ONLY valid JSON, no prose before or after:
{ "cover_letter": "…" }`;
}

function reviewTask() {
  return `YOUR TASK
Output JSON containing one field, resume_review, with two sub-fields:
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
    - why: ONE sentence explaining why this edit makes the candidate a stronger fit.

Return ONLY valid JSON, no prose before or after:
{
  "resume_review": {
    "summary": "…",
    "edits": [
      { "section": "…", "original": "…", "suggested": "…", "why": "…" }
    ]
  }
}`;
}

function allTask(companyName: string, interviewerName: string | null) {
  const greeting = interviewerName
    ? `address the named interviewer "${interviewerName}" by first name`
    : `address "Hiring Team at ${companyName}"`;
  return `YOUR TASK — output three artifacts as a single JSON object:

1. pitch_headline (string): 1–2 sentences in the candidate's voice explaining why this
   candidate, why this role. Reference at least one concrete experience or strength.

2. cover_letter (string, plain text — line breaks fine, no markdown): A complete cover
   letter, 220–320 words. ${greeting}. Open with a hook specific to this company or
   role — not "I am writing to apply for…". Use one or two concrete examples from the
   resume that map directly to what the JD asks for. Close with a warm, confident ask
   for the conversation. Sign off with the candidate's name only.

3. resume_review (object) with two fields:
   - summary: 2–3 sentences on how the candidate's resume currently positions them for
     this specific role, and the single biggest gap or sharpening opportunity.
   - edits: 4–7 specific, line-level edit suggestions. For each edit:
       - section: a short label (e.g. "Summary", "Experience: Senior PM at Acme").
       - original: the EXACT text from the candidate's resume to replace. If the
         section doesn't exist yet, use "(new line — add this)" literally.
       - suggested: the rewritten text. Match the resume's voice. Quantify when the
         JD signals a metric.
       - why: ONE sentence on why this edit strengthens the fit.

Return ONLY valid JSON, no prose before or after:
{
  "pitch_headline": "…",
  "cover_letter": "…",
  "resume_review": {
    "summary": "…",
    "edits": [{ "section": "…", "original": "…", "suggested": "…", "why": "…" }]
  }
}`;
}

function buildPrompt(profile: Profile, target: InterviewTarget, which: Which): string {
  const header = `${profileBlock(profile)}\n\n${jobBlock(target)}\n\n`;
  switch (which) {
    case "pitch":
      return header + pitchTask(target.company_name);
    case "cover":
      return header + coverTask(target.company_name, target.interviewer_name);
    case "review":
      return header + reviewTask();
    case "all":
    default:
      return header + allTask(target.company_name, target.interviewer_name);
  }
}

function tokenBudgetFor(which: Which): number {
  switch (which) {
    case "pitch":
      return 400;
    case "cover":
      return 1200;
    case "review":
      return 2200;
    case "all":
    default:
      return 3500;
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";
  const whichRaw = url.searchParams.get("which") ?? "all";
  const which: Which =
    whichRaw === "pitch" || whichRaw === "cover" || whichRaw === "review"
      ? whichRaw
      : "all";

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

  // Idempotency — only short-circuit when caller didn't ask to force, AND
  // only when generating the full pack (regenerating a single artifact
  // implies the user wants a new draft).
  if (!force && which === "all") {
    if (target.pitch_headline && target.cover_letter && target.resume_review) {
      return jsonResponse({ ok: true, alreadyGenerated: true }, 200);
    }
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
          /* already closed */
        }
      }, 1000);

      try {
        const client = getAnthropic();
        const streamResp = client.messages.stream({
          model: CLAUDE_MODEL,
          max_tokens: tokenBudgetFor(which),
          system:
            "You are a warm, sharp career coach who writes specific, evidence-based application materials. You reply ONLY with valid JSON — no prose outside the JSON object.",
          messages: [{ role: "user", content: buildPrompt(profile, target, which) }],
        });

        const final = await streamResp.finalMessage();
        const text = final.content
          .filter((b) => b.type === "text")
          .map((b) => (b as { text: string }).text)
          .join("\n");
        const llm = extractJson<PackResponse>(text);

        // Build the targeted update. Only the field(s) the caller asked for
        // get written; everything else is left untouched.
        const update: Record<string, unknown> = {};

        if (which === "all" || which === "pitch") {
          const pitch = (llm.pitch_headline ?? "").trim();
          if (which === "all" && !pitch) throw new Error("Pitch was empty");
          if (pitch) update.pitch_headline = pitch;
        }
        if (which === "all" || which === "cover") {
          const cover = (llm.cover_letter ?? "").trim();
          if (which === "all" && !cover) throw new Error("Cover letter was empty");
          if (cover) update.cover_letter = cover;
        }
        if (which === "all" || which === "review") {
          const review = llm.resume_review;
          if (review && review.summary) {
            // Preserve any "applied" flags from previously-applied edits when
            // we can match by original+suggested. New edits get applied=false.
            const previousApplied = new Map<string, boolean>();
            if (target.resume_review?.edits) {
              for (const e of target.resume_review.edits) {
                if (e.applied) previousApplied.set(`${e.original}::${e.suggested}`, true);
              }
            }
            const cleanReview: ResumeReview = {
              summary: review.summary.trim(),
              edits: (Array.isArray(review.edits) ? review.edits : []).map((e) => ({
                section: e.section,
                original: e.original,
                suggested: e.suggested,
                why: e.why,
                applied: previousApplied.get(`${e.original}::${e.suggested}`) ?? false,
              })),
            };
            update.resume_review = cleanReview;
          } else if (which === "all") {
            throw new Error("Resume review was empty");
          }
        }

        if (Object.keys(update).length === 0) {
          throw new Error("Nothing to write — model returned no usable content");
        }

        const { error: updateErr } = await supabase
          .from("interview_targets")
          .update(update)
          .eq("id", id);
        if (updateErr) throw new Error(updateErr.message);

        controller.enqueue(
          encoder.encode("\n" + JSON.stringify({ ok: true, which }) + "\n"),
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
