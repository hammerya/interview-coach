import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { getAuthedClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, daysUntil } from "@/lib/utils";
import type { InterviewTarget, MockInterview } from "@/lib/types";
import { QuestionList } from "./question-list";
import { GenerationTrigger } from "./generation-trigger";
import { ApplicationPack } from "./application-pack";
import { Calendar, Building2, ArrowLeft } from "lucide-react";

export default async function TargetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, configured } = await getAuthedClient();
  if (!configured) redirect("/");
  if (!user || !supabase) redirect(`/sign-in?next=/targets/${id}`);

  const { data: target } = await supabase
    .from("interview_targets")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!target) notFound();

  const [{ data: mocks }, { data: profileRow }] = await Promise.all([
    supabase
      .from("mock_interviews")
      .select("*")
      .eq("target_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("resume_text")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const t = target as InterviewTarget;
  const ms = (mocks as MockInterview[] | null) ?? [];
  const resumeText = (profileRow?.resume_text as string | null) ?? null;
  const days = t.interview_date ? daysUntil(t.interview_date) : null;

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>

        <header className="mt-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="display text-4xl font-semibold">{t.company_name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[var(--color-muted-foreground)]">
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-4 w-4" /> {t.job_title}
              </span>
              {t.company_location ? <span>· {t.company_location}</span> : null}
              {t.interview_date ? (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(t.interview_date)}
                  {days !== null && days >= 0 ? (
                    <span className="ml-1 rounded-full bg-[var(--color-accent)]/30 px-2 py-0.5 text-xs text-[var(--color-foreground)]">
                      {days === 0 ? "today" : `${days} day${days === 1 ? "" : "s"} away`}
                    </span>
                  ) : null}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/targets/${t.id}/mock/new`}>
              <Button size="lg">Start practice interview</Button>
            </Link>
          </div>
        </header>

        {t.research_notes ? (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-xl">Research notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[var(--color-foreground)] leading-relaxed whitespace-pre-wrap">
                {t.research_notes}
              </p>
            </CardContent>
          </Card>
        ) : null}

        <section className="mt-10">
          <h2 className="display text-2xl font-semibold">Application materials</h2>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Tailored resume edits, a cover letter in your voice, and a one-line pitch
            for this specific role.
          </p>
          <div className="mt-4">
            <ApplicationPack
              targetId={t.id}
              pitchHeadline={t.pitch_headline}
              coverLetter={t.cover_letter}
              resumeReview={t.resume_review}
              tailoredResume={t.tailored_resume}
              currentResume={resumeText}
            />
          </div>
        </section>

        <section className="mt-10">
          <h2 className="display text-2xl font-semibold">Your question list</h2>
          {t.questions && t.questions.length > 0 ? (
            <QuestionList questions={t.questions} />
          ) : (
            <GenerationTrigger targetId={t.id} />
          )}
        </section>

        {ms.length > 0 ? (
          <section className="mt-12">
            <h2 className="display text-2xl font-semibold">Your practice interview history</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {ms.map((m) => (
                <Card key={m.id}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-[var(--color-muted-foreground)]">
                          {formatDate(m.created_at)} · {m.mode} · {m.personality}
                        </div>
                        {m.score ? (
                          <div className="mt-1 display text-2xl font-semibold">
                            {m.score.overall}/100
                          </div>
                        ) : (
                          <div className="mt-1 text-sm italic text-[var(--color-muted-foreground)]">
                            In progress
                          </div>
                        )}
                      </div>
                      <Link
                        href={
                          m.completed
                            ? `/targets/${t.id}/mock/${m.id}/results`
                            : `/targets/${t.id}/mock/${m.id}`
                        }
                      >
                        <Button variant="outline" size="sm">
                          {m.completed ? "View" : "Resume"}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </>
  );
}
