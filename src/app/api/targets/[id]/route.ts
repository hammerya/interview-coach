import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const editSchema = z.object({
  section: z.string(),
  original: z.string(),
  suggested: z.string(),
  why: z.string(),
  applied: z.boolean().optional(),
});

const reviewSchema = z.object({
  summary: z.string(),
  edits: z.array(editSchema),
});

const patchSchema = z.object({
  pitch_headline: z.string().nullable().optional(),
  cover_letter: z.string().nullable().optional(),
  tailored_resume: z.string().nullable().optional(),
  resume_review: reviewSchema.nullable().optional(),
});

/**
 * Partial update for editable artifacts on an interview target. Used by the
 * application-pack edit-in-place UI. Only fields present in the body are
 * touched; everything else is left as-is.
 */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
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

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Only forward keys that were actually present so we don't accidentally
  // null out fields that weren't in the request.
  const update: Record<string, unknown> = {};
  if ("pitch_headline" in parsed.data) update.pitch_headline = parsed.data.pitch_headline;
  if ("cover_letter" in parsed.data) update.cover_letter = parsed.data.cover_letter;
  if ("tailored_resume" in parsed.data) update.tailored_resume = parsed.data.tailored_resume;
  if ("resume_review" in parsed.data) update.resume_review = parsed.data.resume_review;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error } = await supabase
    .from("interview_targets")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
