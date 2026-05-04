import { createClient } from "@/lib/supabase/server";
import type { InterviewTarget } from "@/lib/types";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToStream,
  Font,
} from "@react-pdf/renderer";
import React from "react";

export const runtime = "nodejs";
export const maxDuration = 30;

// Disable hyphenation so words don't break across lines awkwardly.
Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 56,
    fontSize: 10.5,
    fontFamily: "Helvetica",
    lineHeight: 1.4,
    color: "#1a1a1a",
  },
  name: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
    color: "#0f0f0f",
  },
  contact: {
    fontSize: 10,
    color: "#555555",
    marginBottom: 14,
  },
  h2: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginTop: 14,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#bbbbbb",
    color: "#0f0f0f",
  },
  h3: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginTop: 8,
    marginBottom: 2,
    color: "#0f0f0f",
  },
  paragraph: {
    fontSize: 10.5,
    marginBottom: 4,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 2,
    marginLeft: 8,
  },
  bulletDot: {
    width: 12,
    fontSize: 10.5,
  },
  bulletText: {
    flex: 1,
    fontSize: 10.5,
  },
});

type Block =
  | { kind: "name"; text: string }
  | { kind: "contact"; text: string }
  | { kind: "h2"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "p"; text: string }
  | { kind: "bullet"; text: string };

/**
 * Parse the markdown the LLM produced into block-level chunks. The prompt
 * constrains the model to a small subset (#, ##, ###, -, paragraphs), so we
 * don't need a full markdown parser — a line-by-line walker is enough and
 * handles edge cases (stray spacing, missing contact line) gracefully.
 */
function parseMarkdown(md: string): Block[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: Block[] = [];
  let sawName = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trimEnd();
    if (line === "") continue;

    if (line.startsWith("# ")) {
      const text = stripInline(line.slice(2));
      if (!sawName) {
        out.push({ kind: "name", text });
        sawName = true;
        // Treat the very next non-empty line as the contact line if it
        // doesn't look like another heading or a bullet.
        for (let j = i + 1; j < lines.length; j++) {
          const peek = lines[j].trim();
          if (!peek) continue;
          if (peek.startsWith("#") || peek.startsWith("-")) break;
          out.push({ kind: "contact", text: stripInline(peek) });
          i = j;
          break;
        }
      } else {
        // Demote secondary H1s to H2 — the prompt should produce only one.
        out.push({ kind: "h2", text });
      }
    } else if (line.startsWith("## ")) {
      out.push({ kind: "h2", text: stripInline(line.slice(3)) });
    } else if (line.startsWith("### ")) {
      out.push({ kind: "h3", text: stripInline(line.slice(4)) });
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      out.push({ kind: "bullet", text: stripInline(line.slice(2)) });
    } else {
      out.push({ kind: "p", text: stripInline(line) });
    }
  }
  return out;
}

/**
 * Strip the small subset of inline markdown the model may emit: **bold** and
 * *italic*. We render plain text — react-pdf doesn't carry inline styling
 * across our line-broken Text nodes nicely without more work, and the prompt
 * already discourages inline emphasis.
 */
function stripInline(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
}

function renderBlocks(blocks: Block[]) {
  return blocks.map((block, i) => {
    switch (block.kind) {
      case "name":
        return React.createElement(Text, { key: i, style: styles.name }, block.text);
      case "contact":
        return React.createElement(Text, { key: i, style: styles.contact }, block.text);
      case "h2":
        return React.createElement(Text, { key: i, style: styles.h2 }, block.text);
      case "h3":
        return React.createElement(Text, { key: i, style: styles.h3 }, block.text);
      case "bullet":
        return React.createElement(
          View,
          { key: i, style: styles.bulletRow },
          React.createElement(Text, { style: styles.bulletDot }, "•"),
          React.createElement(Text, { style: styles.bulletText }, block.text),
        );
      case "p":
      default:
        return React.createElement(
          Text,
          { key: i, style: styles.paragraph },
          block.text,
        );
    }
  });
}

function safeFilename(s: string) {
  return s
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: targetRow, error: targetErr } = await supabase
    .from("interview_targets")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (targetErr || !targetRow) {
    return new Response(JSON.stringify({ error: "Target not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  const target = targetRow as InterviewTarget;
  if (!target.tailored_resume) {
    return new Response(
      JSON.stringify({ error: "Generate the tailored rewrite first." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const blocks = parseMarkdown(target.tailored_resume);
  const doc = React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "LETTER", style: styles.page },
      ...renderBlocks(blocks),
    ),
  );
  const stream = await renderToStream(doc);

  const filename = safeFilename(`${target.company_name}-${target.job_title}-resume`) + ".pdf";

  // @react-pdf returns a Node Readable; convert to a Web ReadableStream
  // for the Fetch Response.
  const webStream = nodeToWebStream(stream as unknown as NodeJS.ReadableStream);

  return new Response(webStream, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function nodeToWebStream(nodeStream: NodeJS.ReadableStream): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      nodeStream.on("data", (chunk: Buffer | string) => {
        if (typeof chunk === "string") {
          controller.enqueue(new TextEncoder().encode(chunk));
        } else {
          // Node Buffer is already Uint8Array-compatible.
          controller.enqueue(new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength));
        }
      });
      nodeStream.on("end", () => controller.close());
      nodeStream.on("error", (err: Error) => controller.error(err));
    },
  });
}
