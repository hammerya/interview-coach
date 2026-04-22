import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mockAnswerInputSchema } from "@/lib/schemas";
import { getAnthropic, CLAUDE_MODEL, extractJson } from "@/lib/anthropic";
import type { GeneratedQuestion, InterviewTarget, MockInterview, Profile } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface PerAnswerFeedback {
  score: number;
  strengths: string[];
  improvements: string[];
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = mockAnswerInputSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { mockId, questionId, transcript } = parsed.data;

  const { data: mockRow } = await supabase
    .from("mock_interviews")
    .select("*")
    .eq("id", mockId)
    .eq("user_id", user.id)
    .maybeSingle();
  const mock = mockRow as MockInterview | null;
  if (!mock) return NextResponse.json({ error: "Mock not found" }, { status: 404 });

  const [{ data: targetRow }, { data: profileRow }] = await Promise.all([
    supabase.from("interview_targets").select("*").eq("id", mock.target_id).maybeSingle(),
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
  ]);
  const target = targetRow as InterviewTarget | null;
  const profile = profileRow as Profile | null;
  if (!target || !profile) return NextResponse.json({ error: "Context missing" }, { status: 400 });

  const q: GeneratedQuestion | undefined = (target.questions ?? []).find((x) => x.id === questionId);
  if (!q) return NextResponse.json({ error: "Question not found" }, { status: 404 });

  let feedback: PerAnswerFeedback = { score: 0, strengths: [], improvements: [] };
  try {
    const client = getAnthropic();
    const completion = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 800,
      system:
        "You are a warm but honest interview coach. Score fairly and be specific. Always return JSON only.",
      messages: [
        {
          role: "user",
          content: `Evaluate the candidate's answer.

ROLE: ${target.job_title} at ${target.company_name}
CANDIDATE STRENGTHS: ${(profile.strengths ?? []).join(", ")}
CANDIDATE FEEDBACK PREFERENCE: ${profile.feedback_style ?? "direct but kind"}

QUESTION: ${q.question}
CATEGORY: ${q.category}
RECOMMENDED FORMAT: ${q.answerFormat}

CANDIDATE ANSWER:
${transcript}

Return ONLY JSON of this shape:
{
  "score": <0-100 integer>,
  "strengths": ["1–3 concrete things they did well"],
  "improvements": ["1–3 concrete, kind suggestions"]
}`,
        },
      ],
    });
    const text = completion.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("\n");
    feedback = extractJson<PerAnswerFeedback>(text);
  } catch (err) {
    console.error("Answer scoring failed", err);
  }

  const updatedAnswers = mock.answers.map((a) =>
    a.questionId === questionId
      ? {
          ...a,
          transcript,
          score: Math.round(feedback.score ?? 0),
          strengths: feedback.strengths ?? [],
          improvements: feedback.improvements ?? [],
        }
      : a,
  );

  const { error: updateErr } = await supabase
    .from("mock_interviews")
    .update({ answers: updatedAnswers })
    .eq("id", mockId);
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, feedback });
}
