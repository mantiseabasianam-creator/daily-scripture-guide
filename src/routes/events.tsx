import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Events & Reading Plans — Scripture Reader" },
      {
        name: "description",
        content:
          "Upcoming gatherings, prayer meetings and guided reading plans to keep your time in scripture consistent.",
      },
      { property: "og:title", content: "Events & Reading Plans — Scripture Reader" },
      {
        property: "og:description",
        content: "Gatherings, prayer meetings and guided reading plans.",
      },
    ],
  }),
  component: EventsPage,
});

const EVENTS = [
  {
    title: "Morning Prayer & Psalms",
    date: "Every weekday",
    time: "6:00 – 6:45 AM",
    place: "Online · Community room",
    tag: "Prayer",
  },
  {
    title: "Gospel of John — Study Group",
    date: "Wednesdays",
    time: "7:00 – 8:30 PM",
    place: "Grace Chapel, Hall B",
    tag: "Study",
  },
  {
    title: "Worship Night",
    date: "First Friday",
    time: "6:30 – 9:00 PM",
    place: "Main Sanctuary",
    tag: "Worship",
  },
  {
    title: "Youth Scripture Memory Challenge",
    date: "Saturdays",
    time: "10:00 AM – 12:00 PM",
    place: "Youth Centre",
    tag: "Youth",
  },
];

const PLANS = [
  { title: "Proverbs in 31 Days", detail: "One chapter a day of practical wisdom." },
  { title: "The Life of Christ", detail: "Matthew to John across 60 days." },
  { title: "Psalms for Anxious Days", detail: "14 short readings on peace and trust." },
];

function EventsPage() {
  return (
    <AppShell title="Events">
      <h1 className="text-2xl font-semibold">Events & plans</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Gather, pray and keep a steady rhythm in the Word.
      </p>

      <ul className="mt-5 space-y-3">
        {EVENTS.map((e) => (
          <li key={e.title} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <h2 className="min-w-0 text-base font-semibold">{e.title}</h2>
              <Badge variant="secondary" className="shrink-0 rounded-full">
                {e.tag}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-3.5" /> {e.date}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="size-3.5" /> {e.time}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5" /> {e.place}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <h2 className="mt-8 text-lg font-semibold">Reading plans</h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-3">
        {PLANS.map((p) => (
          <li key={p.title} className="rounded-2xl gradient-dawn p-[1px]">
            <div className="h-full rounded-2xl bg-card p-4">
              <p className="font-semibold">{p.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{p.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
