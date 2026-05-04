import Link from "next/link";
import { Nav } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { supabaseConfigured } from "@/lib/supabase/server";
import { Coffee, MessageCircle, Mic, CalendarDays } from "lucide-react";

export default function Home() {
  const configured = supabaseConfigured();
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-6 py-16">
        {!configured ? (
          <Alert variant="warning" className="mb-10">
            <strong>Almost ready.</strong> Add your Supabase keys to{" "}
            <code className="rounded bg-[var(--color-muted)] px-1 py-0.5">.env.local</code>{" "}
            (<code>NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>,{" "}
            <code>SUPABASE_SERVICE_ROLE_KEY</code>) then restart the dev server. Run the SQL in
            <code className="mx-1 rounded bg-[var(--color-muted)] px-1 py-0.5">
              supabase/migrations/0001_init.sql
            </code>
            in your Supabase project's SQL editor first.
          </Alert>
        ) : null}
        <section className="text-center max-w-3xl mx-auto">
          <span className="inline-block rounded-full bg-[var(--color-accent)]/30 px-4 py-1.5 text-sm font-medium text-[var(--color-foreground)]">
            Take a deep breath. You've got this.
          </span>
          <h1 className="display mt-6 text-5xl md:text-6xl font-semibold leading-tight">
            Interview prep that feels like a{" "}
            <span className="text-[var(--color-primary)]">thoughtful friend</span>
            , not a drill sergeant.
          </h1>
          <p className="mt-6 text-lg text-[var(--color-muted-foreground)] leading-relaxed">
            Upload your resume, tell us where you're interviewing, and we'll craft a
            personalized question list with reasoning, answer formats, and optional samples.
            Run practice interviews in your preferred interviewer style. Come back to them
            as many times as you need.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/sign-up">
              <Button size="lg">Start prepping — it's free</Button>
            </Link>
            <Link href="/sign-in">
              <Button size="lg" variant="outline">
                I already have an account
              </Button>
            </Link>
          </div>
        </section>

        <section className="mt-20 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={<Coffee className="h-6 w-6" />}
            title="Get to know you"
            body="A quick resume upload and 15-question survey so every suggestion fits who you actually are."
          />
          <FeatureCard
            icon={<MessageCircle className="h-6 w-6" />}
            title="Tailored question lists"
            body="We research the company, role, and interviewer, then explain why each question might come up."
          />
          <FeatureCard
            icon={<Mic className="h-6 w-6" />}
            title="Practice interviews"
            body="Single question, five, or the full set — with a warm, analytical, or challenging interviewer."
          />
          <FeatureCard
            icon={<CalendarDays className="h-6 w-6" />}
            title="Remembers your wins"
            body="Your best answers are saved so you can recall what worked for next time."
          />
        </section>

        <section className="mt-24 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-8 md:p-12">
          <div className="grid gap-8 md:grid-cols-[1.2fr_1fr] items-center">
            <div>
              <span className="inline-block rounded-full bg-[var(--color-secondary)]/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-secondary)]">
                Dig deeper
              </span>
              <h2 className="display mt-4 text-3xl md:text-4xl font-semibold leading-tight">
                Curious how the scoring works — or which tier fits?
              </h2>
              <p className="mt-4 text-[var(--color-muted-foreground)] leading-relaxed">
                Read about our process, the four dimensions we grade every answer on, and
                the tiers — from a free warm-up plan to full resume and cover letter
                support for when the stakes are real.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link href="/process">
                  <Button size="lg" variant="outline">
                    See our process
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button size="lg" variant="outline">
                    View pricing
                  </Button>
                </Link>
                <Link href="/about">
                  <Button size="lg" variant="ghost">
                    About us
                  </Button>
                </Link>
              </div>
            </div>
            <div className="rounded-xl bg-[var(--color-muted)] p-6">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                Every practice session is scored on
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="flex justify-between"><span>Clarity</span><span className="text-[var(--color-muted-foreground)]">/100</span></li>
                <li className="flex justify-between"><span>Structure</span><span className="text-[var(--color-muted-foreground)]">/100</span></li>
                <li className="flex justify-between"><span>Relevance</span><span className="text-[var(--color-muted-foreground)]">/100</span></li>
                <li className="flex justify-between"><span>Confidence</span><span className="text-[var(--color-muted-foreground)]">/100</span></li>
                <li className="flex justify-between border-t border-[var(--color-border)] pt-2 mt-2 font-semibold">
                  <span>Overall</span><span>/100</span>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-accent)]/30 text-[var(--color-foreground)]">
          {icon}
        </div>
        <h3 className="mt-4 display text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-[var(--color-muted-foreground)] leading-relaxed">
          {body}
        </p>
      </CardContent>
    </Card>
  );
}
