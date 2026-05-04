import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
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
 * Best-effort markdown-ish parser. The user's stored resume_text may have
 * been extracted from a PDF (mostly plain paragraphs) or written in
 * markdown (after we appended apply-edit additions under ## headings).
 * We handle both: heading prefixes are recognized, everything else
 * becomes a paragraph.
 */
function parseResume(md: string): Block[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: Block[] = [];
  let sawName = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();
    if (line === "") continue;

    if (line.startsWith("# ")) {
      const text = stripInline(line.slice(2));
      if (!sawName) {
        out.push({ kind: "name", text });
        sawName = true;
        for (let j = i + 1; j < lines.length; j++) {
          const peek = lines[j].trim();
          if (!peek) continue;
          if (peek.startsWith("#") || peek.startsWith("-")) break;
          out.push({ kind: "contact", text: stripInline(peek) });
          i = j;
          break;
        }
      } else {
        out.push({ kind: "h2", text });
      }
    } else if (line.startsWith("## ")) {
      out.push({ kind: "h2", text: stripInline(line.slice(3)) });
    } else if (line.startsWith("### ")) {
      out.push({ kind: "h3", text: stripInline(line.slice(4)) });
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      out.push({ kind: "bullet", text: stripInline(line.slice(2)) });
    } else if (line.startsWith("• ")) {
      // PDFs sometimes extract bullets as the unicode bullet character.
      out.push({ kind: "bullet", text: stripInline(line.slice(2)) });
    } else {
      out.push({ kind: "p", text: stripInline(line) });
    }
  }
  return out;
}

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

function nodeToWebStream(nodeStream: NodeJS.ReadableStream): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      nodeStream.on("data", (chunk: Buffer | string) => {
        if (typeof chunk === "string") {
          controller.enqueue(new TextEncoder().encode(chunk));
        } else {
          controller.enqueue(
            new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength),
          );
        }
      });
      nodeStream.on("end", () => controller.close());
      nodeStream.on("error", (err: Error) => controller.error(err));
    },
  });
}

export async function GET() {
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

  const { data: profileRow, error: profileErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profileErr || !profileRow) {
    return new Response(JSON.stringify({ error: "Profile not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  const profile = profileRow as Profile;
  if (!profile.resume_text) {
    return new Response(
      JSON.stringify({ error: "No resume on file — upload one first." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const blocks = parseResume(profile.resume_text);
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

  const namePart = profile.full_name ? safeFilename(profile.full_name) : "resume";
  const filename = namePart + "-resume.pdf";

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
