"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Square } from "lucide-react";

type Gender = "female" | "male" | "off";

const STORAGE_KEY = "ic.voice.pref";

// Common voice-name heuristics — gender isn't formally exposed by the
// Web Speech API on most platforms, so we sniff the voice's display name.
const FEMALE_NAME_HINTS = [
  "female", "samantha", "zira", "susan", "fiona", "karen", "tessa", "veena",
  "moira", "kate", "allison", "ava", "serena", "victoria", "helena", "kathy",
  "vicki", "carol", "alva", "satu", "sara", "hilde", "sandy", "aria", "jenny",
  "amy", "clara", "emma", "fern", "nora", "amelie", "anna", "joanna", "salli",
];
const MALE_NAME_HINTS = [
  "male", "david", "alex", "daniel", "mark", "fred", "tom", "jorge", "diego",
  "aaron", "oliver", "lee", "gordon", "ralph", "bruce", "arthur", "matt",
  "guy", "brian", "simon", "paul", "george", "ryan", "kevin", "justin",
  "matthew", "joey", "thomas", "jacob",
];

function genderFor(voice: SpeechSynthesisVoice): Gender | "unknown" {
  const name = voice.name.toLowerCase();
  // "female" check has to come first since "male" is a substring of "female".
  if (FEMALE_NAME_HINTS.some((hint) => name.includes(hint))) return "female";
  if (MALE_NAME_HINTS.some((hint) => name.includes(hint))) return "male";
  return "unknown";
}

function pickVoice(
  voices: SpeechSynthesisVoice[],
  preferred: Gender,
): SpeechSynthesisVoice | null {
  if (preferred === "off") return null;
  // Prefer English voices — anything else reads back accented/strange.
  const english = voices.filter((v) => v.lang?.toLowerCase().startsWith("en"));
  const pool = english.length > 0 ? english : voices;
  const exact = pool.find((v) => genderFor(v) === preferred);
  if (exact) return exact;
  // Fallback: any English voice if there is one, else first available.
  return pool[0] ?? voices[0] ?? null;
}

interface QuestionVoiceProps {
  text: string;
  /** Cycles when this changes; the component re-plays automatically. */
  speakKey?: string;
  className?: string;
}

export function QuestionVoice({ text, speakKey, className }: QuestionVoiceProps) {
  const [supported, setSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [pref, setPref] = useState<Gender>("off");
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const lastSpokenKeyRef = useRef<string | null>(null);

  // Detect support + load saved preference + populate voices.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;
    setSupported(true);

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "female" || stored === "male" || stored === "off") {
      setPref(stored);
    }

    const load = () => {
      const list = window.speechSynthesis.getVoices();
      if (list.length > 0) setVoices(list);
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const stop = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (override?: Gender) => {
      if (typeof window === "undefined") return;
      if (!("speechSynthesis" in window)) return;
      const useGender = override ?? pref;
      if (useGender === "off") return;
      const voice = pickVoice(voices, useGender);
      // Cancel anything already queued so we never overlap.
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      if (voice) utt.voice = voice;
      utt.rate = 0.95;
      utt.pitch = 1;
      utt.volume = 1;
      utt.onend = () => setSpeaking(false);
      utt.onerror = () => setSpeaking(false);
      utteranceRef.current = utt;
      setSpeaking(true);
      window.speechSynthesis.speak(utt);
    },
    [pref, text, voices],
  );

  // Auto-play when the question changes (only if user has chosen a voice).
  useEffect(() => {
    if (!supported) return;
    if (pref === "off") return;
    if (!speakKey) return;
    if (lastSpokenKeyRef.current === speakKey) return;
    lastSpokenKeyRef.current = speakKey;
    // Wait a frame so the new question is on screen before we start reading.
    const t = setTimeout(() => speak(), 150);
    return () => clearTimeout(t);
  }, [speakKey, pref, supported, speak]);

  // Stop when unmounting (navigating away mid-speech is jarring otherwise).
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function setPreference(next: Gender) {
    setPref(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
    if (next === "off") {
      stop();
    } else {
      // Speak the current question right away so the choice feels real.
      speak(next);
    }
  }

  if (!supported) return null;

  const baseBtn =
    "inline-flex h-8 items-center justify-center gap-1 rounded-full px-3 text-xs font-medium transition border";
  const idle =
    "border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]";
  const active =
    "border-[var(--color-primary)] bg-[var(--color-primary)] text-white";

  return (
    <div
      className={
        "flex flex-wrap items-center gap-2 " + (className ? className : "")
      }
    >
      <button
        type="button"
        onClick={() => (speaking ? stop() : speak())}
        disabled={pref === "off"}
        title={
          pref === "off"
            ? "Pick a voice first"
            : speaking
              ? "Stop reading"
              : "Read the question out loud"
        }
        className={
          "inline-flex h-8 w-8 items-center justify-center rounded-full border transition " +
          (speaking
            ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white animate-pulse"
            : idle) +
          (pref === "off" ? " opacity-50 cursor-not-allowed" : "")
        }
      >
        {speaking ? (
          <Square className="h-3.5 w-3.5 fill-current" />
        ) : pref === "off" ? (
          <VolumeX className="h-4 w-4" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </button>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setPreference("female")}
          title="Use a female voice"
          className={baseBtn + " " + (pref === "female" ? active : idle)}
        >
          Female
        </button>
        <button
          type="button"
          onClick={() => setPreference("male")}
          title="Use a male voice"
          className={baseBtn + " " + (pref === "male" ? active : idle)}
        >
          Male
        </button>
        <button
          type="button"
          onClick={() => setPreference("off")}
          title="Turn voice off"
          className={baseBtn + " " + (pref === "off" ? active : idle)}
        >
          Off
        </button>
      </div>
    </div>
  );
}
