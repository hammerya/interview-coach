import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { InterviewTarget, Profile, ResumeReview } from "@/lib/types";

export const runtime = "nodejs";

const bodySchema = z.object({
  editIndex: z.number().int().min(0),
});

const NEW_LINE_SENTINEL = "(new line — add this)";

/**
 * Take a single edit from target.resume_review.edits and inject it into the
 * candidate's stored resume_text. Idempotent — applying twice does nothing.
 *
 * For "(new line — add this)" originals (LLM hint that the section is missing),
 * we append the suggested text as a new section to the bottom of the resume.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { editIndex } = parsed.data;

  // Load target + profile in parallel
  const [{ data: targetRow }, { data: profileRow }] = await Promise.all([
    supabase
      .from("interview_targets")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
  ]);

  if (!targetRow) return NextResponse.json({ error: "Target not found" }, { status: 404 });
  if (!profileRow) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const target = targetRow as InterviewTarget;
  const profile = profileRow as Profile;
  const review = target.resume_review;

  if (!review || !Array.isArray(review.edits) || !review.edits[editIndex]) {
    return NextResponse.json({ error: "Edit not found" }, { status: 404 });
  }

  const edit = review.edits[editIndex];
  if (edit.applied) {
    return NextResponse.json({ ok: true, alreadyApplied: true });
  }
  if (!profile.resume_text) {
    return NextResponse.json(
      { error: "No resume on file — upload one first." },
      { status: 400 },
    );
  }

  let nextResumeText: string;
  const original = (edit.original ?? "").trim();
  const suggested = (edit.suggested ?? "").trim();

  if (!original || original === NEW_LINE_SENTINEL) {
    // No anchor in the original resume — append the suggested as a new
    // chunk under a header derived from the edit's section label.
    const heading = edit.section ? edit.section : "Tailored addition";
    nextResumeText =
      profile.resume_text.trimEnd() + `\n\n## ${heading}\n${suggested}\n`;
  } else if (profile.resume_text.includes(original)) {
    // First exact match wins. We use a literal replace (not regex) so any
    // special characters in the original are treated as plain text.
    nextResumeText = profile.resume_text.replace(original, suggested);
  } else {
    // The exact text wasn't found — fall back to appending so the user still
    // gets the benefit of the edit. They can clean up manually later.
    const heading = edit.section ? edit.section : "Tailored addition";
    nextResumeText =
      profile.resume_text.trimEnd() +
      `\n\n## ${heading} (suggested edit — original text not found)\n${suggested}\n`;
  }

  // Mark this edit as applied in the target's review JSON.
  const nextEdits = review.edits.map((e, i) =>
    i === editIndex ? { ...e, applied: true } : e,
  );
  const nextReview: ResumeReview = { ...review, edits: nextEdits };

  // Two writes — these are independent rows, so no transactional concerns.
  const [{ error: profileErr }, { error: targetErr }] = await Promise.all([
    supabase
      .from("profiles")
      .update({ resume_text: nextResumeText })
      .eq("user_id", user.id),
    supabase
      .from("interview_targets")
      .update({ resume_review: nextReview })
      .eq("id", id)
      .eq("user_id", user.id),
  ]);

  if (profileErr || targetErr) {
    return NextResponse.json(
      { error: profileErr?.message ?? targetErr?.message ?? "Save failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
