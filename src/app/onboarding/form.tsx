"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { intakeSurveySchema, type IntakeSurvey, type IntakeSurveyInput } from "@/lib/schemas";
import type { Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { DictationButton } from "@/components/ui/dictation";
import { Upload, FileText } from "lucide-react";

function defaultsFromProfile(profile: Profile | null): Partial<IntakeSurveyInput> {
  if (!profile) return {};
  return {
    full_name: profile.full_name ?? "",
    pronouns: profile.pronouns ?? "",
    current_role_title: profile.current_role_title ?? "",
    years_experience: profile.years_experience ?? undefined,
    strengths: (profile.strengths ?? []).join(", "),
    growth_areas: (profile.growth_areas ?? []).join(", "),
    energizers: profile.energizers ?? "",
    drainers: profile.drainers ?? "",
    short_term_goals: profile.short_term_goals ?? "",
    long_term_goals: profile.long_term_goals ?? "",
    work_environment: profile.work_environment ?? "",
    proudest_accomplishment: profile.proudest_accomplishment ?? "",
    challenge_overcome: profile.challenge_overcome ?? "",
    skills_to_probe: profile.skills_to_probe ?? "",
    background_gaps: profile.background_gaps ?? "",
    feedback_style: profile.feedback_style ?? "",
  };
}

export function IntakeForm({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<IntakeSurveyInput, unknown, IntakeSurvey>({
    resolver: zodResolver(intakeSurveySchema),
    defaultValues: defaultsFromProfile(profile),
  });

  function dictationProps(name: keyof IntakeSurveyInput) {
    return {
      getCurrent: () => (getValues(name) as string) ?? "",
      onTranscript: (next: string) =>
        setValue(name, next as IntakeSurveyInput[typeof name], {
          shouldDirty: true,
          shouldValidate: false,
        }),
    };
  }

  async function onSubmit(values: IntakeSurvey) {
    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      for (const [k, v] of Object.entries(values)) {
        fd.append(k, v == null ? "" : String(v));
      }
      if (resumeFile) fd.append("resume", resumeFile);
      const res = await fetch("/api/profile", { method: "POST", body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Something went wrong");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Resume upload */}
      <Card>
        <CardHeader>
          <CardTitle>Your resume</CardTitle>
          <CardDescription>
            Optional but recommended. PDF or plain text. We'll extract the content, never share it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex items-center justify-between gap-4 rounded-xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/50 px-5 py-4 cursor-pointer hover:bg-[var(--color-muted)]">
            <div className="flex items-center gap-3">
              {resumeFile ? (
                <FileText className="h-5 w-5 text-[var(--color-primary)]" />
              ) : (
                <Upload className="h-5 w-5 text-[var(--color-muted-foreground)]" />
              )}
              <div>
                <div className="font-medium">
                  {resumeFile
                    ? resumeFile.name
                    : profile?.resume_filename ?? "Upload your resume"}
                </div>
                <div className="text-xs text-[var(--color-muted-foreground)]">
                  {resumeFile
                    ? `${(resumeFile.size / 1024).toFixed(0)} KB — click to replace`
                    : profile?.resume_filename
                      ? "Already uploaded — pick a new file to replace"
                      : "PDF or .txt, up to 10 MB"}
                </div>
              </div>
            </div>
            <span className="text-sm text-[var(--color-primary)] font-medium">
              {resumeFile ? "Change" : "Choose file"}
            </span>
            <input
              type="file"
              className="sr-only"
              accept=".pdf,.txt,application/pdf,text/plain"
              onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </CardContent>
      </Card>

      {/* 15-question survey */}
      <Card>
        <CardHeader>
          <CardTitle>About you</CardTitle>
          <CardDescription>The basics — takes just a minute.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="full_name">1. Your name</Label>
              <Input id="full_name" {...register("full_name")} />
              {errors.full_name && (
                <p className="mt-1 text-xs text-[var(--color-destructive)]">
                  {errors.full_name.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="pronouns" hint="(optional)">
                2. Pronouns
              </Label>
              <Input id="pronouns" placeholder="e.g. she/her, they/them" {...register("pronouns")} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="current_role_title">3. Current (or most recent) role</Label>
              <Input id="current_role_title" {...register("current_role_title")} />
              {errors.current_role_title && (
                <p className="mt-1 text-xs text-[var(--color-destructive)]">
                  {errors.current_role_title.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="years_experience">4. Years of professional experience</Label>
              <Input
                id="years_experience"
                type="number"
                min={0}
                max={60}
                {...register("years_experience")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Strengths & edges</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label htmlFor="strengths" hint="(comma-separated · mic for dictation)">
              5. Top three strengths
            </Label>
            <div className="relative">
              <Input
                id="strengths"
                placeholder="e.g. clear communicator, calm under pressure, systems thinker"
                className="pr-12"
                {...register("strengths")}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <DictationButton {...dictationProps("strengths")} />
              </div>
            </div>
            {errors.strengths && (
              <p className="mt-1 text-xs text-[var(--color-destructive)]">
                {errors.strengths.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="growth_areas" hint="(comma-separated · mic for dictation)">
              6. Areas you're actively growing in
            </Label>
            <div className="relative">
              <Input
                id="growth_areas"
                placeholder="e.g. public speaking, delegation"
                className="pr-12"
                {...register("growth_areas")}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <DictationButton {...dictationProps("growth_areas")} />
              </div>
            </div>
            {errors.growth_areas && (
              <p className="mt-1 text-xs text-[var(--color-destructive)]">
                {errors.growth_areas.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="energizers" hint="(mic for dictation)">
              7. What energizes you at work?
            </Label>
            <div className="relative">
              <Textarea
                id="energizers"
                placeholder="The kinds of problems, people, or environments that light you up"
                className="pr-12"
                {...register("energizers")}
              />
              <div className="absolute right-2 bottom-2">
                <DictationButton {...dictationProps("energizers")} />
              </div>
            </div>
          </div>
          <div>
            <Label htmlFor="drainers" hint="(optional · mic for dictation)">
              8. What drains you — or what you'd like to avoid?
            </Label>
            <div className="relative">
              <Textarea id="drainers" className="pr-12" {...register("drainers")} />
              <div className="absolute right-2 bottom-2">
                <DictationButton {...dictationProps("drainers")} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Where you're going</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label htmlFor="short_term_goals" hint="(mic for dictation)">
              9. Short-term goals (next 1–2 years)
            </Label>
            <div className="relative">
              <Textarea id="short_term_goals" className="pr-12" {...register("short_term_goals")} />
              <div className="absolute right-2 bottom-2">
                <DictationButton {...dictationProps("short_term_goals")} />
              </div>
            </div>
          </div>
          <div>
            <Label htmlFor="long_term_goals" hint="(mic for dictation)">
              10. Long-term goals (5+ years)
            </Label>
            <div className="relative">
              <Textarea id="long_term_goals" className="pr-12" {...register("long_term_goals")} />
              <div className="absolute right-2 bottom-2">
                <DictationButton {...dictationProps("long_term_goals")} />
              </div>
            </div>
          </div>
          <div>
            <Label htmlFor="work_environment" hint="(mic for dictation)">
              11. Your ideal work environment
            </Label>
            <div className="relative">
              <Textarea
                id="work_environment"
                placeholder="Remote/hybrid/in-office, team size, pace, management style"
                className="pr-12"
                {...register("work_environment")}
              />
              <div className="absolute right-2 bottom-2">
                <DictationButton {...dictationProps("work_environment")} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your stories</CardTitle>
          <CardDescription>
            Great answers often come back to a few great stories. Give us some to work with.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label htmlFor="proudest_accomplishment" hint="(mic for dictation)">
              12. Your proudest professional accomplishment
            </Label>
            <div className="relative">
              <Textarea
                id="proudest_accomplishment"
                className="pr-12"
                {...register("proudest_accomplishment")}
              />
              <div className="absolute right-2 bottom-2">
                <DictationButton {...dictationProps("proudest_accomplishment")} />
              </div>
            </div>
          </div>
          <div>
            <Label htmlFor="challenge_overcome" hint="(mic for dictation)">
              13. A meaningful challenge you've overcome
            </Label>
            <div className="relative">
              <Textarea
                id="challenge_overcome"
                className="pr-12"
                {...register("challenge_overcome")}
              />
              <div className="absolute right-2 bottom-2">
                <DictationButton {...dictationProps("challenge_overcome")} />
              </div>
            </div>
          </div>
          <div>
            <Label htmlFor="skills_to_probe" hint="(optional · mic for dictation)">
              14. Skills or topics you want the interviewer to probe
            </Label>
            <div className="relative">
              <Input id="skills_to_probe" className="pr-12" {...register("skills_to_probe")} />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <DictationButton {...dictationProps("skills_to_probe")} />
              </div>
            </div>
          </div>
          <div>
            <Label htmlFor="background_gaps" hint="(optional · mic for dictation)">
              15. Gaps or transitions you'd like help explaining
            </Label>
            <div className="relative">
              <Textarea
                id="background_gaps"
                placeholder="Career breaks, pivots, unusual paths — we'll help you frame them well."
                className="pr-12"
                {...register("background_gaps")}
              />
              <div className="absolute right-2 bottom-2">
                <DictationButton {...dictationProps("background_gaps")} />
              </div>
            </div>
          </div>
          <div>
            <Label htmlFor="feedback_style" hint="(mic for dictation)">
              How do you like feedback delivered?
            </Label>
            <div className="relative">
              <Input
                id="feedback_style"
                placeholder="e.g. direct but kind, lots of examples, focus on the positives first"
                className="pr-12"
                {...register("feedback_style")}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <DictationButton {...dictationProps("feedback_style")} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Your data is private and only used to personalize your prep.
        </p>
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? "Saving…" : "Save and continue"}
        </Button>
      </div>
    </form>
  );
}
