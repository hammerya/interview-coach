"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  FileText,
  Mail,
  Wand2,
  ChevronDown,
  ChevronRight,
  Quote,
  Pencil,
  RefreshCw,
  Download,
  X,
} from "lucide-react";
import type { ResumeReview, ResumeEdit } from "@/lib/types";

interface PackProps {
  targetId: string;
  pitchHeadline: string | null;
  coverLetter: string | null;
  resumeReview: ResumeReview | null;
  tailoredResume: string | null;
}

interface ApiResult {
  ok?: boolean;
  alreadyGenerated?: boolean;
  error?: string;
  detail?: string;
}

export function ApplicationPack(props: PackProps) {
  const { targetId, pitchHeadline, coverLetter, resumeReview, tailoredResume } = props;
  const hasPack = Boolean(pitchHeadline && coverLetter && resumeReview);

  if (!hasPack) {
    return <PackTrigger targetId={targetId} />;
  }

  return (
    <div className="space-y-6">
      {pitchHeadline ? (
        <PitchCard targetId={targetId} headline={pitchHeadline} />
      ) : null}
      {coverLetter ? (
        <CoverLetterCard targetId={targetId} text={coverLetter} />
      ) : null}
      {resumeReview ? (
        <ResumeReviewCard targetId={targetId} review={resumeReview} />
      ) : null}
      <RewriteSection targetId={targetId} initial={tailoredResume} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// First-run trigger: no pack yet, full pack generation
// ---------------------------------------------------------------------------

function PackTrigger({ targetId }: { targetId: string }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    try {
      await streamCall(`/api/targets/${targetId}/application-pack`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card className="border-dashed">
      <CardContent className="p-8 text-center">
        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-secondary)]/15 text-[var(--color-secondary)]">
          <Sparkles className="h-6 w-6" />
        </div>
        <h3 className="display mt-4 text-2xl font-semibold">
          Tailor your resume and cover letter
        </h3>
        <p className="mx-auto mt-2 max-w-lg text-sm text-[var(--color-muted-foreground)] leading-relaxed">
          We'll read your resume against this job description, draft a cover letter
          in your voice, suggest line-level resume edits, and (optionally) rewrite the
          full resume tailored to the role.
        </p>
        {error ? (
          <Alert variant="error" className="mx-auto mt-5 max-w-lg text-left">
            {error}
          </Alert>
        ) : null}
        <Button onClick={run} disabled={running} size="lg" className="mt-6">
          {running ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Drafting…
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" /> Generate application materials
            </>
          )}
        </Button>
        <p className="mt-3 text-xs text-[var(--color-muted-foreground)]">
          Usually takes 30–60 seconds.
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Pitch headline — edit in place + regenerate
// ---------------------------------------------------------------------------

function PitchCard({ targetId, headline }: { targetId: string; headline: string }) {
  return (
    <Card className="border-2 border-[var(--color-primary)]/40">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-[var(--color-primary)]">
              Why this candidate
            </div>
            <CardTitle className="mt-1 text-xl">Your pitch headline</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <EditableText
          targetId={targetId}
          field="pitch_headline"
          value={headline}
          which="pitch"
          minRows={2}
          renderView={(text) => (
            <p className="flex gap-2 text-lg leading-relaxed">
              <Quote className="mt-1 h-5 w-5 flex-shrink-0 text-[var(--color-primary)]" />
              <span>{text}</span>
            </p>
          )}
        />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Cover letter — edit in place + regenerate + copy
// ---------------------------------------------------------------------------

function CoverLetterCard({ targetId, text }: { targetId: string; text: string }) {
  const [open, setOpen] = useState(true);
  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full text-left p-5 flex items-center gap-3"
      >
        <Mail className="h-5 w-5 text-[var(--color-primary)]" />
        <div className="flex-1">
          <div className="font-semibold">Cover letter</div>
          <div className="text-sm text-[var(--color-muted-foreground)]">
            Drafted in your voice — edit before sending.
          </div>
        </div>
        <span className="text-[var(--color-muted-foreground)]">
          {open ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </span>
      </button>
      {open ? (
        <CardContent className="pt-0">
          <EditableText
            targetId={targetId}
            field="cover_letter"
            value={text}
            which="cover"
            minRows={12}
            renderView={(t) => (
              <div className="rounded-xl bg-[var(--color-muted)]/60 p-5">
                <pre className="whitespace-pre-wrap font-[inherit] text-sm leading-relaxed">
                  {t}
                </pre>
              </div>
            )}
          />
        </CardContent>
      ) : null}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Resume review — regenerate, apply edits, edit suggestions in place
// ---------------------------------------------------------------------------

function ResumeReviewCard({
  targetId,
  review,
}: {
  targetId: string;
  review: ResumeReview;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const appliedCount = review.edits.filter((e) => e.applied).length;

  async function regenerate() {
    if (
      !window.confirm(
        "Regenerate the resume review? Any unapplied edits will be replaced.",
      )
    ) {
      return;
    }
    setRegenerating(true);
    setError(null);
    try {
      await streamCall(
        `/api/targets/${targetId}/application-pack?which=review&force=1`,
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full text-left p-5 flex items-center gap-3"
      >
        <FileText className="h-5 w-5 text-[var(--color-primary)]" />
        <div className="flex-1">
          <div className="font-semibold">Resume review</div>
          <div className="text-sm text-[var(--color-muted-foreground)]">
            {review.edits.length} suggested {review.edits.length === 1 ? "edit" : "edits"}
            {appliedCount > 0 ? ` · ${appliedCount} applied` : ""}
          </div>
        </div>
        <span className="text-[var(--color-muted-foreground)]">
          {open ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </span>
      </button>
      {open ? (
        <CardContent className="pt-0 space-y-4">
          <div className="flex items-center justify-end">
            <RegenButton onClick={regenerate} running={regenerating} label="Regenerate review" />
          </div>
          {error ? <Alert variant="error">{error}</Alert> : null}
          {review.summary ? (
            <CardDescription className="rounded-xl bg-[var(--color-muted)]/60 p-4 text-[var(--color-foreground)]">
              {review.summary}
            </CardDescription>
          ) : null}
          {review.edits.length > 0 ? (
            <ul className="space-y-3">
              {review.edits.map((edit, i) => (
                <EditCard
                  key={`${edit.section}-${i}`}
                  edit={edit}
                  index={i}
                  targetId={targetId}
                />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              No specific edits flagged for this role.
            </p>
          )}
        </CardContent>
      ) : null}
    </Card>
  );
}

function EditCard({
  edit,
  index,
  targetId,
}: {
  edit: ResumeEdit;
  index: number;
  targetId: string;
}) {
  const router = useRouter();
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function apply() {
    setApplying(true);
    setError(null);
    try {
      const res = await fetch(`/api/targets/${targetId}/apply-edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editIndex: index }),
      });
      const body = (await res.json().catch(() => ({}))) as ApiResult;
      if (!res.ok || body.ok === false) {
        throw new Error(body.error ?? `Apply failed (${res.status})`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setApplying(false);
    }
  }

  return (
    <li
      className={
        "rounded-xl border p-4 " +
        (edit.applied
          ? "border-[var(--color-success)]/40 bg-[var(--color-success)]/5"
          : "border-[var(--color-border)]")
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-secondary)]">
          {edit.section}
        </div>
        {edit.applied ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-success)]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-success)]">
            <Check className="h-3 w-3" /> Applied
          </span>
        ) : null}
      </div>
      <div className="mt-2 grid gap-2 md:grid-cols-2">
        <div>
          <div className="text-xs font-medium text-[var(--color-muted-foreground)]">
            Original
          </div>
          <p className="mt-1 rounded-lg bg-[var(--color-muted)]/40 p-2 text-sm leading-relaxed line-through decoration-[var(--color-muted-foreground)]/50">
            {edit.original}
          </p>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-[var(--color-primary)]">Suggested</div>
            <CopyButton text={edit.suggested} small />
          </div>
          <p className="mt-1 rounded-lg bg-[var(--color-primary)]/10 p-2 text-sm leading-relaxed">
            {edit.suggested}
          </p>
        </div>
      </div>
      {edit.why ? (
        <p className="mt-3 text-xs text-[var(--color-muted-foreground)] leading-relaxed">
          <strong className="text-[var(--color-foreground)]">Why:</strong> {edit.why}
        </p>
      ) : null}
      {error ? (
        <Alert variant="error" className="mt-3">
          {error}
        </Alert>
      ) : null}
      {!edit.applied ? (
        <div className="mt-3 flex justify-end">
          <Button size="sm" variant="outline" onClick={apply} disabled={applying}>
            {applying ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Applying…
              </>
            ) : (
              <>
                <Check className="mr-2 h-3.5 w-3.5" /> Apply to my resume
              </>
            )}
          </Button>
        </div>
      ) : null}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Tailored rewrite — generate, edit in place, regenerate, copy, download PDF
// ---------------------------------------------------------------------------

function RewriteSection({
  targetId,
  initial,
}: {
  targetId: string;
  initial: string | null;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(true);
  const text = initial;

  async function generate(force: boolean) {
    if (force) {
      if (!window.confirm("Regenerate the tailored rewrite? Any inline edits will be replaced.")) {
        return;
      }
    }
    setRunning(true);
    setError(null);
    try {
      const url =
        `/api/targets/${targetId}/resume-rewrite` + (force ? "?force=1" : "");
      await streamCall(url);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setRunning(false);
    }
  }

  if (!text) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <Wand2 className="mt-1 h-5 w-5 text-[var(--color-secondary)]" />
            <div className="flex-1">
              <div className="font-semibold">Want a full tailored rewrite?</div>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)] leading-relaxed">
                Generate a complete resume rewritten end-to-end for this specific role —
                same facts, sharper framing.
              </p>
              {error ? (
                <Alert variant="error" className="mt-3">
                  {error}
                </Alert>
              ) : null}
              <Button onClick={() => generate(false)} disabled={running} className="mt-4">
                {running ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Rewriting…
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" /> Generate tailored rewrite
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full text-left p-5 flex items-center gap-3"
      >
        <Wand2 className="h-5 w-5 text-[var(--color-primary)]" />
        <div className="flex-1">
          <div className="font-semibold">Tailored resume rewrite</div>
          <div className="text-sm text-[var(--color-muted-foreground)]">
            Full resume, framed for this role.
          </div>
        </div>
        <span className="text-[var(--color-muted-foreground)]">
          {open ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </span>
      </button>
      {open ? (
        <CardContent className="pt-0">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <a
              href={`/api/targets/${targetId}/resume-pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-xs font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition"
              title="Download as PDF"
            >
              <Download className="h-3.5 w-3.5" /> Download PDF
            </a>
            <RegenButton
              onClick={() => generate(true)}
              running={running}
              label="Regenerate"
            />
          </div>
          {error ? <Alert variant="error" className="mt-3">{error}</Alert> : null}
          <div className="mt-3">
            <EditableText
              targetId={targetId}
              field="tailored_resume"
              value={text}
              minRows={20}
              renderView={(t) => (
                <div className="rounded-xl bg-[var(--color-muted)]/60 p-5 max-h-[600px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap font-[inherit] text-sm leading-relaxed">
                    {t}
                  </pre>
                </div>
              )}
            />
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Shared editable-text primitive: view / edit toggle, save via PATCH,
// optional regenerate via streaming pack endpoint
// ---------------------------------------------------------------------------

interface EditableTextProps {
  targetId: string;
  field: "pitch_headline" | "cover_letter" | "tailored_resume";
  value: string;
  /**
   * If provided, the regenerate button hits the application-pack endpoint
   * with this `which` param. Omit for tailored_resume — that has its own
   * regenerate button mounted separately so it can sit alongside Download.
   */
  which?: "pitch" | "cover";
  minRows?: number;
  renderView: (text: string) => React.ReactNode;
}

function EditableText({
  targetId,
  field,
  value,
  which,
  minRows = 4,
  renderView,
}: EditableTextProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function start() {
    setDraft(value);
    setError(null);
    setEditing(true);
  }
  function cancel() {
    setEditing(false);
    setDraft(value);
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/targets/${targetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: draft }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as ApiResult;
        throw new Error(body.error ?? `Save failed (${res.status})`);
      }
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function regenerate() {
    if (!which) return;
    if (
      !window.confirm(
        "Regenerate this draft? Any inline edits you've made will be replaced.",
      )
    ) {
      return;
    }
    setRegenerating(true);
    setError(null);
    try {
      await streamCall(
        `/api/targets/${targetId}/application-pack?which=${which}&force=1`,
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setRegenerating(false);
    }
  }

  if (editing) {
    return (
      <div className="space-y-3">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={minRows}
          className="font-mono text-sm"
        />
        {error ? <Alert variant="error">{error}</Alert> : null}
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={cancel} disabled={saving}>
            <X className="mr-1.5 h-3.5 w-3.5" /> Cancel
          </Button>
          <Button size="sm" onClick={save} disabled={saving || draft === value}>
            {saving ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Check className="mr-1.5 h-3.5 w-3.5" /> Save
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <CopyButton text={value} />
        <button
          type="button"
          onClick={start}
          className="inline-flex h-7 items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-xs font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition"
          title="Edit"
        >
          <Pencil className="h-3 w-3" /> Edit
        </button>
        {which ? (
          <RegenButton onClick={regenerate} running={regenerating} label="Regenerate" />
        ) : null}
      </div>
      {error ? <Alert variant="error">{error}</Alert> : null}
      {renderView(value)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reusable buttons
// ---------------------------------------------------------------------------

function RegenButton({
  onClick,
  running,
  label,
}: {
  onClick: () => void;
  running: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={running}
      className={
        "inline-flex h-7 items-center gap-1 rounded-full border px-3 text-xs font-medium transition " +
        (running
          ? "border-[var(--color-border)] bg-[var(--color-muted)] text-[var(--color-muted-foreground)] cursor-wait"
          : "border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]")
      }
      title={label}
    >
      {running ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" /> Regenerating…
        </>
      ) : (
        <>
          <RefreshCw className="h-3 w-3" /> {label}
        </>
      )}
    </button>
  );
}

function CopyButton({ text, small }: { text: string; small?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard not available — silently no-op */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={
        "inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] " +
        "bg-[var(--color-background)] text-[var(--color-muted-foreground)] " +
        "hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition " +
        (small ? "h-6 px-2 text-[10px]" : "h-7 px-3 text-xs")
      }
      title={copied ? "Copied" : "Copy to clipboard"}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" /> Copied
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" /> Copy
        </>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Stream reader — used by every long-running endpoint (heartbeat NDJSON)
// ---------------------------------------------------------------------------

async function streamCall(url: string): Promise<ApiResult> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok || !res.body) {
    const maybeJson = await res.json().catch(() => null);
    throw new Error(
      (maybeJson && maybeJson.error) || `Request failed (${res.status})`,
    );
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let last: ApiResult | null = null;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        last = JSON.parse(trimmed) as ApiResult;
      } catch {
        /* heartbeat — ignore */
      }
    }
  }
  if (buffer.trim()) {
    try {
      last = JSON.parse(buffer.trim()) as ApiResult;
    } catch {
      /* ignore */
    }
  }
  if (!last) throw new Error("No response from server");
  if (last.ok === false) throw new Error(last.error ?? "Generation failed");
  return last;
}
