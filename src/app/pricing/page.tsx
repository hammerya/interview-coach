import Link from "next/link";
import { Nav } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Sparkles } from "lucide-react";

export const metadata = {
  title: "Pricing · Interview Coach",
  description:
    "Simple pricing — start free, upgrade when you need more. Pro unlocks unlimited mocks. Premium adds the real-time interview copilot.",
};

interface Tier {
  name: string;
  tagline: string;
  price: string;
  priceNote?: string;
  cta: string;
  ctaHref: string;
  highlight?: boolean;
  features: string[];
  comingSoon?: string[];
}

const tiers: Tier[] = [
  {
    name: "Warm-up",
    tagline: "Get a real feel for the tool.",
    price: "$0",
    priceNote: "free forever",
    cta: "Start for free",
    ctaHref: "/sign-up",
    features: [
      "1 active interview target",
      "3 mock interviews per month",
      "Tailored question list with reasoning",
      "Per-answer scoring and feedback",
      "Resume upload and parsing",
      "Dictation for every answer",
    ],
  },
  {
    name: "Prep",
    tagline: "For when a real interview is on the calendar.",
    price: "$12",
    priceNote: "per month · cancel any time",
    cta: "Choose Prep",
    ctaHref: "/sign-up?plan=prep",
    highlight: true,
    features: [
      "Unlimited interview targets",
      "Unlimited mock interviews",
      "All three interviewer personalities",
      "Full answer history and progress tracking",
      "Sample answers on every question",
      "Priority question regeneration",
      "Email support",
    ],
  },
  {
    name: "Copilot",
    tagline: "Serious prep for high-stakes interviews.",
    price: "$29",
    priceNote: "per month · cancel any time",
    cta: "Choose Copilot",
    ctaHref: "/sign-up?plan=copilot",
    features: [
      "Everything in Prep",
      "Personalized prep calendar tied to your interview date",
      "Saved best-answer library you can recall mid-mock",
      "Tone + pacing analysis on transcripts",
      "Priority support with 24-hour response",
    ],
    comingSoon: [
      "Real-time interview copilot: listens during live Zoom interviews, surfaces answer-format reminders, and recalls your best previous answers in the moment.",
    ],
  },
];

export default function PricingPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-6xl px-6 py-16">
        <section className="text-center max-w-3xl mx-auto">
          <span className="inline-block rounded-full bg-[var(--color-accent)]/30 px-4 py-1.5 text-sm font-medium">
            Pricing
          </span>
          <h1 className="display mt-5 text-5xl font-semibold leading-tight">
            Start free. Upgrade when it matters.
          </h1>
          <p className="mt-6 text-lg text-[var(--color-muted-foreground)] leading-relaxed">
            Every tier unlocks the warm, personalized prep experience. Paid tiers add
            volume, memory, and — eventually — real-time coaching on the day of.
          </p>
        </section>

        <section className="mt-14 grid gap-6 md:grid-cols-3">
          {tiers.map((t) => (
            <TierCard key={t.name} tier={t} />
          ))}
        </section>

        <section className="mt-16 text-center text-sm text-[var(--color-muted-foreground)]">
          All plans include full privacy. Your data is never shared, sold, or used to
          train public models. Cancel any time from your account settings.
        </section>

        <section className="mt-16">
          <Card>
            <CardContent className="p-8 md:p-10">
              <h2 className="display text-2xl font-semibold">Frequently asked</h2>
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <Faq
                  q="Can I switch tiers later?"
                  a="Yes. Upgrade or downgrade any time. Changes take effect at the next billing cycle and your data stays intact."
                />
                <Faq
                  q="What happens to my mocks if I cancel?"
                  a="Your history is preserved. You drop back to Warm-up limits, but everything you've already done stays exactly where it is."
                />
                <Faq
                  q="Is the real-time Copilot available yet?"
                  a="Not yet — it's in active development. Choose Copilot now to lock in founding-member pricing and get early access the moment it ships."
                />
                <Faq
                  q="Do you offer a student or team discount?"
                  a="Yes on both. Email us once you've signed up and we'll sort it out."
                />
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  );
}

function TierCard({ tier }: { tier: Tier }) {
  return (
    <Card
      className={
        tier.highlight
          ? "border-2 border-[var(--color-primary)] shadow-lg relative"
          : "relative"
      }
    >
      {tier.highlight ? (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary)] px-3 py-1 text-xs font-semibold text-[var(--color-primary-foreground)]">
            <Sparkles className="h-3 w-3" /> Most popular
          </span>
        </div>
      ) : null}
      <CardContent className="p-6 md:p-7">
        <h3 className="display text-2xl font-semibold">{tier.name}</h3>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{tier.tagline}</p>
        <div className="mt-5 flex items-baseline gap-1">
          <span className="display text-4xl font-semibold">{tier.price}</span>
          {tier.priceNote ? (
            <span className="text-sm text-[var(--color-muted-foreground)]">
              {" "}
              / {tier.priceNote}
            </span>
          ) : null}
        </div>
        <Link href={tier.ctaHref} className="block mt-5">
          <Button className="w-full" variant={tier.highlight ? "primary" : "outline"}>
            {tier.cta}
          </Button>
        </Link>
        <ul className="mt-6 space-y-3">
          {tier.features.map((f) => (
            <li key={f} className="flex gap-2 text-sm leading-relaxed">
              <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--color-primary)]" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        {tier.comingSoon ? (
          <div className="mt-6 rounded-xl bg-[var(--color-secondary)]/10 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-secondary)]">
              Coming soon
            </div>
            {tier.comingSoon.map((c) => (
              <p key={c} className="mt-1 text-sm leading-relaxed">
                {c}
              </p>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div>
      <h4 className="font-semibold">{q}</h4>
      <p className="mt-2 text-sm text-[var(--color-muted-foreground)] leading-relaxed">
        {a}
      </p>
    </div>
  );
}
