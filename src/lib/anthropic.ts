import Anthropic from "@anthropic-ai/sdk";

export const CLAUDE_MODEL = "claude-sonnet-4-6";

let cachedClient: Anthropic | null = null;

export function getAnthropic() {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set. Add it to .env.local.");
  }
  cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

export function extractJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const startArr = body.indexOf("[");
  let from = -1;
  if (start >= 0 && (startArr < 0 || start < startArr)) from = start;
  else if (startArr >= 0) from = startArr;
  if (from < 0) throw new Error("No JSON found in model output");
  const snippet = body.slice(from).trim();
  return JSON.parse(snippet) as T;
}
