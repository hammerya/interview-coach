"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

export interface RadioCardOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

export function RadioCardGroup<T extends string = string>({
  name,
  options,
  value,
  onChange,
  columns = 3,
}: {
  name: string;
  options: RadioCardOption<T>[];
  value: T | undefined;
  onChange: (v: T) => void;
  columns?: 2 | 3;
}) {
  return (
    <div
      className={cn(
        "grid gap-3",
        columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2",
      )}
    >
      {options.map((opt) => {
        const checked = value === opt.value;
        return (
          <label
            key={opt.value}
            className={cn(
              "cursor-pointer rounded-2xl border-2 p-4 transition-all select-none",
              checked
                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-sm"
                : "border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-accent)]",
            )}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={checked}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />
            <div className="flex items-start gap-3">
              {opt.icon ? <div className="mt-0.5">{opt.icon}</div> : null}
              <div>
                <div className="font-semibold text-[var(--color-foreground)]">{opt.label}</div>
                {opt.description ? (
                  <div className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                    {opt.description}
                  </div>
                ) : null}
              </div>
            </div>
          </label>
        );
      })}
    </div>
  );
}
