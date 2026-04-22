"use client";
import { useState } from "react";
import type { GeneratedQuestion } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const categoryLabels: Record<string, string> = {
  behavioral: "Behavioral",
  technical: "Technical",
  situational: "Situational",
  "culture-fit": "Culture fit",
  "role-specific": "Role-specific",
  closing: "Your questions",
};

export function QuestionList({ questions }: { questions: GeneratedQuestion[] }) {
  const [open, setOpen] = useState<string | null>(questions[0]?.id ?? null);
  const [showSample, setShowSample] = useState<Record<string, boolean>>({});

  return (
    <div className="mt-4 space-y-3">
      {questions.map((q, i) => {
        const isOpen = open === q.id;
        return (
          <Card key={q.id}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : q.id)}
              className="w-full text-left p-5 flex items-start gap-3"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)]/40 text-sm font-semibold">
                {i + 1}
              </span>
              <div className="flex-1">
                <div className="text-xs font-medium uppercase tracking-wide text-[var(--color-primary)]">
                  {categoryLabels[q.category] ?? q.category}
                </div>
                <div className="mt-1 text-lg font-medium leading-snug">{q.question}</div>
              </div>
              <span className="mt-1 text-[var(--color-muted-foreground)]">
                {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
              </span>
            </button>
            <div
              className={cn(
                "grid transition-all duration-200 ease-out",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <CardContent className="pt-0 space-y-4">
                  <div>
                    <div className="text-sm font-semibold text-[var(--color-secondary)]">
                      Why they might ask this
                    </div>
                    <p className="mt-1 text-sm text-[var(--color-foreground)] leading-relaxed">
                      {q.reasoning}
                    </p>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[var(--color-secondary)]">
                      A good way to answer
                    </div>
                    <p className="mt-1 text-sm text-[var(--color-foreground)] leading-relaxed">
                      {q.answerFormat}
                    </p>
                  </div>
                  {q.sampleAnswer ? (
                    <div>
                      <button
                        type="button"
                        onClick={() =>
                          setShowSample((s) => ({ ...s, [q.id]: !s[q.id] }))
                        }
                        className="text-sm font-medium text-[var(--color-primary)]"
                      >
                        {showSample[q.id] ? "Hide sample answer" : "Show sample answer"}
                      </button>
                      {showSample[q.id] ? (
                        <p className="mt-2 rounded-xl bg-[var(--color-muted)] p-4 text-sm italic leading-relaxed">
                          {q.sampleAnswer}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </CardContent>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
