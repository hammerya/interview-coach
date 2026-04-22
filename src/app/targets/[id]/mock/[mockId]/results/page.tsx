import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { getAuthedClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { InterviewTarget, MockInterview } from "@/lib/types";
import { ArrowLeft, CheckCircle2, Target } from "lucide-react";

export default async function MockResultsPage({
  params,
}: {
  params: Promise<{ id: string; mockId: string }>;
}) {
  const { id, mockId } = await params;
  const { supabase, user, configured } = await getAuthedClient();
  if (!configured) redirect("/");
  if (!user || !supabase) redirect("/sign-in");

  const { data: mockRow } = await supabase
    .from("mock_interviews")
    .select("*")
    .eq("id", mockId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!mockRow) notFound();
  const mock = mockRow as MockInterview;

  const { data: targetRow } = await supabase
    .from("interview_targets")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  const target = targetRow as InterviewTarget | null;

  const s = mock.score;

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <Link
          href={`/targets/${id}`}
          className="inline-flex items-center gap-1 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to {target?.company_name ?? "target"}
        </Link>

        <div className="mt-4 text-center">
          <h1 className="display text-5xl font-semibold">
            {s?.overall ?? 0}
            <span className="text-3xl text-[var(--color-muted-foreground)]">/100</span>
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-[var(--color-muted-foreground)] leading-relaxed">
            {s?.summary ?? "You finished your mock — beautiful. Here's a quick read of how it went."}
          </p>
          <div className="mt-5 flex items-center justify-center gap-2">
            <Link href={`/targets/${id}/mock/new`}>
              <Button>Try another mock</Button>
            </Link>
            <Link href={`/targets/${id}`}>
              <Button variant="outline">Back to question list</Button>
            </Link>
          </div>
        </div>

        {s ? (
          <Card className="mt-10">
            <CardHeader>
              <CardTitle>Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {[
                { label: "Clarity", value: s.clarity },
                { label: "Structure", value: s.structure },
                { label: "Relevance", value: s.relevance },
                { label: "Confidence", value: s.confidence },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{row.label}</span>
                    <span className="text-[var(--color-muted-foreground)]">{row.value}/100</span>
                  </div>
                  <Progress value={row.value} className="mt-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {s ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-[var(--color-success)]" />
                  What went well
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {s.wentWell.map((x, i) => (
                    <li key={i} className="leading-relaxed">
                      · {x}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Target className="h-5 w-5 text-[var(--color-primary)]" />
                  Focus next time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {s.focusNext.map((x, i) => (
                    <li key={i} className="leading-relaxed">
                      · {x}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        ) : null}

        <section className="mt-10">
          <h2 className="display text-2xl font-semibold">Your answers, reviewed</h2>
          <div className="mt-4 space-y-4">
            {mock.answers.map((a, i) => (
              <Card key={a.questionId}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {i + 1}. {a.question}
                    </CardTitle>
                    <span className="rounded-full bg-[var(--color-accent)]/30 px-3 py-1 text-sm font-medium">
                      {a.score}/100
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl bg-[var(--color-muted)] p-3 text-sm italic">
                    {a.transcript || "(no answer recorded)"}
                  </div>
                  {a.strengths.length > 0 ? (
                    <div>
                      <div className="text-sm font-semibold text-[var(--color-success)]">
                        Strengths
                      </div>
                      <ul className="mt-1 space-y-1 text-sm">
                        {a.strengths.map((x, j) => (
                          <li key={j}>· {x}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {a.improvements.length > 0 ? (
                    <div>
                      <div className="text-sm font-semibold text-[var(--color-primary)]">
                        Ways to sharpen
                      </div>
                      <ul className="mt-1 space-y-1 text-sm">
                        {a.improvements.map((x, j) => (
                          <li key={j}>· {x}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
