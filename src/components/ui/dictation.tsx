"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionResultEvent = {
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

interface DictationButtonProps {
  getCurrent: () => string;
  onTranscript: (next: string) => void;
  className?: string;
}

export function DictationButton({
  getCurrent,
  onTranscript,
  className,
}: DictationButtonProps) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseTextRef = useRef<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike })
        .webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = navigator.language || "en-US";
    recognitionRef.current = rec;
    setSupported(true);
    return () => {
      try {
        rec.stop();
      } catch {}
    };
  }, []);

  function toggle() {
    const rec = recognitionRef.current;
    if (!rec) return;
    if (listening) {
      rec.stop();
      return;
    }
    const existing = getCurrent();
    baseTextRef.current = existing ? existing.trimEnd() + " " : "";
    rec.onresult = (ev) => {
      let finalText = "";
      let interim = "";
      for (let i = 0; i < ev.results.length; i++) {
        const res = ev.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else interim += res[0].transcript;
      }
      onTranscript(baseTextRef.current + finalText + interim);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => {
      const baked = getCurrent();
      baseTextRef.current = baked ? baked.trimEnd() + " " : "";
      setListening(false);
    };
    rec.start();
    setListening(true);
  }

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={listening ? "Stop dictation" : "Start dictation"}
      title={listening ? "Stop dictating" : "Dictate your answer"}
      className={
        "inline-flex h-8 w-8 items-center justify-center rounded-full border transition " +
        (listening
          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-sm animate-pulse"
          : "border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]") +
        (className ? " " + className : "")
      }
    >
      {listening ? <Square className="h-3.5 w-3.5 fill-current" /> : <Mic className="h-4 w-4" />}
    </button>
  );
}
