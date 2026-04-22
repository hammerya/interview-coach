import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { interviewTargetSchema } from "@/lib/schemas";
import { getAnthropic, CLAUDE_MODEL, extractJson } from "@/lib/anthropic";
import type { GeneratedQuestion, Profile } from "@/lib/types";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const maxDuration = 60;

interface LLMResponse {
  research_notes: string;
  questions: Array<Omit<GeneratedQuestion, "id">>;
}

function buildPrompt(profile: Profile, target: Record<string, string>) {
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

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = interviewTargetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  const { data: profileRow, error: profileErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profileErr || !profileRow) {
    return NextResponse.json({ error: "Complete your profile first" }, { status: 400 });
  }
  const profile = profileRow as Profile;
  if (!profile.intake_completed) {
    return NextResponse.json({ error: "Complete Section 1 first" }, { status: 400 });
  }

  // Insert empty target first so we have an id and user sees it quickly
  const { data: inserted, error: insertErr } = await supabase
    .from("interview_targets")
    .insert({
      user_id: user.id,
      company_name: data.company_name,
      company_location: data.company_location || null,
      company_notes: data.company_notes || null,
      job_title: data.job_title,
      job_details: data.job_details || null,
      interviewer_name: data.interviewer_name || null,
      interviewer_details: data.interviewer_details || null,
      interview_date: data.interview_date || null,
    })
    .select("id")
    .single();
  if (insertErr || !inserted) {
    return NextResponse.json({ error: insertErr?.message ?? "Could not save" }, { status: 500 });
  }

  // Generate questions with Claude
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
          content: buildPrompt(profile, data as unknown as Record<string, string>),
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

    await supabase
      .from("interview_targets")
      .update({
        research_notes: llm.research_notes ?? null,
        questions,
      })
      .eq("id", inserted.id);
  } catch (err) {
    // Don't fail the whole request — the target exists, the user can retry generation
    console.error("Question generation failed", err);
  }

  return NextResponse.json({ id: inserted.id });
}
