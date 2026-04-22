"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GeneratedQuestion, MockInterview } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert } from "@/components/ui/alert";
import { DictationButton } from "@/components/ui/dictation";

const personalityIntros: Record<MockInterview["personality"], string> = {
  warm: "Hi, really glad you're here. Take your time — this is a safe space to practice.",
  analytical: "Thanks for joining. I like to go deep on specifics, so feel free to be precise.",
  challenging: "Let's get into it. I'll push back a bit — don't take it personally, it's how I learn who's ready.",
};

export function MockRunner({
  targetId,
  mock,
  questions,
  companyName,
  jobTitle,
}: {
  targetId: string;
  mock: MockInterview;
  questions: GeneratedQuestion[];
  companyName: string;
  jobTitle: string;
}) {
  const router = useRouter();
  const firstIncomplete = Math.max(
    0,
    mock.answers.findIndex((a) => !a.transcript.trim()),
  );
  const startIdx = firstIncomplete === -1 ? 0 : firstIncomplete;
  const [index, setIndex] = useState(startIdx);
  const [transcript, setTranscript] = useState(mock.answers[startIdx]?.transcript ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = questions[index];
  const total = questions.length;

  if (!current) {
    return (
      <Alert variant="error">
        We couldn't load the questions for this mock. Please start a new mock interview.
      </Alert>
    );
  }

  async function submitAnswer() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/mock/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mockId: mock.id, questionId: current.id, transcript }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not save answer");
      }
      if (index + 1 >= total) {
        // Complete the interview
        const doneRes = await fetch("/api/mock/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mockId: mock.id }),
        });
        if (!doneRes.ok) {
          const body = await doneRes.json().catch(() => ({}));
          throw new Error(body.error ?? "Could not finish interview");
        }
        router.push(`/targets/${targetId}/mock/${mock.id}/results`);
        return;
      }
      const nextIdx = index + 1;
      setIndex(nextIdx);
      setTranscript(mock.answers[nextIdx]?.transcript ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center justify-between text-sm text-[var(--color-muted-foreground)]">
          <span>
            {companyName} · {jobTitle}
          </span>
          <span>
            Question {index + 1} of {total}
          </span>
        </div>
        <Progress value={((index + (submitting ? 1 : 0)) / total) * 100} className="mt-2" />
        <p className="mt-4 italic text-[var(--color-muted-foreground)] animate-in">
          “{personalityIntros[mock.personality]}”
        </p>
      </header>

      <Card key={current.id} className="animate-in">
        <CardHeader>
          <div className="text-xs font-medium uppercase tracking-wide text-[var(--color-primary)]">
            {current.category}
          </div>
          <CardTitle className="mt-1 text-2xl">{current.question}</CardTitle>
          <CardDescription className="mt-3 bg-[var(--color-muted)] rounded-xl p-3 text-[var(--color-foreground)]">
            <strong>Format reminder:</strong> {current.answerFormat}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Textarea
              rows={10}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Speak your answer out loud — use the mic to dictate, or type/paste the gist. Rough drafts welcome."
              className="pr-12"
            />
            <div className="absolute right-2 bottom-2">
              <DictationButton
                getCurrent={() => transcript}
                onTranscript={setTranscript}
              />
            </div>
          </div>
          {error ? (
            <div className="mt-3">
              <Alert variant="error">{error}</Alert>
            </div>
          ) : null}
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-[var(--color-muted-foreground)]">
              Tip: the mic icon dictates your answer — you can edit the transcript after.
            </span>
            <Button size="lg" onClick={submitAnswer} disabled={submitting || !transcript.trim()}>
              {submitting
                ? "Thinking…"
                : index + 1 >= total
                  ? "Finish and see results"
                  : "Save and next"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
