import Link from "next/link";
import { Nav } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  UserRound,
  Building2,
  Mic,
  Target,
  Ruler,
  MessageSquare,
  Gauge,
  Sparkles,
} from "lucide-react";

export const metadata = {
  title: "Our process · Interview Coach",
  description:
    "How Interview Coach builds your prep — resume intake, tailored question generation, mock interviews, and the scoring rubric behind the feedback.",
};

export default function ProcessPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <section className="text-center max-w-3xl mx-auto">
          <span className="inline-block rounded-full bg-[var(--color-accent)]/30 px-4 py-1.5 text-sm font-medium">
            Our process
          </span>
          <h1 className="display mt-5 text-5xl font-semibold leading-tight">
            Three steps. A whole lot of personalization.
          </h1>
          <p className="mt-6 text-lg text-[var(--color-muted-foreground)] leading-relaxed">
            We don't believe in generic interview prep. Every question, every bit of
            feedback, every score — it's all built from who you are and where you're going.
          </p>
        </section>

        <section className="mt-16 space-y-6">
          <StepCard
            step="1"
            icon={<UserRound className="h-6 w-6" />}
            title="Get to know you"
            body="Upload your resume and answer a fifteen-question intake. We learn your strengths, your growth edges, your goals, and the stories you most want to tell. You can type or dictate — whichever feels easier."
            bullets={[
              "Resume parsed automatically (PDF or plain text)",
              "Fifteen questions, takes a few minutes",
              "Dictation built in for longer reflections",
            ]}
          />
          <StepCard
            step="2"
            icon={<Building2 className="h-6 w-6" />}
            title="Tell us where you're interviewing"
            body="Drop in the company, the role, and (if you know them) the interviewer. We research the public-facing signals — values, recent news, role expectations — then craft a tailored question list you can expect to field."
            bullets={[
              "Eighteen tailored questions spanning behavioral, technical, and culture-fit",
              "Each question comes with reasoning (why they'd ask it), an answer-format reminder (STAR, PAR, etc.), and an optional sample answer",
              "Research notes you can skim before you go in",
            ]}
          />
          <StepCard
            step="3"
            icon={<Mic className="h-6 w-6" />}
            title="Practice like it's game day"
            body="Pick one question, five, or the full set. Choose a random pull or hand-pick what you want to work on. Select an interviewer style — warm, analytical, or challenging. Dictate your answer or type it. We score it, tell you what went well, and show you how to sharpen it."
            bullets={[
              "Three interviewer personalities to stretch different muscles",
              "Dictation for every answer — no pressure to type a perfect transcript",
              "Full history saved so you can track progress across attempts",
            ]}
          />
        </section>

        <section className="mt-20">
          <div className="text-center max-w-3xl mx-auto">
            <span className="inline-block rounded-full bg-[var(--color-secondary)]/15 px-4 py-1.5 text-sm font-medium text-[var(--color-secondary)]">
              Scoring system
            </span>
            <h2 className="display mt-5 text-4xl font-semibold">
              How your mock answers are graded
            </h2>
            <p className="mt-4 text-[var(--color-muted-foreground)] leading-relaxed">
              Every answer is scored on four dimensions. We combine them into an overall
              score out of 100 — but the real value is in the dimension breakdown, because
              that's where you see exactly what to work on.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <DimensionCard
              icon={<MessageSquare className="h-5 w-5" />}
              name="Clarity"
              tagline="Could an interviewer follow you the first time?"
              body="Crisp openings, clean transitions, no rambling. We look for answers that land the point without the listener having to untangle anything."
            />
            <DimensionCard
              icon={<Ruler className="h-5 w-5" />}
              name="Structure"
              tagline="Did you use a framework that carries weight?"
              body="Behavioral answers benefit from STAR (Situation, Task, Action, Result). Technical answers benefit from a stated approach. We check that your answer has a backbone."
            />
            <DimensionCard
              icon={<Target className="h-5 w-5" />}
              name="Relevance"
              tagline="Did you answer the question that was asked?"
              body="The most common interview pitfall is answering a related-but-different question. We check that your example speaks directly to what the interviewer wants to learn."
            />
            <DimensionCard
              icon={<Gauge className="h-5 w-5" />}
              name="Confidence"
              tagline="Does the answer sound grounded?"
              body="Tentative language (“I guess”, “maybe”, “kind of”), hedging, and over-apologizing all pull this down. Direct, grounded, specific language pulls it up."
            />
          </div>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[var(--color-primary)]" />
                What you get after every mock
              </CardTitle>
              <CardDescription>
                An overall score, the four-dimension breakdown, a short summary of how
                it went, a "what went well" list, and a "focus next time" list. Every
                answer also gets its own per-question score with strengths and
                improvements.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <ScoreBand
                  range="85–100"
                  label="Interview-ready"
                  body="You'd land this cleanly in a real room. Keep the reps to hold the ceiling."
                />
                <ScoreBand
                  range="65–84"
                  label="Solid, with edges"
                  body="The core is there. A couple of targeted tweaks and you're in the top band."
                />
                <ScoreBand
                  range="Below 65"
                  label="Good raw material"
                  body="Don't spiral — every strong answer started here. Use the focus list and run it again."
                />
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mt-20 text-center">
          <h2 className="display text-3xl font-semibold">Ready to run a mock?</h2>
          <p className="mt-3 text-[var(--color-muted-foreground)]">
            The first one's free. So are the next few.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/sign-up">
              <Button size="lg">Start prepping — it's free</Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline">
                See pricing
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}

function StepCard({
  step,
  icon,
  title,
  body,
  bullets,
}: {
  step: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  bullets: string[];
}) {
  return (
    <Card>
      <CardContent className="p-6 md:p-8">
        <div className="flex items-start gap-5">
          <div className="flex-shrink-0 flex flex-col items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)] display text-xl font-semibold">
              {step}
            </span>
            <span className="text-[var(--color-muted-foreground)]">{icon}</span>
          </div>
          <div className="flex-1">
            <h3 className="display text-2xl font-semibold">{title}</h3>
            <p className="mt-2 text-[var(--color-muted-foreground)] leading-relaxed">
              {body}
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              {bullets.map((b) => (
                <li key={b} className="flex gap-2 leading-relaxed">
                  <span className="text-[var(--color-primary)]">·</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DimensionCard({
  icon,
  name,
  tagline,
  body,
}: {
  icon: React.ReactNode;
  name: string;
  tagline: string;
  body: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
          {icon}
        </div>
        <h3 className="display mt-4 text-xl font-semibold">{name}</h3>
        <p className="mt-1 text-sm italic text-[var(--color-secondary)]">{tagline}</p>
        <p className="mt-2 text-sm text-[var(--color-muted-foreground)] leading-relaxed">
          {body}
        </p>
      </CardContent>
    </Card>
  );
}

function ScoreBand({
  range,
  label,
  body,
}: {
  range: string;
  label: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
        {range}
      </div>
      <div className="mt-1 display text-lg font-semibold">{label}</div>
      <p className="mt-2 text-sm text-[var(--color-muted-foreground)] leading-relaxed">
        {body}
      </p>
    </div>
  );
}
