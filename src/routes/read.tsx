import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, WifiOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { BOOKS, BOOK_USFM, verseId } from "@/lib/bible";
import { getBiblePassage, getBibles } from "@/lib/bible-api.functions";
import { useLibrary } from "@/lib/library";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/read")({
  head: () => ({
    meta: [
      { title: "Read the Bible — Scripture Reader" },
      {
        name: "description",
        content:
          "Browse any book and chapter of the Bible across multiple translations with highlights, bookmarks and notes.",
      },
      { property: "og:title", content: "Read the Bible — Scripture Reader" },
      {
        property: "og:description",
        content: "Browse book by book and chapter by chapter across multiple translations.",
      },
    ],
  }),
  component: ReadPage,
});

function ReadPage() {
  const [bookName, setBookName] = useState("John");
  const [chapter, setChapter] = useState(1);
  const [bibleId, setBibleId] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { data: library } = useLibrary();

  const { data: bibles = [] } = useQuery({
    queryKey: ["bibles"],
    queryFn: () => getBibles(),
  });

  // Pick a sensible default once the catalog loads.
  useEffect(() => {
    if (bibleId || !bibles.length) return;
    const preferred =
      bibles.find((b) => /king james|kjv/i.test(`${b.name} ${b.abbr}`)) ??
      bibles.find((b) => /niv|new international/i.test(`${b.name} ${b.abbr}`)) ??
      bibles.find((b) => /esv|english standard/i.test(`${b.name} ${b.abbr}`)) ??
      bibles[0]!;
    setBibleId(preferred.id);
  }, [bibles, bibleId]);

  const book = BOOKS.find((b) => b.name === bookName)!;
  const usfm = BOOK_USFM[bookName] ?? bookName;
  const reference = `${bookName} ${chapter}`;
  const selected = bibles.find((b) => b.id === bibleId);
  const abbr = selected?.abbr ?? "—";
  const bibleName = selected?.name ?? "Loading translations…";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["passage", bibleId, usfm, chapter],
    queryFn: () =>
      getBiblePassage({ data: { bibleId, book: usfm, chapter: String(chapter) } }),
    enabled: Boolean(bibleId),
  });

  const verses = (data?.verses ?? []).map((v) => ({
    book_name: bookName,
    chapter,
    verse: Number(v.id) || 0,
    text: v.text,
  }));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BOOKS.filter((b) => b.name.toLowerCase().includes(q));
  }, [query]);

  const pick = (name: string) => {
    setBookName(name);
    setChapter(1);
    setOpen(false);
  };

  const loading = isLoading || !bibleId;

  return (
    <AppShell title={`${reference} · ${abbr}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="secondary" className="rounded-full font-medium">
              {reference}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[19rem] p-0">
            <SheetHeader className="px-4 pb-2">
              <SheetTitle>Books of the Bible</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-3">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search books…"
              />
            </div>
            <div className="h-[calc(100vh-9rem)] overflow-y-auto px-4 pb-6">
              {(["old", "new"] as const).map((t) => {
                const list = filtered.filter((b) => b.testament === t);
                if (!list.length) return null;
                return (
                  <div key={t} className="mb-4">
                    <p className="sticky top-0 bg-background py-2 font-sans text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      {t === "old" ? "Old Testament" : "New Testament"}
                    </p>
                    <ul>
                      {list.map((b) => (
                        <li key={b.name}>
                          <button
                            onClick={() => pick(b.name)}
                            className={cn(
                              "w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-muted",
                              b.name === bookName && "bg-muted font-medium text-primary",
                            )}
                          >
                            {b.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>

        <Select value={String(chapter)} onValueChange={(v) => setChapter(Number(v))}>
          <SelectTrigger className="w-28 rounded-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {Array.from({ length: book.chapters }, (_, i) => i + 1).map((c) => (
              <SelectItem key={c} value={String(c)}>
                Chapter {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={bibleId} onValueChange={setBibleId}>
          <SelectTrigger className="w-44 rounded-full">
            <SelectValue placeholder="Translation" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {bibles.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.abbr} — {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <article className="mt-6">
        <h1 className="text-2xl font-semibold">{reference}</h1>
        <p className="mt-1 font-sans text-xs text-muted-foreground">{bibleName}</p>
        {data?.copyright && (
          <p className="mt-2 max-w-2xl font-sans text-[11px] leading-relaxed text-muted-foreground/80">
            {data.copyright}
          </p>
        )}

        {loading ? (
          <div className="mt-6 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : isError ? (
          <p className="mt-6 text-sm text-destructive">
            This chapter isn’t available in {bibleName}. Connect to the internet once to save it for offline reading.
          </p>
        ) : (
          <div className="mt-4 space-y-1">
            {verses.map((v) => {
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
        )}
      </article>

      <div className="mt-8 flex items-center justify-between">
        <Button
          variant="outline"
          className="rounded-full"
          disabled={chapter <= 1}
          onClick={() => setChapter((c) => Math.max(1, c - 1))}
        >
          <ChevronLeft className="size-4" /> Previous
        </Button>
        <Button
          variant="outline"
          className="rounded-full"
          disabled={chapter >= book.chapters}
          onClick={() => setChapter((c) => Math.min(book.chapters, c + 1))}
        >
          Next <ChevronRight className="size-4" />
        </Button>
      </div>
    </AppShell>
  );
}
