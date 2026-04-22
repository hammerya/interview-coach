"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { RadioCardGroup } from "@/components/ui/radio-card";
import type { GeneratedQuestion, InterviewerPersonality, MockMode } from "@/lib/types";
import { Heart, BrainCircuit, Flame, Shuffle, ListChecks } from "lucide-react";

type Selection = "random" | "specific";

export function NewMockForm({
  targetId,
  questions,
}: {
  targetId: string;
  questions: GeneratedQuestion[];
}) {
  const router = useRouter();
  const totalQuestions = questions.length;
  const [mode, setMode] = useState<MockMode>("five");
  const [personality, setPersonality] = useState<InterviewerPersonality>("warm");
  const [selection, setSelection] = useState<Selection>("random");
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requiredCount = mode === "single" ? 1 : mode === "five" ? 5 : totalQuestions;
  const showPicker = mode !== "full";
  const needsMore = selection === "specific" && pickedIds.length !== requiredCount;

  const groupedByCategory = useMemo(() => {
    const byCat = new Map<string, GeneratedQuestion[]>();
    for (const q of questions) {
      const list = byCat.get(q.category) ?? [];
      list.push(q);
      byCat.set(q.category, list);
    }
    return [...byCat.entries()];
  }, [questions]);

  function togglePick(id: string) {
    setPickedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= requiredCount) {
        // For single mode, replace the selection; for five, reject.
        if (requiredCount === 1) return [id];
        return prev;
      }
      return [...prev, id];
    });
  }

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const payload: {
        targetId: string;
        mode: MockMode;
        personality: InterviewerPersonality;
        questionIds?: string[];
      } = { targetId, mode, personality };
      if (showPicker && selection === "specific") {
        payload.questionIds = pickedIds;
      }
      const res = await fetch("/api/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not start mock interview");
      }
      const { id } = await res.json();
      router.push(`/targets/${targetId}/mock/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pick a length</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioCardGroup<MockMode>
            name="mode"
            value={mode}
            onChange={(m) => {
              setMode(m);
              setPickedIds([]);
            }}
            options={[
              {
                value: "single",
                label: "One question",
                description: "Quick reps. Perfect for warming up.",
              },
              {
                value: "five",
                label: "Five questions",
                description: "A focused mini-interview.",
              },
              {
                value: "full",
                label: "Full interview",
                description: `All ${totalQuestions || "your"} questions.`,
              },
            ]}
          />
        </CardContent>
      </Card>

      {showPicker ? (
        <Card>
          <CardHeader>
            <CardTitle>Which question{requiredCount > 1 ? "s" : ""}?</CardTitle>
            <CardDescription>
              Pick your own focus or let us pull at random from your list.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <RadioCardGroup<Selection>
              name="selection"
              value={selection}
              onChange={setSelection}
              options={[
                {
                  value: "random",
                  label: "Surprise me",
                  description: "We'll pull at random — good for realism.",
                  icon: <Shuffle className="h-5 w-5 text-[var(--color-secondary)]" />,
                },
                {
                  value: "specific",
                  label: "I'll choose",
                  description:
                    requiredCount === 1
                      ? "Pick the one question you want to work on."
                      : `Pick exactly ${requiredCount} questions from the list.`,
                  icon: <ListChecks className="h-5 w-5 text-[var(--color-primary)]" />,
                },
              ]}
            />

            {selection === "specific" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--color-muted-foreground)]">
                    Selected{" "}
                    <strong className="text-[var(--color-foreground)]">
                      {pickedIds.length}
                    </strong>{" "}
                    of {requiredCount}
                  </span>
                  {pickedIds.length > 0 ? (
                    <button
                      type="button"
                      className="text-[var(--color-primary)] hover:underline"
                      onClick={() => setPickedIds([])}
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
                <div className="space-y-5">
                  {groupedByCategory.map(([cat, qs]) => (
                    <div key={cat}>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                        {cat}
                      </div>
                      <div className="space-y-2">
                        {qs.map((q) => {
                          const picked = pickedIds.includes(q.id);
                          const disabled =
                            !picked &&
                            requiredCount > 1 &&
                            pickedIds.length >= requiredCount;
                          return (
                            <label
                              key={q.id}
                              className={
                                "flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition " +
                                (picked
                                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                                  : disabled
                                    ? "border-[var(--color-border)] opacity-50 cursor-not-allowed"
                                    : "border-[var(--color-border)] hover:border-[var(--color-primary)]/60")
                              }
                            >
                              <input
                                type={requiredCount === 1 ? "radio" : "checkbox"}
                                name="question-pick"
                                className="mt-1 accent-[var(--color-primary)]"
                                checked={picked}
                                disabled={disabled}
                                onChange={() => togglePick(q.id)}
                              />
                              <span className="text-sm leading-relaxed">{q.question}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Pick an interviewer style</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioCardGroup<InterviewerPersonality>
            name="personality"
            value={personality}
            onChange={setPersonality}
            options={[
              {
                value: "warm",
                label: "Warm & encouraging",
                description: "Friendly, patient, asks gentle follow-ups.",
                icon: <Heart className="h-5 w-5 text-[var(--color-primary)]" />,
              },
              {
                value: "analytical",
                label: "Analytical & precise",
                description: "Structured, probing, wants specifics and numbers.",
                icon: <BrainCircuit className="h-5 w-5 text-[var(--color-secondary)]" />,
              },
              {
                value: "challenging",
                label: "Challenging & skeptical",
                description: "Pushes back, plays devil's advocate. Builds resilience.",
                icon: <Flame className="h-5 w-5 text-[var(--color-destructive)]" />,
              },
            ]}
          />
        </CardContent>
      </Card>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="flex items-center justify-end">
        <Button
          size="lg"
          onClick={start}
          disabled={loading || totalQuestions === 0 || needsMore}
        >
          {loading
            ? "Setting up…"
            : needsMore
              ? `Pick ${requiredCount - pickedIds.length} more`
              : "Begin interview"}
        </Button>
      </div>
    </div>
  );
}
