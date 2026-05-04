import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, CLAUDE_MODEL, extractJson } from "@/lib/anthropic";
import type { MockInterview, MockScore, Profile, InterviewTarget } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({ mockId: z.string().uuid() });

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { data: mockRow } = await supabase
    .from("mock_interviews")
    .select("*")
    .eq("id", parsed.data.mockId)
    .eq("user_id", user.id)
    .maybeSingle();
  const mock = mockRow as MockInterview | null;
  if (!mock) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [{ data: targetRow }, { data: profileRow }] = await Promise.all([
    supabase.from("interview_targets").select("*").eq("id", mock.target_id).maybeSingle(),
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
  ]);
  const target = targetRow as InterviewTarget | null;
  const profile = profileRow as Profile | null;

  const avg =
    mock.answers.length === 0
      ? 0
      : Math.round(
          mock.answers.reduce((sum, a) => sum + (a.score ?? 0), 0) / mock.answers.length,
        );

  let overallFeedback: MockScore = {
    overall: avg,
    clarity: avg,
    structure: avg,
    relevance: avg,
    confidence: avg,
    summary: "Nice work showing up to practice. Here's what stood out.",
    wentWell: mock.answers.flatMap((a) => a.strengths).slice(0, 5),
    focusNext: mock.answers.flatMap((a) => a.improvements).slice(0, 5),
  };

  try {
    const client = getAnthropic();
    const completion = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1200,
      system:
        "You are a warm but honest interview coach writing a final practice-interview report. Return JSON only.",
      messages: [
        {
          role: "user",
          content: `Write a final report for this practice interview.

ROLE: ${target?.job_title} at ${target?.company_name}
CANDIDATE FEEDBACK PREFERENCE: ${profile?.feedback_style ?? "direct but kind"}

PER-ANSWER RESULTS (question → score → strengths → improvements):
${mock.answers
  .map(
    (a, i) =>
      `${i + 1}. ${a.question}\n   Score: ${a.score}\n   Strengths: ${a.strengths.join("; ")}\n   Improvements: ${a.improvements.join("; ")}\n   Transcript: ${a.transcript}`,
  )
  .join("\n\n")}

Return ONLY JSON:
{
  "overall": <0-100 int>,
  "clarity": <0-100 int>,
  "structure": <0-100 int>,
  "relevance": <0-100 int>,
  "confidence": <0-100 int>,
  "summary": "3–5 sentence warm, honest recap",
  "wentWell": ["3–5 specific highlights"],
  "focusNext": ["3–5 specific, actionable focus areas"]
}`,
        },
      ],
    });
    const text = completion.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("\n");
    overallFeedback = extractJson<MockScore>(text);
  } catch (err) {
    console.error("Final scoring failed; using average fallback", err);
  }

  const { error } = await supabase
    .from("mock_interviews")
    .update({
      score: overallFeedback,
      completed: true,
      completed_at: new Date().toISOString(),
    })
    .eq("id", mock.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
