import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Bookmark, BookOpen, Highlighter, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { VerseRow } from "@/components/verse-row";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchPassage, verseOfTheDayRef } from "@/lib/bible";
import { useLibrary } from "@/lib/library";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Scripture Reader — Daily Verse & Bible Study" },
      {
        name: "description",
        content:
          "Read the Bible in multiple translations, save a verse of the day, bookmark, highlight and take notes in a calm reading space.",
      },
      { property: "og:title", content: "Scripture Reader — Daily Verse & Bible Study" },
      {
        property: "og:description",
        content: "A calm, modern Bible reader with translations, bookmarks, highlights and notes.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const reference = verseOfTheDayRef();
  const { data, isLoading } = useQuery({
    queryKey: ["votd", reference],
    queryFn: () => fetchPassage(reference, "kjv"),
  });
  const { data: library, entries } = useLibrary();

  const verse = data?.verses[0];
  const id = verse ? reference : "";

  return (
    <AppShell title="Today">
      <section className="overflow-hidden rounded-3xl gradient-dawn p-[1px] shadow-soft">
        <div className="rounded-3xl bg-card/95 p-6">
          <p className="font-sans text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Verse of the day
          </p>
          {isLoading || !verse ? (
            <div className="mt-4 space-y-3">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-4/5" />
            </div>
          ) : (
            <div className="mt-3">
              <VerseRow
                id={id}
                reference={reference}
                text={verse.text}
                translation="KJV"
                saved={library[id]}
              />
            </div>
          )}
        </div>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <QuickLink to="/read" icon={<BookOpen className="size-5" />} label="Continue reading" />
        <QuickLink to="/search" icon={<Search className="size-5" />} label="Search scripture" />
        <QuickLink to="/profile" icon={<Bookmark className="size-5" />} label="My library" />
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Recently saved</h2>
        {entries.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Bookmarks, highlights and notes you save while reading will appear here.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {entries.slice(0, 5).map((e) => (
              <li key={e.id} className="rounded-2xl border border-border bg-card p-4">
                <p className="font-sans text-xs font-medium text-primary">
                  {e.reference} · {e.translation}
                </p>
                <p className="scripture-body mt-1 line-clamp-2">{e.text}</p>
                {e.note ? (
                  <p className="mt-2 flex gap-2 text-sm text-muted-foreground">
                    <Highlighter className="mt-0.5 size-3.5 shrink-0" />
                    {e.note}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}

function QuickLink({
  to,
  icon,
  label,
}: {
  to: "/read" | "/search" | "/profile";
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Button asChild variant="outline" className="h-auto justify-start gap-3 rounded-2xl py-4">
      <Link to={to}>
        <span className="text-primary">{icon}</span>
        <span className="text-sm font-medium">{label}</span>
      </Link>
    </Button>
  );
}
