import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const API_BIBLE_BASE = "https://api.scripture.api.bible/v1";

/**
 * A Bible available to the user's API.Bible key (one translation = one bibleId).
 */
export type BibleCatalogEntry = {
  id: string;
  bibleId: string;
  abbr: string;
  name: string;
  language: string;
  testamentComplete: boolean;
};

type ApiBible = Record<string, unknown> & {
  id?: string;
  dblId?: string;
  name?: string;
  abbreviation?: string;
  abbreviationLocal?: string;
  description?: string;
  descriptionLocal?: string;
  type?: string;
  updatedAt?: string;
  audioBibles?: unknown[];
  language?: { name?: string; iso639_1?: string; iso?: string };
};

const ALLOWED_LANGUAGES = new Set(["english", "hausa", "igbo", "yoruba", "efik", "ibibio", "spanish", "french"]);
const ENGLISH_ABBREVIATIONS = new Set(["KJV", "AMP", "NIV", "NKJV", "WEB"]);
const SINGLE_TESTAMENT_PATTERN = /(?:new|old)\s+testament|\b(?:nt|ot)\s+only\b/i;

function isAllowedLanguage(bible: ApiBible) {
  const name = bible.language?.name?.trim().toLowerCase() ?? "";
  const iso = bible.language?.iso639_1 ?? bible.language?.iso ?? "";
  return ALLOWED_LANGUAGES.has(name) || (name === "english" && iso === "eng");
}

function isCompleteBible(bible: ApiBible) {
  const searchable = [bible.name, bible.description, bible.descriptionLocal].filter(Boolean).join(" ");
  return !SINGLE_TESTAMENT_PATTERN.test(searchable);
}

function duplicateKeys(bible: ApiBible) {
  const name = String(bible.name ?? bible.descriptionLocal ?? "").trim().toLowerCase();
  const abbreviation = String(bible.abbreviationLocal ?? bible.abbreviation ?? "").trim().toLowerCase();
  return [
    bible.dblId ? `dbl:${bible.dblId.trim().toLowerCase()}` : "",
    name ? `name:${name}` : "",
    abbreviation ? `abbr:${abbreviation}` : "",
  ].filter(Boolean);
}

function editionScore(bible: ApiBible) {
  const typeScore = bible.type?.toLowerCase() === "text" ? 2 : 0;
  const audioScore = Array.isArray(bible.audioBibles) && bible.audioBibles.length > 0 ? 1 : 0;
  const updatedAt = Date.parse(String(bible.updatedAt ?? ""));
  return [typeScore, audioScore, Number.isNaN(updatedAt) ? 0 : updatedAt] as const;
}

function isBetterEdition(candidate: ApiBible, current: ApiBible) {
  const candidateScore = editionScore(candidate);
  const currentScore = editionScore(current);
  for (let index = 0; index < candidateScore.length; index += 1) {
    const candidateValue = candidateScore[index]!;
    const currentValue = currentScore[index]!;
    if (candidateValue !== currentValue) return candidateValue > currentValue;
  }
  return false;
}

function filterBibleCatalog(list: ApiBible[]): BibleCatalogEntry[] {
  const candidates = list.filter((bible) => {
    if (!bible.id || !isAllowedLanguage(bible) || !isCompleteBible(bible)) return false;
    const language = bible.language?.name?.trim().toLowerCase() ?? "";
    if (language !== "english") return true;
    const abbreviation = String(bible.abbreviationLocal ?? bible.abbreviation ?? "").toUpperCase();
    const name = String(bible.name ?? bible.descriptionLocal ?? "").toUpperCase();
    return ENGLISH_ABBREVIATIONS.has(abbreviation) || [...ENGLISH_ABBREVIATIONS].some((value) => name.includes(value));
  });

  const selected: { keys: string[]; bible: ApiBible }[] = [];
  for (const bible of candidates) {
    const keys = duplicateKeys(bible);
    const group = selected.find((entry) => entry.keys.some((key) => keys.includes(key)));
    if (!group) selected.push({ keys, bible });
    else if (isBetterEdition(bible, group.bible)) {
      group.bible = bible;
      group.keys = [...new Set([...group.keys, ...keys])];
    } else {
      group.keys = [...new Set([...group.keys, ...keys])];
    }
  }

  return selected.map(({ bible }) => ({
    id: String(bible.id),
    bibleId: String(bible.id),
    abbr: String(bible.abbreviationLocal ?? bible.abbreviation ?? bible.id),
    name: String(bible.name ?? bible.descriptionLocal ?? "Unknown"),
    language: String(bible.language?.name ?? bible.language?.iso639_1 ?? ""),
    testamentComplete: true,
  }));
}

/**
 * Lists every translation the user's API.Bible key grants access to.
 * The key is read on the server only and never ships to the client.
 */
export const getBibles = createServerFn({ method: "GET" }).handler(
  async (): Promise<BibleCatalogEntry[]> => {
    const { data, error } = await supabaseAdmin
      .from("bible_versions")
      .select('id, "bibleId", name, abbreviation, language, testament_complete')
      .order("language")
      .order("name");
    if (error) throw new Error(`Bible version cache request failed: ${error.message}`);
    return (data ?? []).map((bible) => ({
      id: bible.id,
      bibleId: bible.bibleId,
      abbr: bible.abbreviation,
      name: bible.name,
      language: bible.language,
      testamentComplete: bible.testament_complete,
    }));
  },
);

/** Run from a scheduled server job after changing the API.Bible catalog. */
export async function syncBibleCatalog(): Promise<number> {
  const apiKey = process.env["BIBLE_API_KEY"];
  if (!apiKey) throw new Error("BIBLE_API_KEY secret is not configured");
  const res = await fetch(`${API_BIBLE_BASE}/bibles`, { headers: { "api-key": apiKey } });
  if (!res.ok) throw new Error(`API.Bible catalog request failed (${res.status})`);
  const payload = (await res.json()) as { data?: ApiBible[] };
  const rows = filterBibleCatalog(payload.data ?? []).map((bible) => ({
    id: bible.id,
    bibleId: bible.bibleId,
    name: bible.name,
    abbreviation: bible.abbr,
    language: bible.language,
    testament_complete: bible.testamentComplete,
  }));
  const { error: clearError } = await supabaseAdmin.from("bible_versions").delete().neq("id", "");
  if (clearError) throw new Error(`Bible version cache cleanup failed: ${clearError.message}`);
  const { error } = await supabaseAdmin.from("bible_versions").upsert(rows, { onConflict: "bibleId" });
  if (error) throw new Error(`Bible version cache update failed: ${error.message}`);
  return rows.length;
}

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
