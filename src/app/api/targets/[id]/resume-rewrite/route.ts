import { createClient } from "@/lib/supabase/server";
import { getAnthropic, CLAUDE_MODEL } from "@/lib/anthropic";
import type { InterviewTarget, Profile } from "@/lib/types";

export const runtime = "nodejs";
// Vercel Hobby caps at 60s. The rewrite is the heaviest call we make,
// so streaming + heartbeat is critical.
export const maxDuration = 60;

function buildPrompt(profile: Profile, target: InterviewTarget) {
  return `You are tailoring a candidate's resume to a specific job description.
Preserve their actual experience, dates, and accomplishments — do not invent
work history. Only re-frame, re-order, sharpen language, and emphasize what
maps to the JD.

CANDIDATE PROFILE
- Name: ${profile.full_name ?? "(not set)"}
- Current/recent role: ${profile.current_role_title ?? "(not set)"}
- Years of experience: ${profile.years_experience ?? "(not set)"}
- Strengths: ${(profile.strengths ?? []).join(", ") || "(not set)"}

ORIGINAL RESUME (may be truncated — preserve concrete numbers, dates, employer names):
${profile.resume_text ? profile.resume_text.slice(0, 9000) : "(no resume uploaded)"}

JOB
- Company: ${target.company_name}
- Role: ${target.job_title}
- Job description / role details:
${target.job_details || "(none)"}

YOUR TASK
Produce a complete, ready-to-send tailored resume in clean Markdown. Use this structure:

# {Candidate Name}
{One-line contact placeholder — leave as the candidate's existing contact line if present in the original, otherwise leave a single placeholder line.}

## Summary
A 2–3 sentence summary tailored specifically to this role. Lead with the strongest signal for the JD.

## Experience
For each role from the original resume, in reverse chronological order:

### {Job Title} · {Company} · {Dates}
- 3–5 bullets, each starting with a strong verb. Quantify whenever the original
  resume gives you a number. Re-prioritize bullets so the most JD-relevant ones
  come first. Keep facts honest — no invented metrics.

## Skills
A flat comma-separated list, weighted toward the JD. Only include skills that
are actually evidenced by the original resume.

## Education
Same structure as the original; do not invent credentials.

Output ONLY the Markdown. No explanatory text before or after. No code fences.`;
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

  // Idempotency
  if (target.tailored_resume) {
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
      { error: "Upload a resume on your profile first — we need it to tailor." },
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
          max_tokens: 4500,
          system:
            "You are a sharp resume writer. You output ONLY clean Markdown — no preamble, no commentary, no code fences.",
          messages: [{ role: "user", content: buildPrompt(profile, target) }],
        });

        const final = await streamResp.finalMessage();
        const markdown = final.content
          .filter((b) => b.type === "text")
          .map((b) => (b as { text: string }).text)
          .join("\n")
          .trim();

        if (!markdown) throw new Error("Generated rewrite was empty");

        const { error: updateErr } = await supabase
          .from("interview_targets")
          .update({ tailored_resume: markdown })
          .eq("id", id);
        if (updateErr) throw new Error(updateErr.message);

        controller.enqueue(
          encoder.encode("\n" + JSON.stringify({ ok: true }) + "\n"),
        );
      } catch (err) {
        console.error("Resume rewrite failed", err);
        controller.enqueue(
          encoder.encode(
            "\n" +
              JSON.stringify({
                ok: false,
                error: "Rewrite failed",
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
