import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  BellRing,
  Building2,
  CalendarDays,
  ChevronDown,
  Clock,
  Globe2,
  MapPin,
  Repeat,
  Search,
  Users,
  Video,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { CHURCH_TRADITIONS, getChurchName, NATIONS } from "@/lib/church-directory";
import { LEAD_OPTIONS, leadLabel, useReminders } from "@/lib/reminders";

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

const COUNTRY_EVENT_DETAILS: Record<string, { city: string; date: string; time: string }> = {
  Canada: { city: "Toronto, ON", date: "September 11–12, 2027", time: "Saturday–Sunday" },
  "United Kingdom": { city: "London, UK", date: "October 2–3, 2027", time: "Saturday–Sunday" },
  Nigeria: { city: "Lagos, Nigeria", date: "October 23–24, 2027", time: "Saturday–Sunday" },
  Australia: { city: "Sydney, NSW", date: "November 6–7, 2027", time: "Saturday–Sunday" },
  "United States": { city: "Multiple cities", date: "August 14–15, 2027", time: "Saturday–Sunday" },
};

const COUNTRY_EVENTS = NATIONS.flatMap((nation) => {
  const details = COUNTRY_EVENT_DETAILS[nation] ?? {
    city: "Multiple cities",
    date: "August 14–15, 2027",
    time: "Saturday–Sunday",
  };
  return CHURCHES.filter((church) => !(nation === "United States" && church === "Presbyterian")).map(
    (church) => ({
      id: `${nation.toLowerCase().replaceAll(" ", "-")}-${church.toLowerCase().replaceAll(" ", "-")}`,
      church,
      nation,
      title: `${church} National Family Gathering`,
      date: details.date,
      time: details.time,
      city: details.city,
      type: "Conference",
      attendance: "In person + livestream",
      description:
        "A national gathering for worship, Scripture-centered teaching, fellowship, and practical encouragement for local churches.",
    }),
  );
});

const NIGERIA_EVENTS = [
  {
    id: "nigeria-national-prayer",
    church: "Non-denominational",
    nation: "Nigeria",
    title: "Nigeria National Prayer Gathering",
    date: "First Saturday each month",
    time: "6:00 PM WAT",
    city: "Online + Lagos",
    type: "Prayer",
    attendance: "Online + in person",
    description:
      "A monthly prayer gathering for believers across Nigeria, with worship, intercession, and Scripture reading.",
  },
  {
    id: "nigeria-youth-awakening",
    church: "Apostolic",
    nation: "Nigeria",
    title: "West Africa Youth Awakening",
    date: "July 16–18, 2027",
    time: "Friday–Sunday",
    city: "Ibadan, Oyo",
    type: "Youth",
    attendance: "In person + livestream",
    description:
      "A youth weekend focused on worship, discipleship, prayer, and serving local communities across West Africa.",
  },
  {
    id: "nigeria-women-conference",
    church: "Methodist",
    nation: "Nigeria",
    title: "Women of Faith Conference Nigeria",
    date: "August 20–21, 2027",
    time: "Friday–Saturday",
    city: "Abuja, FCT",
    type: "Leadership",
    attendance: "In person + livestream",
    description:
      "Teaching, prayer, and leadership conversations for women serving their churches, families, and communities.",
  },
  {
    id: "nigeria-baptist-missions",
    church: "Baptist",
    nation: "Nigeria",
    title: "Baptist Missions and Service Week",
    date: "September 6–12, 2027",
    time: "All week",
    city: "Multiple cities",
    type: "Outreach",
    attendance: "In person",
    description:
      "Churches partner in practical service, evangelism, and community care projects across Nigeria.",
  },
  {
    id: "nigeria-catholic-family",
    church: "Catholic",
    nation: "Nigeria",
    title: "Catholic Family and Life Congress",
    date: "October 8–10, 2027",
    time: "Friday–Sunday",
    city: "Enugu, Enugu",
    type: "Conference",
    attendance: "In person",
    description:
      "A family-focused congress with Mass, Scripture reflection, pastoral teaching, and community fellowship.",
  },
  {
    id: "nigeria-presbyterian-worship",
    church: "Presbyterian",
    nation: "Nigeria",
    title: "Nigeria Presbyterian Worship Night",
    date: "November 13, 2027",
    time: "5:00 PM WAT",
    city: "Port Harcourt, Rivers",
    type: "Worship",
    attendance: "In person + livestream",
    description:
      "An evening of congregational worship, prayer, and Scripture-led ministry for Presbyterian congregations.",
  },
] as const;

const ALL_EVENTS = [...EVENTS, ...COUNTRY_EVENTS, ...NIGERIA_EVENTS];

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
  const { reminders, userId, setReminder, cancelReminder } = useReminders();

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
      ALL_EVENTS.filter((event) => {
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

      <div className="mt-5 grid grid-cols-2 gap-1 rounded-full bg-muted p-1 text-sm font-medium">
        {(["nationwide", "calendar"] as const).map((tabValue) => (
          <button
            key={tabValue}
            type="button"
            onClick={() => setTab(tabValue)}
            className={`rounded-full px-3 py-2 transition-colors ${
              tab === tabValue
                ? "bg-card text-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tabValue === "nationwide" ? "Nationwide Events" : "Church Calendar"}
          </button>
        ))}
      </div>

      {tab === "calendar" ? (
        <ChurchCalendarSection
          reminders={reminders}
          signedIn={Boolean(userId)}
          onSet={setReminder}
          onCancel={cancelReminder}
        />
      ) : (
        <>
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
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExpandedEvent(isExpanded ? null : event.id)}
                  >
                    {isExpanded ? "Hide details" : "View details"}
                  </Button>
                  <RemindMeButton
                    event={event}
                    reminder={reminders.find((r) => r.event_id === event.id) ?? null}
                    signedIn={Boolean(userId)}
                    onSet={setReminder}
                    onCancel={cancelReminder}
                  />
                </div>
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
        </>
      )}
    </AppShell>
  );
}

function ChurchCalendarSection({
  reminders,
  signedIn,
  onSet,
  onCancel,
}: {
  reminders: { event_id: string; lead_minutes: number }[];
  signedIn: boolean;
  onSet: (event: EventItem, leadMinutes: number) => Promise<void>;
  onCancel: (eventId: string) => Promise<void>;
}) {
  const [category, setCategory] = useState<string>("All categories");
  const allEvents = useMemo(() => getChurchCalendarEvents(), []);
  const [expanded, setExpanded] = useState<string | null>(null);

  const items = useMemo(
    () =>
      allEvents.filter(
        (event) => category === "All categories" || event.category === category,
      ),
    [allEvents, category],
  );

  return (
    <>
      <section className="mt-5 rounded-2xl border border-border bg-card p-4 shadow-soft">
        <label className="grid gap-1.5 text-sm font-medium sm:max-w-xs">
          Category
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
          >
            {["All categories", ...CALENDAR_CATEGORIES].map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          These observances repeat every year from their recurrence rule, so upcoming dates fill in
          automatically — nothing to re-add each year.
        </p>
      </section>

      <div className="mt-6 flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Upcoming church calendar</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length} recurring service{items.length === 1 ? "" : "s"} at your local church
          </p>
        </div>
        <Badge variant="secondary" className="shrink-0 rounded-full">
          Local
        </Badge>
      </div>

      <ul className="mt-4 space-y-3">
        {items.map((event) => {
          const isExpanded = expanded === event.id;
          return (
            <li key={event.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div>
                  <h3 className="text-base font-semibold">{event.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{event.ruleLabel}</p>
                </div>
                <Badge variant="secondary" className="shrink-0 rounded-full">
                  {event.category}
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
                  <Repeat className="size-3.5" /> Annually recurring
                </span>
              </div>
              {isExpanded && (
                <div className="mt-4 rounded-xl bg-muted/60 p-3 text-sm">
                  <p className="leading-6 text-muted-foreground">{event.description}</p>
                </div>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExpanded(isExpanded ? null : event.id)}
                >
                  {isExpanded ? "Hide details" : "View details"}
                </Button>
                <RemindMeButton
                  event={{
                    id: event.id,
                    title: event.title,
                    date: event.date,
                    time: event.time,
                    city: "Local church",
                  }}
                  reminder={reminders.find((r) => r.event_id === event.id) ?? null}
                  signedIn={signedIn}
                  onSet={onSet}
                  onCancel={onCancel}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}


type EventItem = {
  id: string;
  title: string;
  date: string;
  time: string;
  city: string;
};

function RemindMeButton({
  event,
  reminder,
  signedIn,
  onSet,
  onCancel,
}: {
  event: EventItem;
  reminder: { lead_minutes: number } | null;
  signedIn: boolean;
  onSet: (event: EventItem, leadMinutes: number) => Promise<void>;
  onCancel: (eventId: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const choose = async (minutes: number) => {
    setBusy(true);
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        void Notification.requestPermission();
      }
      await onSet(event, minutes);
      setOpen(false);
      toast.success(`Reminder set for ${event.title}`, {
        description: leadLabel(minutes),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not set reminder");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      await onCancel(event.id);
      setOpen(false);
      toast(`Reminder cancelled for ${event.title}`);
    } catch {
      toast.error("Could not cancel reminder");
    } finally {
      setBusy(false);
    }
  };

  if (!signedIn) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => toast("Sign in to set event reminders")}
      >
        <Bell className="size-4" /> Remind me
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant={reminder ? "secondary" : "outline"} size="sm" disabled={busy}>
          {reminder ? <BellRing className="size-4" /> : <Bell className="size-4" />}
          {reminder ? "Reminder set" : "Remind me"}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 p-2">
        <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          {reminder ? "Reminder timing" : "Remind me"}
        </p>
        <div className="grid">
          {LEAD_OPTIONS.map((option) => (
            <button
              key={option.minutes}
              type="button"
              disabled={busy}
              onClick={() => void choose(option.minutes)}
              className={`rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted ${
                reminder?.lead_minutes === option.minutes ? "font-semibold text-primary" : ""
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {reminder ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void cancel()}
            className="mt-1 w-full rounded-md px-2 py-2 text-left text-sm text-destructive transition-colors hover:bg-muted"
          >
            Cancel reminder
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
