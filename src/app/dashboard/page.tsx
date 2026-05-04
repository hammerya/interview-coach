import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { getAuthedClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import type { InterviewTarget, MockInterview, Profile } from "@/lib/types";
import { ArrowRight, Plus, Sparkles, Crown, Zap } from "lucide-react";
import { TargetCard } from "./target-card";

// TODO: replace with real subscription lookup once Stripe is wired.
// For now everyone is on "warmup" (free).
type Tier = "warmup" | "full" | "premium";
const CURRENT_TIER: Tier = "warmup";

const TIER_META: Record<Tier, { name: string; tagline: string; icon: React.ReactNode; gradient: string }> = {
  warmup: {
    name: "Warm-up",
    tagline: "2 five-question practice interviews per month, free.",
    icon: <Sparkles className="h-5 w-5" />,
    gradient:
      "from-[var(--color-accent)]/30 via-[var(--color-secondary)]/15 to-[var(--color-primary)]/15",
  },
  full: {
    name: "Full Interview Prep",
    tagline: "Unlimited practice interviews and tailored prep on every target.",
    icon: <Zap className="h-5 w-5" />,
    gradient:
      "from-[var(--color-primary)]/25 via-[var(--color-accent)]/20 to-[var(--color-secondary)]/15",
  },
  premium: {
    name: "Resume + Cover Letter + Full Prep",
    tagline: "Top tier — full interview prep plus AI resume and cover letter help.",
    icon: <Crown className="h-5 w-5" />,
    gradient:
      "from-[var(--color-secondary)]/25 via-[var(--color-primary)]/20 to-[var(--color-accent)]/20",
  },
};

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

  // Load all completed mocks across these targets so we can render
  // session counts + average scores per card.
  const targetIds = ts.map((t) => t.id);
  const { data: mocks } =
    targetIds.length > 0
      ? await supabase
          .from("mock_interviews")
          .select("target_id, completed, score")
          .in("target_id", targetIds)
      : { data: [] as Pick<MockInterview, "target_id" | "completed" | "score">[] };

  const stats = new Map<string, { completed: number; avg: number | null }>();
  for (const t of ts) stats.set(t.id, { completed: 0, avg: null });
  if (mocks) {
    const totals = new Map<string, { count: number; sum: number }>();
    for (const m of mocks as Pick<MockInterview, "target_id" | "completed" | "score">[]) {
      if (!m.completed) continue;
      const overall = m.score?.overall;
      if (typeof overall !== "number") continue;
      const cur = totals.get(m.target_id) ?? { count: 0, sum: 0 };
      cur.count += 1;
      cur.sum += overall;
      totals.set(m.target_id, cur);
    }
    for (const [tid, agg] of totals) {
      stats.set(tid, {
        completed: agg.count,
        avg: agg.count > 0 ? Math.round(agg.sum / agg.count) : null,
      });
    }
  }

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="display text-4xl font-semibold">
              Hi{p?.full_name ? `, ${p.full_name.split(" ")[0]}` : ""} 👋
            </h1>
            <p className="mt-2 text-[var(--color-muted-foreground)]">
              {p?.intake_completed
                ? "Ready when you are. Let's pick a target or jump back into prep."
                : "Start by telling us a bit about yourself — it only takes a few minutes."}
            </p>
          </div>
        </div>

        {p?.intake_completed ? <TierCard tier={CURRENT_TIER} /> : null}

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
          <>
            <div className="mt-10 flex items-center justify-end">
              <Link href="/targets/new">
                <Button>
                  <Plus className="h-4 w-4" /> New prep
                </Button>
              </Link>
            </div>

            {ts.length === 0 ? (
              <Alert variant="info" className="mt-4">
                No preps yet. Click <strong>New prep</strong> to tell us where you're interviewing
                and we'll build you a question list.
              </Alert>
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {ts.map((t) => {
                  const s = stats.get(t.id) ?? { completed: 0, avg: null };
                  return (
                    <TargetCard
                      key={t.id}
                      id={t.id}
                      companyName={t.company_name}
                      jobTitle={t.job_title}
                      interviewDate={t.interview_date}
                      completedCount={s.completed}
                      averageScore={s.avg}
                    />
                  );
                })}
              </div>
            )}

            <div className="mt-10">
              <Link href="/onboarding" className="text-sm text-[var(--color-primary)] font-medium">
                Update your profile or resume →
              </Link>
            </div>
          </>
        )}
      </main>
    </>
  );
}

// ---------------------------------------------------------------------------

function TierCard({ tier }: { tier: Tier }) {
  const meta = TIER_META[tier];
  const isTop = tier === "premium";

  return (
    <div
      className={
        "mt-8 overflow-hidden rounded-2xl border border-[var(--color-border)] " +
        "bg-gradient-to-r " +
        meta.gradient
      }
    >
      <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/70 text-[var(--color-primary)] ring-1 ring-[var(--color-border)]">
            {meta.icon}
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
              Your plan
            </div>
            <div className="display text-xl font-semibold">{meta.name}</div>
            <div className="mt-1 text-sm text-[var(--color-foreground)]/80">{meta.tagline}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isTop ? (
            <span className="text-sm text-[var(--color-muted-foreground)]">
              You're on the top plan. Thanks for being here.
            </span>
          ) : (
            <Link href="/pricing">
              <Button>
                <Crown className="h-4 w-4" />
                {tier === "warmup" ? "Upgrade your plan" : "Compare tiers"}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
