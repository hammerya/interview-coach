import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { intakeSurveySchema } from "@/lib/schemas";

export const runtime = "nodejs";

function splitList(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function extractResumeText(file: File): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(bytes) });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }
  // text/plain or anything else we try as UTF-8
  return bytes.toString("utf8");
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const rawSurvey: Record<string, string> = {};
  for (const [k, v] of form.entries()) {
    if (typeof v === "string") rawSurvey[k] = v;
  }

  const parsed = intakeSurveySchema.safeParse(rawSurvey);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  let resumeText: string | null = null;
  let resumeFilename: string | null = null;
  const resume = form.get("resume");
  if (resume instanceof File && resume.size > 0) {
    try {
      resumeText = (await extractResumeText(resume)).slice(0, 40000);
      resumeFilename = resume.name;
    } catch (err) {
      return NextResponse.json(
        { error: "Could not read that resume — try PDF or plain text.", detail: String(err) },
        { status: 400 },
      );
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: data.full_name,
      pronouns: data.pronouns || null,
      current_role_title: data.current_role_title,
      years_experience: data.years_experience,
      strengths: splitList(data.strengths),
      growth_areas: splitList(data.growth_areas),
      energizers: data.energizers,
      drainers: data.drainers || null,
      short_term_goals: data.short_term_goals,
      long_term_goals: data.long_term_goals,
      work_environment: data.work_environment,
      proudest_accomplishment: data.proudest_accomplishment,
      challenge_overcome: data.challenge_overcome,
      skills_to_probe: data.skills_to_probe || null,
      background_gaps: data.background_gaps || null,
      feedback_style: data.feedback_style,
      ...(resumeText !== null
        ? { resume_text: resumeText, resume_filename: resumeFilename }
        : {}),
      intake_completed: true,
    })
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
