import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
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
import { BOOKS, TRANSLATIONS, fetchPassage, verseId } from "@/lib/bible";
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
  const [translation, setTranslation] = useState("kjv");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { data: library } = useLibrary();

  const book = BOOKS.find((b) => b.name === bookName)!;
  const reference = `${bookName} ${chapter}`;
  const abbr = TRANSLATIONS.find((t) => t.id === translation)?.abbr ?? translation.toUpperCase();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["passage", reference, translation],
    queryFn: () => fetchPassage(reference, translation),
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BOOKS.filter((b) => b.name.toLowerCase().includes(q));
  }, [query]);

  const pick = (name: string) => {
    setBookName(name);
    setChapter(1);
    setOpen(false);
  };

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

        <Select value={translation} onValueChange={setTranslation}>
          <SelectTrigger className="w-32 rounded-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRANSLATIONS.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.abbr} — {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <article className="mt-6">
        <h1 className="text-2xl font-semibold">{reference}</h1>
        <p className="mt-1 font-sans text-xs text-muted-foreground">
          {data?.translation_name ?? abbr}
        </p>

        {isLoading ? (
          <div className="mt-6 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : isError ? (
          <p className="mt-6 text-sm text-destructive">
            This chapter isn’t available in {abbr}. Try another translation.
          </p>
        ) : (
          <div className="mt-4 space-y-1">
            {data?.verses.map((v) => {
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
