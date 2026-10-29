import { createClient } from "@/lib/supabase/server";
import { getAnthropic, CLAUDE_MODEL, extractJson } from "@/lib/anthropic";
import type { GeneratedQuestion, InterviewTarget, Profile } from "@/lib/types";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
// Vercel Hobby caps serverless functions at 60s. Stay well under.
export const maxDuration = 60;

interface LLMResponse {
  research_notes: string;
  questions: Array<Omit<GeneratedQuestion, "id">>;
}

function buildPrompt(profile: Profile, target: InterviewTarget) {
  return `You are building a tailored interview question list for a candidate.

CANDIDATE PROFILE
- Name: ${profile.full_name ?? "(not set)"}
- Current/recent role: ${profile.current_role_title ?? "(not set)"}
- Years of experience: ${profile.years_experience ?? "(not set)"}
- Strengths: ${(profile.strengths ?? []).join(", ") || "(not set)"}
- Growth areas: ${(profile.growth_areas ?? []).join(", ") || "(not set)"}
- What energizes them: ${profile.energizers ?? "(not set)"}
- What drains them: ${profile.drainers ?? "(not set)"}
- Short-term goals: ${profile.short_term_goals ?? "(not set)"}
- Long-term goals: ${profile.long_term_goals ?? "(not set)"}
- Preferred environment: ${profile.work_environment ?? "(not set)"}
- Proudest accomplishment: ${profile.proudest_accomplishment ?? "(not set)"}
- A challenge overcome: ${profile.challenge_overcome ?? "(not set)"}
- Skills they want probed: ${profile.skills_to_probe ?? "(not set)"}
- Background gaps to address: ${profile.background_gaps ?? "(not set)"}
- How they like feedback: ${profile.feedback_style ?? "(not set)"}

RESUME TEXT (may be truncated):
${profile.resume_text ? profile.resume_text.slice(0, 6000) : "(no resume uploaded)"}

INTERVIEW TARGET
- Company: ${target.company_name}
- Location: ${target.company_location || "(not specified)"}
- Company notes: ${target.company_notes || "(none)"}
- Role: ${target.job_title}
- Role details: ${target.job_details || "(none)"}
- Interviewer: ${target.interviewer_name || "(unknown)"}
- Interviewer details: ${target.interviewer_details || "(none)"}

YOUR TASK
1. Write 3 concise sentences of research notes synthesizing what a well-prepared candidate would want to know about this company and role. Base this on widely known public information; where specific facts aren't available, tell the candidate to verify.
2. Generate exactly 12 interview questions the candidate is likely to be asked. Mix categories: behavioral, technical, situational, culture-fit, role-specific, and closing questions (candidate asks interviewer). Tailor heavily to the candidate's profile, strengths, gaps, and the specific role.
3. For each question include:
   - question: the exact question
   - category: one of behavioral | technical | situational | culture-fit | role-specific | closing
   - reasoning: ONE sentence on why an interviewer would ask this
   - answerFormat: one short line on recommended structure (e.g. "STAR, 90 seconds")
   - sampleAnswer: TWO sentences max, in the candidate's voice, grounded in their profile

Return ONLY valid JSON in this shape, no prose before or after:
{
  "research_notes": "…",
  "questions": [
    { "question": "…", "category": "…", "reasoning": "…", "answerFormat": "…", "sampleAnswer": "…" }
  ]
}`;
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

  // Load the target and make sure it belongs to the current user
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

  // Idempotency — if questions already exist, report success immediately
  if (target.questions && target.questions.length > 0) {
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

  // Stream the response so Vercel's edge gateway sees bytes flowing and doesn't
  // fire its 60s idle timeout. We emit a tiny keep-alive padding every second
  // while Claude is generating; the final line is the JSON payload the client
  // actually uses.
  const encoder = new TextEncoder();
  // Self-timeout well under Vercel's 60s hard cap so we have 10-15s to
  // write an error JSON before the Lambda is forcibly terminated. Without
  // this, a slow Anthropic or Supabase call makes the client see
  // "Generation finished with no response" with no diagnostic info.
  const GEN_TIMEOUT_MS = 45_000;

  const stream = new ReadableStream({
    async start(controller) {
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(" "));
        } catch {
          /* controller already closed */
        }
      }, 1000);

      // Guarded enqueue so the final-line write can never silently throw
      // and strand the client with heartbeats only.
      const safeEmit = (payload: unknown) => {
        try {
          controller.enqueue(
            encoder.encode("\n" + JSON.stringify(payload) + "\n"),
          );
        } catch (e) {
          console.error("Failed to enqueue final response", e);
        }
      };

      try {
        const client = getAnthropic();

        const anthropicCall = (async () => {
          const streamResp = client.messages.stream({
            model: CLAUDE_MODEL,
            max_tokens: 4500,
            system:
              "You are a warm, encouraging interview coach who writes thoughtful, personalized interview question lists. You reply ONLY with valid JSON — no prose outside the JSON object.",
            messages: [
              { role: "user", content: buildPrompt(profile, target) },
            ],
          });
          return await streamResp.finalMessage();
        })();

        const timeout = new Promise<never>((_, reject) => {
          setTimeout(
            () =>
              reject(
                new Error(
                  `Model call exceeded ${GEN_TIMEOUT_MS / 1000}s — try again`,
                ),
              ),
            GEN_TIMEOUT_MS,
          );
        });

        const final = await Promise.race([anthropicCall, timeout]);

        // Safety classifiers on Sonnet 5-5 can return a refusal. Surface it
        // cleanly instead of trying to parse an empty content array as JSON.
        if (final.stop_reason === "refusal") {
          const detail =
            final.stop_details && "category" in final.stop_details
              ? (final.stop_details as { category?: string }).category
              : null;
          throw new Error(
            `Model declined to answer${detail ? ` (${detail})` : ""}`,
          );
        }

        const text = final.content
          .filter((b) => b.type === "text")
          .map((b) => (b as { text: string }).text)
          .join("\n");
        if (!text.trim()) {
          throw new Error("Model returned no text content");
        }
        const llm = extractJson<LLMResponse>(text);
        const questions: GeneratedQuestion[] = (llm.questions ?? []).map((q) => ({
          id: randomUUID(),
          category: q.category,
          question: q.question,
          reasoning: q.reasoning,
          answerFormat: q.answerFormat,
          sampleAnswer: q.sampleAnswer,
        }));
        if (questions.length === 0) {
          throw new Error("Model produced no questions");
        }

        const { error: updateErr } = await supabase
          .from("interview_targets")
          .update({
            research_notes: llm.research_notes ?? null,
            questions,
          })
          .eq("id", id);
        if (updateErr) throw new Error(updateErr.message);

        safeEmit({ ok: true, count: questions.length });
      } catch (err) {
        console.error("Question generation failed", err);
        safeEmit({
          ok: false,
          error: "Generation failed",
          detail: err instanceof Error ? err.message : String(err),
        });
      } finally {
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
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
