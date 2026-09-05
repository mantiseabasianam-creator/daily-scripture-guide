import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  BookHeart,
  BookOpen,
  Bookmark,
  CalendarDays,
  Check,
  Globe2,
  HeartHandshake,
  Highlighter,
  Quote,
  Search,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { VerseRow } from "@/components/verse-row";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchPassage, verseOfTheDayRef } from "@/lib/bible";
import { useChurchCalendar } from "@/lib/church-calendar";
import { getChurchName } from "@/lib/church-directory";
import { useUserChurch } from "@/lib/user-church";
import { Badge } from "@/components/ui/badge";
import { useLibrary } from "@/lib/library";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Scripture Reader — Daily Verse & Bible Study" },
      {
        name: "description",
        content:
          "A calm, personal place to read Scripture, save what matters, and find events from your church community.",
      },
      { property: "og:title", content: "Scripture Reader — Daily Verse & Bible Study" },
      {
        property: "og:description",
        content: "Read Scripture, build your library, and stay connected to your church community.",
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

  return (
    <AppShell title="Home">
      <section className="relative isolate overflow-hidden rounded-[2rem] bg-primary px-6 py-8 text-primary-foreground shadow-soft sm:px-9 sm:py-11">
        <div className="absolute -right-16 -top-20 size-64 rounded-full bg-gold/30 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 size-56 rounded-full bg-white/10 blur-3xl" />
        <div className="relative max-w-xl">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-primary-foreground/70">
            <Sparkles className="size-4 text-gold" /> Your daily rhythm
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
            Make space for the Word.
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-6 text-primary-foreground/80 sm:text-base">
            Scripture Reader brings your reading, reflections, and church community into one
            peaceful place.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild className="rounded-xl bg-card px-5 text-primary hover:bg-card/90">
              <Link to="/read">
                Start reading <ArrowRight />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded-xl border-primary-foreground/25 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"
            >
              <Link to="/events">Explore events</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">
              Today’s Scripture
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold">A word to carry with you</h2>
          </div>
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-gold/20 text-gold-foreground">
            <Quote className="size-5" />
          </span>
        </div>
        {isLoading || !verse ? (
          <div className="mt-5 space-y-3">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5" />
          </div>
        ) : (
          <div className="mt-4">
            <VerseRow
              id={reference}
              reference={reference}
              text={verse.text}
              translation="KJV"
              saved={library[reference]}
            />
          </div>
        )}
      </section>

      <ChurchCalendarPreview />



      <section className="mt-10">
        <div className="max-w-xl">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">
            Everything in one place
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold">
            A gentler way to grow in faith.
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Build a habit of reading, return to what speaks to you, and keep connected with the
            people and moments that matter.
          </p>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Feature
            icon={<BookHeart className="size-5" />}
            title="Read deeply"
            description="Browse the Bible in multiple translations at your own pace."
          />
          <Feature
            icon={<Bookmark className="size-5" />}
            title="Keep what matters"
            description="Save verses, highlights, and personal reflections in your library."
          />
          <Feature
            icon={<Globe2 className="size-5" />}
            title="Gather together"
            description="Find church events for your selected tradition and nation."
          />
        </div>
      </section>

      <section className="mt-10 grid overflow-hidden rounded-3xl border border-border bg-card shadow-soft md:grid-cols-[1.05fr_.95fr]">
        <div className="p-6 sm:p-8">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">
            Your church community
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold">
            Don’t miss a moment to gather.
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Your Events page matches your church tradition and nation, so conferences, prayer
            nights, and service opportunities are easy to find.
          </p>
          <ul className="mt-5 space-y-3 text-sm">
            <li className="flex gap-2.5">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" /> Filtered by your church and
              nation
            </li>
            <li className="flex gap-2.5">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" /> In-person and online
              gathering details
            </li>
            <li className="flex gap-2.5">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" /> Change your preferences any
              time
            </li>
          </ul>
          <Button asChild variant="outline" className="mt-6 rounded-xl">
            <Link to="/events">
              See my events <ArrowRight />
            </Link>
          </Button>
        </div>
        <div className="relative min-h-64 overflow-hidden gradient-dawn p-6 text-primary-foreground sm:p-8">
          <div className="absolute -right-14 top-5 size-44 rounded-full border border-primary-foreground/20" />
          <div className="absolute bottom-0 left-8 size-36 rounded-full bg-gold/30 blur-2xl" />
          <div className="relative rounded-2xl border border-primary-foreground/20 bg-primary-foreground/10 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-primary-foreground/15">
                <CalendarDays className="size-5" />
              </span>
              <div>
                <p className="text-xs text-primary-foreground/70">Coming up</p>
                <p className="font-semibold">Church community events</p>
              </div>
            </div>
            <div className="mt-5 rounded-xl bg-primary-foreground/10 p-3">
              <p className="text-xs text-primary-foreground/70">Personalized for you</p>
              <p className="mt-1 text-sm font-medium">Your church · Your nation</p>
            </div>
          </div>
          <HeartHandshake className="relative mt-8 size-11 text-gold" />
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">
              Your library
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold">
              Return to what you’ve saved.
            </h2>
          </div>
          <Link to="/profile" className="text-sm font-medium text-primary hover:underline">
            Open library
          </Link>
        </div>
        {entries.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-center">
            <Highlighter className="mx-auto size-5 text-primary" />
            <p className="mt-3 font-medium">Your reflections will live here.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Bookmark, highlight, or add a note while you read.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4 rounded-xl">
              <Link to="/read">Read Scripture</Link>
            </Button>
          </div>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {entries.slice(0, 4).map((entry) => (
              <li key={entry.id} className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs font-medium text-primary">
                  {entry.reference} · {entry.translation}
                </p>
                <p className="scripture-body mt-2 line-clamp-3">{entry.text}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </span>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
    </article>
  );
}

function ChurchCalendarPreview() {
  const { denomination, nation } = useUserChurch();
  const { events, loading } = useChurchCalendar(denomination, nation);
  const upcoming = events.slice(0, 3);

  return (
    <section className="mt-6 rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">
            Your church calendar
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold">
            Coming up at {getChurchName(nation, denomination)}
          </h2>
        </div>
        <Badge variant="secondary" className="shrink-0 rounded-full">
          {denomination}
        </Badge>
      </div>

      {loading ? (
        <div className="mt-5 space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-5 w-2/3" />
        </div>
      ) : upcoming.length ? (
        <ul className="mt-4 space-y-2">
          {upcoming.map((event) => (
            <li
              key={event.id}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-xl bg-muted/50 px-3 py-2.5"
            >
              <span className="text-sm font-medium">{event.title}</span>
              <span className="text-xs text-muted-foreground">
                {event.date} · {event.time}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          No services listed for your church yet.
        </p>
      )}

      <Button asChild variant="outline" className="mt-4 rounded-xl">
        <Link to="/events">
          <CalendarDays /> See the full calendar
        </Link>
      </Button>
    </section>
  );
}
