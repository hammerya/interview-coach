"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Trophy, Hash, Wand2, Lock } from "lucide-react";
import { formatDate, daysUntil } from "@/lib/utils";

type Tier = "warmup" | "full" | "premium";

interface TargetCardProps {
  id: string;
  companyName: string;
  jobTitle: string;
  interviewDate: string | null;
  completedCount: number;
  averageScore: number | null;
  /**
   * Drives the "Tailor resume" button: routes to the target's application-
   * materials section on premium, or to /pricing for everyone else.
   */
  tier: Tier;
}

/**
 * Best-effort domain guess from a company name.
 * Strips common legal suffixes, non-alphanumeric chars, and assumes .com.
 * Hits for ~80% of well-known brands; otherwise the logo falls back to
 * initials via onError.
 */
function guessDomain(companyName: string): string {
  const cleaned = companyName
    .toLowerCase()
    .replace(/\b(inc|llc|corp|corporation|ltd|limited|co|company|gmbh)\b\.?/g, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 40);
  return cleaned ? `${cleaned}.com` : "";
}

function initialsOf(companyName: string): string {
  const words = companyName
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function CompanyLogo({ companyName }: { companyName: string }) {
  const [errored, setErrored] = useState(false);
  const domain = guessDomain(companyName);
  const showImage = domain && !errored;

  if (showImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`https://logo.clearbit.com/${domain}`}
        alt={`${companyName} logo`}
        width={56}
        height={56}
        className="h-14 w-14 rounded-xl object-contain bg-white p-1.5 ring-1 ring-[var(--color-border)]"
        onError={() => setErrored(true)}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-primary)]/15 to-[var(--color-secondary)]/15 ring-1 ring-[var(--color-border)]"
    >
      <span className="display text-xl font-semibold text-[var(--color-primary)]">
        {initialsOf(companyName)}
      </span>
    </div>
  );
}

export function TargetCard(props: TargetCardProps) {
  const { id, companyName, jobTitle, interviewDate, completedCount, averageScore, tier } = props;
  const hasResumeTool = tier === "premium";
  const resumeHref = hasResumeTool ? `/targets/${id}#application-materials` : "/pricing";
  const days = interviewDate ? daysUntil(interviewDate) : null;
  const dateBadge =
    days === null
      ? null
      : days < 0
        ? "past"
        : days === 0
          ? "today"
          : `${days} day${days === 1 ? "" : "s"}`;

  return (
    <Card className="overflow-hidden transition hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <CompanyLogo companyName={companyName} />
          <div className="min-w-0 flex-1">
            <h3 className="display text-lg font-semibold leading-tight truncate">
              {companyName}
            </h3>
            <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)] truncate">
              {jobTitle}
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
              <Calendar className="h-3.5 w-3.5" />
              {interviewDate ? (
                <>
                  <span>{formatDate(interviewDate)}</span>
                  {dateBadge ? (
                    <span
                      className={
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold " +
                        (days !== null && days <= 3 && days >= 0
                          ? "bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
                          : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]")
                      }
                    >
                      {dateBadge}
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="italic">No date set</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Stat
            icon={<Hash className="h-4 w-4" />}
            label="Sessions"
            value={completedCount.toString()}
          />
          <Stat
            icon={<Trophy className="h-4 w-4" />}
            label="Avg score"
            value={averageScore !== null ? `${averageScore}/100` : "—"}
            highlight={averageScore !== null && averageScore >= 80}
          />
        </div>

        <div className="mt-5 flex gap-2">
          <Link href={`/targets/${id}`} className="flex-1">
            <Button variant="outline" className="w-full">
              View questions
            </Button>
          </Link>
          <Link href={`/targets/${id}/mock/new`} className="flex-1">
            <Button className="w-full">Practice interview</Button>
          </Link>
        </div>

        <Link href={resumeHref} className="mt-2 block">
          <Button
            variant={hasResumeTool ? "secondary" : "ghost"}
            className={
              "w-full " +
              (hasResumeTool
                ? ""
                : "border border-dashed border-[var(--color-border)] text-[var(--color-muted-foreground)]")
            }
          >
            {hasResumeTool ? (
              <>
                <Wand2 className="h-4 w-4" /> Tailor resume
              </>
            ) : (
              <>
                <Lock className="h-3.5 w-3.5" /> Tailor resume — Upgrade
              </>
            )}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function Stat({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl bg-[var(--color-muted)]/40 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
        {icon}
        {label}
      </div>
      <div
        className={
          "mt-1 display text-xl font-semibold " +
          (highlight ? "text-[var(--color-success)]" : "text-[var(--color-foreground)]")
        }
      >
        {value}
      </div>
    </div>
  );
}
