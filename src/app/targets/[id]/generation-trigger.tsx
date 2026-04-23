"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface GenerationResult {
  ok?: boolean;
  alreadyGenerated?: boolean;
  count?: number;
  error?: string;
  detail?: string;
}

export function GenerationTrigger({ targetId }: { targetId: string }) {
  const router = useRouter();
  const fired = useRef(false);
  const [state, setState] = useState<"running" | "error">("running");
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setState("running");
    setError(null);
    try {
      const res = await fetch(`/api/targets/${targetId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok || !res.body) {
        // Non-stream error (auth, 404, 5xx before stream starts)
        const maybeJson = await res.json().catch(() => null);
        throw new Error(
          (maybeJson && maybeJson.error) || `Generation failed (${res.status})`,
        );
      }

      // Read the NDJSON stream. The server sends space bytes as a heartbeat
      // while Claude generates, then a final JSON line with the result.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let last: GenerationResult | null = null;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // Any complete JSON line wins — heartbeats are just whitespace.
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            last = JSON.parse(trimmed) as GenerationResult;
          } catch {
            /* not a JSON line yet — ignore */
          }
        }
      }
      if (buffer.trim()) {
        try {
          last = JSON.parse(buffer.trim()) as GenerationResult;
        } catch {
          /* ignore */
        }
      }

      if (!last) {
        throw new Error("Generation finished with no response");
      }
      if (last.ok === false) {
        throw new Error(last.error ?? "Generation failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setState("error");
    }
  }

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === "running") {
    return (
      <div className="mt-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-muted)]/40 p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--color-primary)]" />
          <div>
            <div className="font-medium">Researching and drafting your question list…</div>
            <div className="text-sm text-[var(--color-muted-foreground)]">
              This usually takes 30–60 seconds. Hang tight.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <Alert variant="error">
        We couldn&apos;t generate your question list just now.
        {error ? <span className="ml-1 opacity-80">({error})</span> : null}
      </Alert>
      <Button
        onClick={() => {
          fired.current = true;
          run();
        }}
        variant="outline"
      >
        Try again
      </Button>
    </div>
  );
}
