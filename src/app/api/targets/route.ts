import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { interviewTargetSchema } from "@/lib/schemas";

export const runtime = "nodejs";

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

  // Confirm profile is complete before accepting a target
  const { data: profileRow, error: profileErr } = await supabase
    .from("profiles")
    .select("intake_completed")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profileErr || !profileRow) {
    return NextResponse.json({ error: "Complete your profile first" }, { status: 400 });
  }
  if (!profileRow.intake_completed) {
    return NextResponse.json({ error: "Complete Section 1 first" }, { status: 400 });
  }

  // Fast insert — question generation happens from a separate endpoint
  // the target page triggers, so this request stays well under any edge timeout.
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

  return NextResponse.json({ id: inserted.id });
}
