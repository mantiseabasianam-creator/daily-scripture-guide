import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { SearchIcon } from "lucide-react";
import { useState, type FormEvent } from "react";
import { AppShell } from "@/components/app-shell";
import { VerseRow } from "@/components/verse-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BOOKS, TRANSLATIONS, fetchPassage, verseId, type Verse } from "@/lib/bible";
import { useLibrary } from "@/lib/library";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search Scripture — Scripture Reader" },
      {
        name: "description",
        content:
          "Look up any Bible reference like John 3:16 or search well-known passages by keyword across translations.",
      },
      { property: "og:title", content: "Search Scripture — Scripture Reader" },
      {
        property: "og:description",
        content: "Find verses fast by reference or keyword.",
      },
    ],
  }),
  component: SearchPage,
});

const REFERENCE_RE = /^\s*((?:[1-3]\s*)?[A-Za-z][A-Za-z\s]*?)\s*(\d+)(?::\s*\d+(?:\s*-\s*\d+)?)?\s*$/;

const KEYWORD_INDEX: Record<string, string[]> = {
  love: ["1 Corinthians 13:4-7", "John 3:16", "1 John 4:7-8", "Romans 8:38-39"],
  faith: ["Hebrews 11:1", "Ephesians 2:8-9", "Mark 11:22-24", "James 2:17"],
  hope: ["Jeremiah 29:11", "Romans 15:13", "Psalms 42:11", "Isaiah 40:31"],
  peace: ["Philippians 4:6-7", "John 14:27", "Isaiah 26:3", "Colossians 3:15"],
  strength: ["Philippians 4:13", "Isaiah 41:10", "Psalms 46:1", "Joshua 1:9"],
  fear: ["Isaiah 41:10", "2 Timothy 1:7", "Psalms 27:1", "Joshua 1:9"],
  forgiveness: ["1 John 1:9", "Ephesians 4:32", "Matthew 6:14", "Colossians 3:13"],
  joy: ["Psalms 118:24", "Nehemiah 8:10", "Galatians 5:22-23", "James 1:2-4"],
  wisdom: ["Proverbs 3:5-6", "James 1:5", "Proverbs 9:10", "Colossians 2:3"],
  healing: ["Psalms 147:3", "Isaiah 53:5", "James 5:14-15", "Jeremiah 17:14"],
};

function resolveQuery(raw: string): string[] {
  const q = raw.trim();
  const match = REFERENCE_RE.exec(q);
  if (match) {
    const name = match[1].replace(/\s+/g, " ").trim().toLowerCase();
    const book = BOOKS.find(
      (b) => b.name.toLowerCase() === name || b.name.toLowerCase().startsWith(name),
    );
    if (book) return [q];
  }
  const key = q.toLowerCase();
  const topic = Object.keys(KEYWORD_INDEX).find((k) => k.includes(key) || key.includes(k));
  return topic ? KEYWORD_INDEX[topic] : [];
}

function SearchPage() {
  const [query, setQuery] = useState("");
  const [translation, setTranslation] = useState("kjv");
  const [notFound, setNotFound] = useState(false);
  const { data: library } = useLibrary();
  const abbr = TRANSLATIONS.find((t) => t.id === translation)?.abbr ?? "KJV";

  const search = useMutation({
    mutationFn: async (raw: string) => {
      const refs = resolveQuery(raw);
      if (!refs.length) return [] as { reference: string; verses: Verse[] }[];
      const results = await Promise.allSettled(refs.map((r) => fetchPassage(r, translation)));
      return results
        .filter((r) => r.status === "fulfilled")
        .map((r) => (r as PromiseFulfilledResult<Awaited<ReturnType<typeof fetchPassage>>>).value)
        .map((p) => ({ reference: p.reference, verses: p.verses }));
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setNotFound(resolveQuery(query).length === 0);
    search.mutate(query);
  };

  return (
    <AppShell title="Search">
      <h1 className="text-2xl font-semibold">Search scripture</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter a reference like “John 3:16”, or a theme like “peace”.
      </p>

      <form onSubmit={onSubmit} className="mt-4 flex flex-wrap gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="John 3:16 or hope"
          className="h-11 min-w-0 flex-1 rounded-full"
          aria-label="Search scripture"
        />
        <Select value={translation} onValueChange={setTranslation}>
          <SelectTrigger className="h-11 w-28 rounded-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRANSLATIONS.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.abbr}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" className="h-11 rounded-full px-5">
          <SearchIcon className="size-4" /> Search
        </Button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        {Object.keys(KEYWORD_INDEX).slice(0, 6).map((k) => (
          <button
            key={k}
            onClick={() => {
              setQuery(k);
              setNotFound(false);
              search.mutate(k);
            }}
            className="rounded-full border border-border px-3 py-1 text-xs capitalize text-muted-foreground hover:bg-muted"
          >
            {k}
          </button>
        ))}
      </div>

      <section className="mt-8 space-y-6">
        {search.isPending ? <p className="text-sm text-muted-foreground">Searching…</p> : null}
        {notFound && !search.isPending ? (
          <p className="text-sm text-muted-foreground">
            No matches. Try a reference such as “Psalms 23” or a theme like “joy”.
          </p>
        ) : null}
        {search.data?.map((p) => (
          <div key={p.reference} className="rounded-2xl border border-border bg-card p-4">
            <h2 className="font-sans text-sm font-semibold text-primary">{p.reference}</h2>
            <div className="mt-2 space-y-1">
              {p.verses.map((v) => {
                const id = verseId(v);
                return (
                  <VerseRow
                    key={id}
                    id={id}
                    reference={id}
                    verseNumber={v.verse}
                    text={v.text}
                    translation={abbr}
                    saved={library[id]}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </AppShell>
  );
}