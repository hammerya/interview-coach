import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { getAuthedClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { daysUntil, formatDate } from "@/lib/utils";
import type { InterviewTarget, Profile } from "@/lib/types";
import { ArrowRight, Building2, Calendar, Plus } from "lucide-react";

export default async function DashboardPage() {
  const { supabase, user, configured } = await getAuthedClient();
  if (!configured) redirect("/");
  if (!user || !supabase) redirect("/sign-in");

  const [{ data: profile }, { data: targets }] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("interview_targets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const p = profile as Profile | null;
  const ts = (targets as InterviewTarget[] | null) ?? [];

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="display text-4xl font-semibold">
          Hi{p?.full_name ? `, ${p.full_name.split(" ")[0]}` : ""} 👋
        </h1>
        <p className="mt-2 text-[var(--color-muted-foreground)]">
          {p?.intake_completed
            ? "Ready when you are. Let's pick a target or jump back into prep."
            : "Start by telling us a bit about yourself — it only takes a few minutes."}
        </p>

        {!p?.intake_completed ? (
          <Card className="mt-8 border-[var(--color-primary)]/40">
            <CardHeader>
              <CardTitle>Section 1: Get to know you</CardTitle>
              <CardDescription>
                Upload your resume and answer 15 quick questions so everything else fits you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/onboarding">
                <Button size="lg">
                  Start Section 1 <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="display text-2xl font-semibold">Your interview preps</h2>
              <Link href="/targets/new">
                <Button>
                  <Plus className="h-4 w-4" /> New prep
                </Button>
              </Link>
            </div>

            {ts.length === 0 ? (
              <Alert variant="info">
                No preps yet. Click <strong>New prep</strong> to tell us where you're interviewing
                and we'll build you a question list.
              </Alert>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {ts.map((t) => {
                  const days = t.interview_date ? daysUntil(t.interview_date) : null;
                  return (
                    <Card key={t.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-xl">{t.company_name}</CardTitle>
                            <CardDescription className="text-base text-[var(--color-foreground)]">
                              {t.job_title}
                            </CardDescription>
                          </div>
                          <Building2 className="h-5 w-5 text-[var(--color-muted-foreground)]" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-3 text-sm text-[var(--color-muted-foreground)]">
                          {t.interview_date ? (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {formatDate(t.interview_date)}
                              {days !== null && days >= 0 ? (
                                <span className="ml-1 rounded-full bg-[var(--color-accent)]/30 px-2 py-0.5 text-xs text-[var(--color-foreground)]">
                                  {days === 0 ? "today" : `${days} day${days === 1 ? "" : "s"}`}
                                </span>
                              ) : null}
                            </span>
                          ) : (
                            <span>No date set</span>
                          )}
                        </div>
                        <div className="mt-4 flex gap-2">
                          <Link href={`/targets/${t.id}`} className="flex-1">
                            <Button variant="outline" className="w-full">
                              View questions
                            </Button>
                          </Link>
                          <Link href={`/targets/${t.id}/mock/new`} className="flex-1">
                            <Button className="w-full">Mock interview</Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            <div className="mt-10">
              <Link href="/onboarding" className="text-sm text-[var(--color-primary)] font-medium">
                Update your profile or resume →
              </Link>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
