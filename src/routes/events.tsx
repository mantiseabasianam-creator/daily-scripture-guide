import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CalendarDays,
  ChevronDown,
  Clock,
  Globe2,
  MapPin,
  Search,
  Users,
  Video,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { CHURCH_TRADITIONS, getChurchName, NATIONS } from "@/lib/church-directory";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Nationwide Church Events — Scripture Reader" },
      {
        name: "description",
        content:
          "Explore national gatherings, conferences, worship nights, and online events from your church network.",
      },
      { property: "og:title", content: "Nationwide Church Events — Scripture Reader" },
      {
        property: "og:description",
        content: "Find national and online events from your church network.",
      },
    ],
  }),
  component: EventsPage,
});

const CHURCHES = CHURCH_TRADITIONS;

const EVENTS = [
  {
    id: "national-gathering",
    church: "Presbyterian",
    nation: "United States",
    title: "National Gathering 2027",
    date: "April 17–19, 2027",
    time: "Friday–Sunday",
    city: "Dallas, TX",
    type: "Conference",
    attendance: "In person + livestream",
    description:
      "Three days of worship, Bible teaching, and practical ministry workshops for the whole church family.",
  },
  {
    id: "women-lead",
    church: "Presbyterian",
    nation: "United States",
    title: "Flourish Women’s Leadership Summit",
    date: "May 8–9, 2027",
    time: "9:00 AM–5:00 PM CT",
    city: "Nashville, TN",
    type: "Leadership",
    attendance: "In person + livestream",
    description:
      "A weekend of encouragement and training for women serving in ministry, leadership, and their local communities.",
  },
  {
    id: "youth-awake",
    church: "Presbyterian",
    nation: "United States",
    title: "Awake Youth Conference",
    date: "June 24–26, 2027",
    time: "Thursday–Saturday",
    city: "Orlando, FL",
    type: "Youth",
    attendance: "In person",
    description:
      "Students from across the country gather for worship, small groups, service projects, and Scripture-centered teaching.",
  },
  {
    id: "prayer-online",
    church: "Presbyterian",
    nation: "United States",
    title: "National Night of Prayer",
    date: "First Tuesday each month",
    time: "8:00 PM ET",
    city: "Online",
    type: "Prayer",
    attendance: "Online",
    description:
      "A monthly online prayer gathering connecting churches and households across every U.S. time zone.",
  },
  {
    id: "missions-weekend",
    church: "Presbyterian",
    nation: "United States",
    title: "Serve the City Weekend",
    date: "September 18–19, 2027",
    time: "Saturday–Sunday",
    city: "Multiple cities",
    type: "Outreach",
    attendance: "In person",
    description: "Local churches unite for coordinated service projects in communities nationwide.",
  },
  {
    id: "hope-worship",
    church: "Catholic",
    nation: "United States",
    title: "Hope Worship Collective",
    date: "March 12, 2027",
    time: "7:00 PM PT",
    city: "Phoenix, AZ",
    type: "Worship",
    attendance: "In person + livestream",
    description:
      "An evening of worship and prayer with churches from across the Hope Fellowship Network.",
  },
  {
    id: "new-life-family",
    church: "Apostolic",
    nation: "United States",
    title: "New Life Family Conference",
    date: "July 9–10, 2027",
    time: "Friday–Saturday",
    city: "Charlotte, NC",
    type: "Conference",
    attendance: "In person",
    description:
      "Biblical encouragement and practical sessions for parents, marriages, and families.",
  },
] as const;

const EVENT_TYPES = [
  "All events",
  "Conference",
  "Leadership",
  "Youth",
  "Prayer",
  "Outreach",
  "Worship",
];

function EventsPage() {
  const [church, setChurch] = useState<string>(CHURCHES[0]);
  const [nation, setNation] = useState<string>(NATIONS[0]);
  const [type, setType] = useState("All events");
  const [query, setQuery] = useState("");
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      const savedChurch = data.user?.user_metadata['church'];
      const savedNation = data.user?.user_metadata['nation'];
      if (typeof savedChurch === "string" && (CHURCHES as readonly string[]).includes(savedChurch))
        setChurch(savedChurch);
      if (typeof savedNation === "string" && (NATIONS as readonly string[]).includes(savedNation))
        setNation(savedNation);
    });
  }, []);

  const updateChurch = (nextChurch: string) => {
    setChurch(nextChurch);
    void supabase.auth.updateUser({
      data: { church: nextChurch, church_name: getChurchName(nation, nextChurch) },
    });
  };

  const updateNation = (nextNation: string) => {
    setNation(nextNation);
    void supabase.auth.updateUser({
      data: { nation: nextNation, church_name: getChurchName(nextNation, church) },
    });
  };

  const events = useMemo(
    () =>
      EVENTS.filter((event) => {
        const matchesChurch = event.church === church;
        const matchesNation = event.nation === nation;
        const matchesType = type === "All events" || event.type === type;
        const matchesQuery = `${event.title} ${event.city} ${event.type}`
          .toLowerCase()
          .includes(query.trim().toLowerCase());
        return matchesChurch && matchesNation && matchesType && matchesQuery;
      }),
    [church, nation, query, type],
  );

  return (
    <AppShell title="Nationwide events">
      <section className="rounded-2xl bg-primary p-5 text-primary-foreground shadow-soft sm:p-6">
        <div className="flex items-center gap-2 text-primary-foreground/75">
          <Globe2 className="size-4" />
          <span className="text-xs font-medium uppercase tracking-[0.16em]">
            Church events directory
          </span>
        </div>
        <h1 className="mt-3 font-display text-2xl font-semibold sm:text-3xl">
          Gather with your church nationwide
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-primary-foreground/80">
          Discover national conferences, regional gatherings, and online events from the church
          network you follow.
        </p>
      </section>

      <section className="mt-5 rounded-2xl border border-border bg-card p-4 shadow-soft">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
          <label className="grid gap-1.5 text-sm font-medium">
            Your church network
            <span className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <select
                value={church}
                onChange={(event) => updateChurch(event.target.value)}
                className="h-10 w-full appearance-none rounded-md border border-input bg-background py-2 pl-9 pr-9 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
              >
                {CHURCHES.map((churchName) => (
                  <option key={churchName}>{churchName}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            </span>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Nation
            <select
              value={nation}
              onChange={(event) => updateNation(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
            >
              {NATIONS.map((nationOption) => (
                <option key={nationOption}>{nationOption}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Event type
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
            >
              {EVENT_TYPES.map((eventType) => (
                <option key={eventType}>{eventType}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="relative mt-3 block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by event, city, or category"
            className="pl-9"
          />
        </label>
      </section>

      <div className="mt-6 flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Upcoming nationwide events</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {events.length} event{events.length === 1 ? "" : "s"} from{" "}
            {getChurchName(nation, church)}
          </p>
        </div>
        <Badge variant="secondary" className="shrink-0 rounded-full">
          {nation}
        </Badge>
      </div>

      {events.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {events.map((event) => {
            const isExpanded = expandedEvent === event.id;
            return (
              <li
                key={event.id}
                className="rounded-2xl border border-border bg-card p-4 shadow-soft"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div>
                    <h3 className="text-base font-semibold">{event.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {getChurchName(event.nation, event.church)}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 rounded-full">
                    {event.type}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="size-3.5" /> {event.date}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="size-3.5" /> {event.time}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3.5" /> {event.city}
                  </span>
                </div>
                {isExpanded && (
                  <div className="mt-4 rounded-xl bg-muted/60 p-3 text-sm">
                    <p className="leading-6 text-muted-foreground">{event.description}</p>
                    <p className="mt-3 flex items-center gap-1.5 font-medium text-foreground">
                      {event.attendance.includes("Online") ? (
                        <Video className="size-4" />
                      ) : (
                        <Users className="size-4" />
                      )}
                      {event.attendance}
                    </p>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setExpandedEvent(isExpanded ? null : event.id)}
                >
                  {isExpanded ? "Hide details" : "View details"}
                </Button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="font-medium">No events match those filters.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try another event type or clear your search.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => {
              setType("All events");
              setQuery("");
            }}
          >
            Clear filters
          </Button>
        </div>
      )}

      <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">
        Event details are curated in this directory. Connect your church’s event feed or
        registration portal to publish live availability and registration links.
      </p>
    </AppShell>
  );
}
