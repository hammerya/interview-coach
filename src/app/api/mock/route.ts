import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { GeneratedQuestion, InterviewTarget } from "@/lib/types";

export const runtime = "nodejs";

const bodySchema = z.object({
  targetId: z.string().uuid(),
  mode: z.enum(["single", "five", "full"]),
  personality: z.enum(["warm", "analytical", "challenging"]),
  questionIds: z.array(z.string()).optional(),
});

function pickQuestions(all: GeneratedQuestion[], mode: "single" | "five" | "full") {
  if (mode === "full") return all;
  const count = mode === "single" ? 1 : 5;
  const shuffled = [...all].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function pickByIds(all: GeneratedQuestion[], ids: string[]): GeneratedQuestion[] {
  const byId = new Map(all.map((q) => [q.id, q]));
  const out: GeneratedQuestion[] = [];
  for (const id of ids) {
    const q = byId.get(id);
    if (q) out.push(q);
  }
  return out;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { data: targetRow } = await supabase
    .from("interview_targets")
    .select("*")
    .eq("id", parsed.data.targetId)
    .eq("user_id", user.id)
    .maybeSingle();
  const target = targetRow as InterviewTarget | null;
  if (!target) return NextResponse.json({ error: "Target not found" }, { status: 404 });

  const allQs = target.questions ?? [];
  if (allQs.length === 0) {
    return NextResponse.json(
      { error: "No questions for this target yet. Generate them first." },
      { status: 400 },
    );
  }

  const { mode, questionIds } = parsed.data;
  const expectedCount = mode === "single" ? 1 : mode === "five" ? 5 : allQs.length;

  let selected: GeneratedQuestion[];
  if (questionIds && questionIds.length > 0 && mode !== "full") {
    selected = pickByIds(allQs, questionIds);
    if (selected.length !== expectedCount) {
      return NextResponse.json(
        {
          error: `Expected ${expectedCount} question${expectedCount === 1 ? "" : "s"} but got ${selected.length} valid selection${selected.length === 1 ? "" : "s"}.`,
        },
        { status: 400 },
      );
    }
  } else {
    selected = pickQuestions(allQs, mode);
  }
  const answers = selected.map((q) => ({
    questionId: q.id,
    question: q.question,
    transcript: "",
    score: 0,
    strengths: [],
    improvements: [],
  }));

  const { data: inserted, error } = await supabase
    .from("mock_interviews")
    .insert({
      target_id: target.id,
      user_id: user.id,
      mode: parsed.data.mode,
      personality: parsed.data.personality,
      answers,
      completed: false,
    })
    .select("id")
    .single();
  if (error || !inserted) {
    return NextResponse.json({ error: error?.message ?? "Could not start" }, { status: 500 });
  }
  return NextResponse.json({ id: inserted.id });
}
