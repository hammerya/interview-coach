import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, CLAUDE_MODEL, extractJson } from "@/lib/anthropic";
import type { GeneratedQuestion, InterviewTarget, Profile } from "@/lib/types";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
// Max allowed on Vercel Hobby. Bump on Pro if you want a safety margin.
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
${profile.resume_text ? profile.resume_text.slice(0, 8000) : "(no resume uploaded)"}

INTERVIEW TARGET
- Company: ${target.company_name}
- Location: ${target.company_location || "(not specified)"}
- Company notes: ${target.company_notes || "(none)"}
- Role: ${target.job_title}
- Role details: ${target.job_details || "(none)"}
- Interviewer: ${target.interviewer_name || "(unknown)"}
- Interviewer details: ${target.interviewer_details || "(none)"}

YOUR TASK
1. Write 3–5 sentences of research notes synthesizing what a well-prepared candidate would want to know about this company and role. Base this on widely known public information; where specific facts aren't available, explicitly prompt the candidate to verify.
2. Generate 18 interview questions the candidate is likely to be asked. Mix categories: behavioral, technical, situational, culture-fit, role-specific, and closing questions (candidate asks interviewer). Tailor heavily to the candidate's profile, strengths, gaps, and the specific role.
3. For each question include:
   - question: the exact question
   - category: one of behavioral | technical | situational | culture-fit | role-specific | closing
   - reasoning: 1–2 sentences on why an interviewer would ask this
   - answerFormat: a concise recommended structure (e.g. "STAR: Situation → Task → Action → Result, 90 seconds")
   - sampleAnswer: a brief sample answer in the candidate's voice, grounded in their profile (2–4 sentences)

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
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Load the target and make sure it belongs to the current user
  const { data: targetRow, error: targetErr } = await supabase
    .from("interview_targets")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (targetErr || !targetRow) {
    return NextResponse.json({ error: "Target not found" }, { status: 404 });
  }
  const target = targetRow as InterviewTarget;

  // Idempotency — if questions already exist, just report success
  if (target.questions && target.questions.length > 0) {
    return NextResponse.json({ ok: true, alreadyGenerated: true });
  }

  const { data: profileRow, error: profileErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profileErr || !profileRow) {
    return NextResponse.json({ error: "Complete your profile first" }, { status: 400 });
  }
  const profile = profileRow as Profile;

  try {
    const client = getAnthropic();
    const completion = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 6000,
      system:
        "You are a warm, encouraging interview coach who writes thoughtful, personalized interview question lists.",
      messages: [
        {
          role: "user",
          content: buildPrompt(profile, target),
        },
      ],
    });
    const text = completion.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("\n");
    const llm = extractJson<LLMResponse>(text);
    const questions: GeneratedQuestion[] = (llm.questions ?? []).map((q) => ({
      id: randomUUID(),
      category: q.category,
      question: q.question,
      reasoning: q.reasoning,
      answerFormat: q.answerFormat,
      sampleAnswer: q.sampleAnswer,
    }));

    const { error: updateErr } = await supabase
      .from("interview_targets")
      .update({
        research_notes: llm.research_notes ?? null,
        questions,
      })
      .eq("id", id);
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, count: questions.length });
  } catch (err) {
    console.error("Question generation failed", err);
    return NextResponse.json(
      { error: "Generation failed", detail: String(err) },
      { status: 500 },
    );
  }
}
