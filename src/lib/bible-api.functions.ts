import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const API_BIBLE_BASE = "https://api.scripture.api.bible/v1";

/**
 * A Bible available to the user's API.Bible key (one translation = one bibleId).
 */
export type BibleCatalogEntry = {
  id: string;
  abbr: string;
  name: string;
  language: string;
};

/**
 * Lists every translation the user's API.Bible key grants access to.
 * The key is read on the server only and never ships to the client.
 */
export const getBibles = createServerFn({ method: "GET" }).handler(
  async (): Promise<BibleCatalogEntry[]> => {
    const apiKey = process.env["BIBLE_API_KEY"];
    if (!apiKey) {
      throw new Error("BIBLE_API_KEY secret is not configured");
    }

    const res = await fetch(`${API_BIBLE_BASE}/bibles`, {
      headers: { "api-key": apiKey },
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(
        `API.Bible catalog request failed (${res.status}): ${detail.slice(0, 200)}`,
      );
    }

    const payload = (await res.json()) as {
      data?: Array<Record<string, unknown>>;
    };
    const list = payload.data ?? [];

    return list.map((b) => {
      const lang = b["language"] as
        | { name?: string; iso?: string }
        | undefined;
      return {
        id: String(b["id"] ?? ""),
        abbr: String(b["abbreviation"] ?? b["id"] ?? ""),
        name: String(b["name"] ?? b["descriptionLocal"] ?? "Unknown"),
        language: lang?.name ?? lang?.iso ?? "",
      };
    });
  },
);

const inputSchema = z.object({
  bibleId: z.string().min(1),
  book: z.string().min(1), // USFM book code, e.g. "JHN"
  chapter: z.string().min(1),
});

export type ApiBiblePassage = {
  reference: string;
  bibleId: string;
  copyright: string | null;
  content: string | null;
  verses: { id: string; reference: string; text: string }[];
};

// ---- structured-content parsing (API.Bible content-type=json) ----

type JsonNode = {
  type?: string;
  name?: string;
  attrs?: Record<string, unknown>;
  text?: string;
  items?: JsonNode[];
};

function parseJsonVerses(
  content: JsonNode[],
): { number: string; text: string }[] {
  const verses: { number: string; text: string }[] = [];
  let current: { number: string; text: string } | null = null;

  const walk = (node: JsonNode) => {
    if (node.type === "text" && typeof node.text === "string") {
      if (current) current.text += node.text;
      return;
    }
    if (node.type === "tag" && node.name === "verse") {
      current = {
        number: String(node.attrs?.["number"] ?? ""),
        text: "",
      };
      verses.push(current);
      return; // skip the verse-number digit nested inside the verse tag
    }
    if (node.items) {
      for (const child of node.items) walk(child);
    }
  };

  for (const block of content) walk(block);
  return verses.map((v) => ({
    number: v.number,
    text: v.text.replace(/\s+/g, " ").trim(),
  }));
}

// ---- fallback text parsing (content-type=text, markers like "[1] ...") ----

function parseTextVerses(content: string): { number: string; text: string }[] {
  const verses: { number: string; text: string }[] = [];
  const re = /\[(\d+)\]/g;
  let lastIndex = 0;
  let current: { number: string; text: string } | null = null;
  let m: RegExpExecArray | null;

  while ((m = re.exec(content))) {
    if (current) current.text += content.slice(lastIndex, m.index);
    current = { number: m[1]!, text: "" };
    verses.push(current);
    lastIndex = re.lastIndex;
  }
  if (current) current.text += content.slice(lastIndex);

  return verses.map((v) => ({
    number: v.number,
    text: v.text.replace(/\s+/g, " ").trim(),
  }));
}

/**
 * Secure proxy to API.Bible. The BIBLE_API_KEY secret is read on the server
 * only — it never ships to the client bundle or appears in code.
 *
 * Fetches a full chapter (USFM book code + chapter number) using the
 * chapters endpoint with structured JSON content so each verse is returned
 * individually for the reader's per-verse UI.
 */
export const getBiblePassage = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<ApiBiblePassage> => {
    const apiKey = process.env["BIBLE_API_KEY"];
    if (!apiKey) {
      throw new Error("BIBLE_API_KEY secret is not configured");
    }

    const chapterId = `${data.book}.${data.chapter}`;
    const res = await fetch(
      `${API_BIBLE_BASE}/bibles/${encodeURIComponent(data.bibleId)}/chapters/${encodeURIComponent(chapterId)}?content-type=json&include-notes=false&include-titles=true&include-chapter-numbers=false&include-verse-numbers=true`,
      { headers: { "api-key": apiKey } },
    );

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(
        `API.Bible request failed (${res.status}): ${detail.slice(0, 200)}`,
      );
    }

    const payload = (await res.json()) as { data?: Record<string, unknown> };
    const d = payload.data ?? {};

    const content = d["content"];
    let parsed: { number: string; text: string }[] = [];
    if (Array.isArray(content)) {
      parsed = parseJsonVerses(content as JsonNode[]);
    } else if (typeof content === "string") {
      parsed = parseTextVerses(content);
    }

    const reference = (d["reference"] as string) ?? chapterId;

    return {
      reference,
      bibleId: (d["bibleId"] as string) ?? data.bibleId,
      copyright: (d["copyright"] as string) ?? null,
      content: null,
      verses: parsed
        .filter((v) => v.text.length > 0)
        .map((v) => ({
          id: v.number,
          reference: `${reference}:${v.number}`,
          text: v.text,
        })),
    };
  });
