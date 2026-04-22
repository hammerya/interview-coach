"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  interviewTargetSchema,
  type InterviewTargetInput,
  type InterviewTargetFormInput,
} from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

export function NewTargetForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InterviewTargetFormInput, unknown, InterviewTargetInput>({
    resolver: zodResolver(interviewTargetSchema),
  });

  async function onSubmit(values: InterviewTargetInput) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not save target");
      }
      const { id } = await res.json();
      router.push(`/targets/${id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Part 1 · The company</CardTitle>
          <CardDescription>Where you're interviewing.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="company_name">Company name</Label>
            <Input id="company_name" {...register("company_name")} />
            {errors.company_name && (
              <p className="mt-1 text-xs text-[var(--color-destructive)]">
                {errors.company_name.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="company_location" hint="(optional)">
              Location or office
            </Label>
            <Input
              id="company_location"
              placeholder="e.g. Austin, TX (hybrid)"
              {...register("company_location")}
            />
          </div>
          <div>
            <Label htmlFor="company_notes" hint="(optional)">
              Anything else about the company you want them to know
            </Label>
            <Textarea
              id="company_notes"
              placeholder="Specific team, product line, recent news you've read"
              {...register("company_notes")}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Part 2 · The role</CardTitle>
          <CardDescription>What you're interviewing for.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="job_title">Job title</Label>
            <Input id="job_title" {...register("job_title")} />
            {errors.job_title && (
              <p className="mt-1 text-xs text-[var(--color-destructive)]">
                {errors.job_title.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="job_details" hint="(optional)">
              Details — paste the JD, seniority, team, anything that'll help
            </Label>
            <Textarea id="job_details" rows={5} {...register("job_details")} />
          </div>
          <div>
            <Label htmlFor="interview_date" hint="(optional — drives your prep calendar)">
              Interview date
            </Label>
            <Input id="interview_date" type="date" {...register("interview_date")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Part 3 · The interviewer</CardTitle>
          <CardDescription>Optional — if you know who you'll be speaking with.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="interviewer_name" hint="(optional)">
              Name
            </Label>
            <Input id="interviewer_name" {...register("interviewer_name")} />
          </div>
          <div>
            <Label htmlFor="interviewer_details" hint="(optional)">
              Title, team, background, LinkedIn URL
            </Label>
            <Textarea id="interviewer_details" {...register("interviewer_details")} />
          </div>
        </CardContent>
      </Card>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-[var(--color-muted-foreground)]">
          This takes ~20 seconds while we research and draft your question list.
        </p>
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? "Researching and drafting…" : "Build my question list"}
        </Button>
      </div>
    </form>
  );
}
