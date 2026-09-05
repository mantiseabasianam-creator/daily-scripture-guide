import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const API_BIBLE_BASE = "https://api.scripture.api.bible/v1";

function stripMarkup(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const inputSchema = z.object({
  bibleId: z.string().min(1),
  book: z.string().min(1),
  chapter: z.string().min(1),
});

type ApiBibleVerse = {
  id: string;
  reference: string;
  content?: string;
};

export type ApiBiblePassage = {
  reference: string;
  bibleId: string;
  copyright: string | null;
  content: string | null;
  verses: { id: string; reference: string; text: string }[];
};

/**
 * Secure proxy to API.Bible. The BIBLE_API_KEY secret is read on the server
 * only — it never ships to the client bundle or appears in code.
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
      `${API_BIBLE_BASE}/bibles/${encodeURIComponent(data.bibleId)}/passages/${encodeURIComponent(chapterId)}?content-type=text&include-notes=false&include-titles=true&include-chapter-numbers=false&include-verse-numbers=true`,
      { headers: { "api-key": apiKey } },
    );

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`API.Bible request failed (${res.status}): ${detail.slice(0, 200)}`);
    }

    const payload = (await res.json()) as { data?: Record<string, unknown> };
    const d = payload.data ?? {};

    const verses =
      (d["verses"] as ApiBibleVerse[] | undefined)?.map((v) => ({
        id: v.id,
        reference: v.reference,
        text: v.content ? stripMarkup(v.content) : "",
      })) ?? [];

    return {
      reference: (d["reference"] as string) ?? chapterId,
      bibleId: (d["bibleId"] as string) ?? data.bibleId,
      copyright: (d["copyright"] as string) ?? null,
      content: d["content"] ? stripMarkup(String(d["content"])) : null,
      verses,
    };
  });
