export type CalendarCategory = "Family" | "Seasonal" | "Sacrament" | "Milestone";

type Recurrence =
  | { kind: "fixed"; month: number; day: number } // month is 1-12
  | { kind: "nth-weekday"; month: number; weekday: number; nth: number } // nth 1-5, weekday 0=Sun
  | { kind: "last-weekday"; month: number; weekday: number }
  | { kind: "easter"; offsetDays: number }; // relative to Easter Sunday

type CalendarDefinition = {
  id: string;
  title: string;
  description: string;
  category: CalendarCategory;
  time: string;
  ruleLabel: string;
  recurrence: Recurrence;
};

export type CalendarEvent = {
  id: string;
  title: string;
  description: string;
  category: CalendarCategory;
  /** Human readable resolved date, e.g. "June 21, 2026" */
  date: string;
  time: string;
  /** Recurrence description, e.g. "3rd Sunday in June, every year" */
  ruleLabel: string;
  start: Date;
  year: number;
};

export const CALENDAR_CATEGORIES: CalendarCategory[] = [
  "Family",
  "Seasonal",
  "Sacrament",
  "Milestone",
];

const CALENDAR_DEFINITIONS: CalendarDefinition[] = [
  {
    id: "mothers-day-service",
    title: "Mother’s Day Service",
    description:
      "A celebration service honouring mothers in the congregation with special prayer, testimonies, and a family-focused message.",
    category: "Family",
    time: "10:00 AM",
    ruleLabel: "2nd Sunday in May, every year",
    recurrence: { kind: "nth-weekday", month: 5, weekday: 0, nth: 2 },
  },
  {
    id: "fathers-day-service",
    title: "Father’s Day Service",
    description:
      "A service of honour and encouragement for fathers and father figures, with prayer over households and men’s ministry highlights.",
    category: "Family",
    time: "10:00 AM",
    ruleLabel: "3rd Sunday in June, every year",
    recurrence: { kind: "nth-weekday", month: 6, weekday: 0, nth: 3 },
  },
  {
    id: "childrens-day",
    title: "Children’s Day",
    description:
      "Children lead worship, readings, and presentations, followed by games and a family lunch after service.",
    category: "Family",
    time: "9:30 AM",
    ruleLabel: "2nd Sunday in October, every year",
    recurrence: { kind: "nth-weekday", month: 10, weekday: 0, nth: 2 },
  },
  {
    id: "harvest-thanksgiving",
    title: "Harvest / Thanksgiving Sunday",
    description:
      "A thanksgiving service of gratitude with harvest offerings, testimonies, and gifts shared with families in need.",
    category: "Seasonal",
    time: "10:00 AM",
    ruleLabel: "Last Sunday in November, every year",
    recurrence: { kind: "last-weekday", month: 11, weekday: 0 },
  },
  {
    id: "christmas-carol-service",
    title: "Christmas Carol Service",
    description:
      "Nine lessons and carols by candlelight with the choir, congregational singing, and the Christmas Scripture readings.",
    category: "Seasonal",
    time: "6:00 PM",
    ruleLabel: "December 24, every year",
    recurrence: { kind: "fixed", month: 12, day: 24 },
  },
  {
    id: "watch-night-service",
    title: "Watch Night Service",
    description:
      "New Year’s Eve service of worship, thanksgiving, and prayer as the congregation crosses into the new year together.",
    category: "Seasonal",
    time: "10:00 PM",
    ruleLabel: "December 31, every year",
    recurrence: { kind: "fixed", month: 12, day: 31 },
  },
  {
    id: "palm-sunday",
    title: "Palm Sunday",
    description:
      "Holy Week begins with the procession of palms and the reading of Christ’s triumphal entry into Jerusalem.",
    category: "Seasonal",
    time: "10:00 AM",
    ruleLabel: "Sunday before Easter, every year",
    recurrence: { kind: "easter", offsetDays: -7 },
  },
  {
    id: "good-friday-service",
    title: "Good Friday Service",
    description:
      "A reflective service on the crucifixion with the seven last words, Scripture readings, and quiet prayer.",
    category: "Seasonal",
    time: "12:00 PM",
    ruleLabel: "Friday before Easter, every year",
    recurrence: { kind: "easter", offsetDays: -2 },
  },
  {
    id: "easter-sunday",
    title: "Easter Sunday",
    description:
      "Resurrection celebration with sunrise prayer, festive worship, and a message on the risen Christ.",
    category: "Seasonal",
    time: "9:00 AM",
    ruleLabel: "Easter Sunday, every year",
    recurrence: { kind: "easter", offsetDays: 0 },
  },
  {
    id: "founders-day",
    title: "Anniversary / Founder’s Day",
    description:
      "The church marks another year with thanksgiving, remembering its founding, and honouring long-serving members.",
    category: "Milestone",
    time: "10:00 AM",
    ruleLabel: "1st Sunday in September, every year",
    recurrence: { kind: "nth-weekday", month: 9, weekday: 0, nth: 1 },
  },
  {
    id: "communion-sunday",
    title: "Communion Sunday",
    description:
      "The Lord’s Supper is shared by the whole congregation, with a time of self-examination and prayer beforehand.",
    category: "Sacrament",
    time: "10:00 AM",
    ruleLabel: "1st Sunday of every month",
    recurrence: { kind: "nth-weekday", month: 0, weekday: 0, nth: 1 },
  },
  {
    id: "baptism-dedication-sunday",
    title: "Baptism / Dedication Sunday",
    description:
      "Believers are baptised and babies dedicated, with families welcomed and prayed for by the pastoral team.",
    category: "Sacrament",
    time: "11:00 AM",
    ruleLabel: "Last Sunday of every quarter",
    recurrence: { kind: "last-weekday", month: 0, weekday: 0 },
  },
];

/** Anonymous Gregorian computus. */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function nthWeekday(year: number, monthIndex: number, weekday: number, nth: number): Date {
  const first = new Date(year, monthIndex, 1);
  const delta = (weekday - first.getDay() + 7) % 7;
  return new Date(year, monthIndex, 1 + delta + (nth - 1) * 7);
}

function lastWeekday(year: number, monthIndex: number, weekday: number): Date {
  const last = new Date(year, monthIndex + 1, 0);
  const delta = (last.getDay() - weekday + 7) % 7;
  return new Date(year, monthIndex, last.getDate() - delta);
}

function withTime(date: Date, timeLabel: string): Date {
  const match = /(\d{1,2}):(\d{2})\s*(am|pm)/i.exec(timeLabel);
  const next = new Date(date);
  if (!match) {
    next.setHours(10, 0, 0, 0);
    return next;
  }
  let hours = Number(match[1]) % 12;
  if (match[3]?.toLowerCase() === "pm") hours += 12;
  next.setHours(hours, Number(match[2]), 0, 0);
  return next;
}

/** All future occurrences of a definition within the lookahead window. */
function occurrences(def: CalendarDefinition, from: Date, monthsAhead: number): Date[] {
  const horizon = new Date(from);
  horizon.setMonth(horizon.getMonth() + monthsAhead);
  const dates: Date[] = [];
  const startYear = from.getFullYear();

  for (let year = startYear; year <= horizon.getFullYear(); year += 1) {
    if (def.recurrence.kind === "easter") {
      const base = easterSunday(year);
      base.setDate(base.getDate() + def.recurrence.offsetDays);
      dates.push(withTime(base, def.time));
    } else if (def.recurrence.kind === "fixed") {
      dates.push(withTime(new Date(year, def.recurrence.month - 1, def.recurrence.day), def.time));
    } else if (def.recurrence.kind === "nth-weekday") {
      const months =
        def.recurrence.month === 0
          ? Array.from({ length: 12 }, (_, index) => index)
          : [def.recurrence.month - 1];
      for (const monthIndex of months) {
        dates.push(
          withTime(nthWeekday(year, monthIndex, def.recurrence.weekday, def.recurrence.nth), def.time),
        );
      }
    } else {
      const months =
        def.recurrence.month === 0 ? [2, 5, 8, 11] : [def.recurrence.month - 1];
      for (const monthIndex of months) {
        dates.push(withTime(lastWeekday(year, monthIndex, def.recurrence.weekday), def.time));
      }
    }
  }

  return dates
    .filter((date) => date.getTime() >= from.getTime() && date.getTime() <= horizon.getTime())
    .sort((a, b) => a.getTime() - b.getTime());
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export const LOCAL_EVENT_PREFIX = "local:";

export function isLocalEventId(eventId: string) {
  return eventId.startsWith(LOCAL_EVENT_PREFIX);
}

/**
 * Resolves the recurrence rules into concrete, dated occurrences.
 * Runs against "now", so each year's dates auto-populate without manual edits.
 */
export function getChurchCalendarEvents(
  now: Date = new Date(),
  monthsAhead = 14,
  perEvent = 2,
): CalendarEvent[] {
  return CALENDAR_DEFINITIONS.flatMap((def) =>
    occurrences(def, now, monthsAhead)
      .slice(0, perEvent)
      .map((start) => ({
        id: `${LOCAL_EVENT_PREFIX}${def.id}:${start.toISOString().slice(0, 10)}`,
        title: def.title,
        description: def.description,
        category: def.category,
        date: formatDateLabel(start),
        time: def.time,
        ruleLabel: def.ruleLabel,
        start,
        year: start.getFullYear(),
      })),
  ).sort((a, b) => a.start.getTime() - b.start.getTime());
}
