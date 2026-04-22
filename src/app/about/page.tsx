import Link from "next/link";
import { Nav } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HeartHandshake, Sparkles, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "About · Interview Coach",
  description:
    "Why we built Interview Coach — and the belief that great prep should feel like a thoughtful friend, not a drill sergeant.",
};

export default function AboutPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <section className="text-center max-w-3xl mx-auto">
          <span className="inline-block rounded-full bg-[var(--color-accent)]/30 px-4 py-1.5 text-sm font-medium">
            About us
          </span>
          <h1 className="display mt-5 text-5xl font-semibold leading-tight">
            Interview prep shouldn't feel like a test.
          </h1>
          <p className="mt-6 text-lg text-[var(--color-muted-foreground)] leading-relaxed">
            We built Interview Coach because every other prep tool we'd tried felt cold —
            a list of questions, a ticking clock, and a scoreboard. Interviews are
            high-stakes, personal moments. The prep around them should feel personal too.
          </p>
        </section>

        <section className="mt-16 grid gap-5 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-accent)]/30">
                <HeartHandshake className="h-6 w-6" />
              </div>
              <h3 className="display mt-4 text-xl font-semibold">Warm by default</h3>
              <p className="mt-2 text-sm text-[var(--color-muted-foreground)] leading-relaxed">
                Feedback is honest but kind. We tell you what you did well before we tell
                you what to sharpen. Confidence is a muscle — we help you build it.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-accent)]/30">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="display mt-4 text-xl font-semibold">Personal, not generic</h3>
              <p className="mt-2 text-sm text-[var(--color-muted-foreground)] leading-relaxed">
                Every question list is built from your resume, your strengths, the specific
                company, role, and interviewer. No more rehearsing "tell me about yourself"
                without a mirror.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-accent)]/30">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="display mt-4 text-xl font-semibold">Private by design</h3>
              <p className="mt-2 text-sm text-[var(--color-muted-foreground)] leading-relaxed">
                Your resume, your answers, your notes — yours. We never share, sell, or
                train models on your data. Delete your account, delete your data. Full stop.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="mt-20">
          <Card>
            <CardContent className="p-8 md:p-10">
              <h2 className="display text-3xl font-semibold">Our belief</h2>
              <p className="mt-4 text-[var(--color-muted-foreground)] leading-relaxed">
                The best interviews happen when you feel like yourself — prepared, calm,
                grounded in your own story. Drill-sergeant tools can get you ready on
                paper, but they rarely get you ready on the day. A thoughtful friend asks
                the right questions, points out what's working, nudges what isn't, and
                leaves you feeling more yourself, not less.
              </p>
              <p className="mt-4 text-[var(--color-muted-foreground)] leading-relaxed">
                That's the tool we wanted. So we built it.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="mt-16 text-center">
          <h2 className="display text-3xl font-semibold">Ready to try it?</h2>
          <p className="mt-3 text-[var(--color-muted-foreground)]">
            It's free to get started. No credit card.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/sign-up">
              <Button size="lg">Start prepping — it's free</Button>
            </Link>
            <Link href="/process">
              <Button size="lg" variant="outline">
                See how it works
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
