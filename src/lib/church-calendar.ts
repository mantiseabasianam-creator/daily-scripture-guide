import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CalendarCategory = "Family" | "Seasonal" | "Sacrament" | "Milestone";

export const CALENDAR_CATEGORIES: CalendarCategory[] = [
  "Family",
  "Seasonal",
  "Sacrament",
  "Milestone",
];

export type ChurchEventRow = {
  id: string;
  denomination: string;
  nation: string | null;
  event_key: string;
  event_name: string;
  description: string;
  note: string | null;
  category: string;
  date_type: string;
  recurrence_rule: string | null;
  fixed_date: string | null;
  time_label: string;
  rule_label: string;
  is_editable: boolean;
};

export type CalendarEvent = {
  /** Reminder-safe id, namespaced by denomination + date. */
  id: string;
  rowId: string;
  eventKey: string;
  denomination: string;
  nation: string | null;
  title: string;
  description: string;
  note: string | null;
  category: CalendarCategory;
  /** Human readable resolved date, e.g. "June 21, 2026" */
  date: string;
  time: string;
  ruleLabel: string;
  isEditable: boolean;
  start: Date;
  year: number;
};

export const LOCAL_EVENT_PREFIX = "local:";

export function isLocalEventId(eventId: string) {
  return eventId.startsWith(LOCAL_EVENT_PREFIX);
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** Denomination a local reminder belongs to, or null when it is not a local event. */
export function localEventDenomination(eventId: string): string | null {
  if (!isLocalEventId(eventId)) return null;
  return eventId.slice(LOCAL_EVENT_PREFIX.length).split(":")[0] ?? null;
}

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

/**
 * Resolves a stored rule into concrete dates.
 * date_type: "fixed" (fixed_date "MM-DD"), "easter" ("offset:N"),
 * "recurring_sunday" ("nth:<month>:<n>" | "last:<month>" | "monthly-nth:<n>" | "quarterly-last").
 */
function occurrences(row: ChurchEventRow, from: Date, monthsAhead: number): Date[] {
  const horizon = new Date(from);
  horizon.setMonth(horizon.getMonth() + monthsAhead);
  const dates: Date[] = [];
  const rule = row.recurrence_rule ?? "";

  for (let year = from.getFullYear(); year <= horizon.getFullYear(); year += 1) {
    if (row.date_type === "easter") {
      const offset = Number(rule.split(":")[1] ?? 0);
      const base = easterSunday(year);
      base.setDate(base.getDate() + offset);
      dates.push(withTime(base, row.time_label));
    } else if (row.date_type === "fixed") {
      const [month, day] = (row.fixed_date ?? "01-01").split("-").map(Number);
      dates.push(withTime(new Date(year, (month ?? 1) - 1, day ?? 1), row.time_label));
    } else {
      const [kind, first, second] = rule.split(":");
      if (kind === "nth") {
        dates.push(
          withTime(nthWeekday(year, Number(first) - 1, 0, Number(second)), row.time_label),
        );
      } else if (kind === "last") {
        dates.push(withTime(lastWeekday(year, Number(first) - 1, 0), row.time_label));
      } else if (kind === "monthly-nth") {
        for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
          dates.push(withTime(nthWeekday(year, monthIndex, 0, Number(first)), row.time_label));
        }
      } else if (kind === "quarterly-last") {
        for (const monthIndex of [2, 5, 8, 11]) {
          dates.push(withTime(lastWeekday(year, monthIndex, 0), row.time_label));
        }
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

function toCategory(value: string): CalendarCategory {
  return (CALENDAR_CATEGORIES as string[]).includes(value)
    ? (value as CalendarCategory)
    : "Seasonal";
}

/** Nation-specific rows override the shared (nation = null) row for the same event key. */
export function resolveRows(rows: ChurchEventRow[], nation: string): ChurchEventRow[] {
  const byKey = new Map<string, ChurchEventRow>();
  for (const row of rows) {
    const current = byKey.get(row.event_key);
    if (!current || (row.nation === nation && current.nation !== nation)) {
      byKey.set(row.event_key, row);
    }
  }
  return [...byKey.values()];
}

export function buildCalendarEvents(
  rows: ChurchEventRow[],
  nation: string,
  now: Date = new Date(),
  monthsAhead = 14,
  perEvent = 2,
): CalendarEvent[] {
  return resolveRows(rows, nation)
    .flatMap((row) =>
      occurrences(row, now, monthsAhead)
        .slice(0, perEvent)
        .map((start) => ({
          id: `${LOCAL_EVENT_PREFIX}${slug(row.denomination)}:${row.event_key}:${start
            .toISOString()
            .slice(0, 10)}`,
          rowId: row.id,
          eventKey: row.event_key,
          denomination: row.denomination,
          nation: row.nation,
          title: row.event_name,
          description: row.description,
          note: row.note,
          category: toCategory(row.category),
          date: formatDateLabel(start),
          time: row.time_label,
          ruleLabel: row.rule_label,
          isEditable: row.is_editable,
          start,
          year: start.getFullYear(),
        })),
    )
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

const COLUMNS =
  "id, denomination, nation, event_key, event_name, description, note, category, date_type, recurrence_rule, fixed_date, time_label, rule_label, is_editable";

export async function fetchChurchEventRows(denomination: string, nation: string) {
  const { data, error } = await supabase
    .from("church_events")
    .select(COLUMNS)
    .eq("denomination", denomination)
    .or(`nation.is.null,nation.eq.${nation}`);
  if (error) throw error;
  return (data ?? []) as ChurchEventRow[];
}

/** Loads the calendar for a denomination + nation straight from the database. */
export function useChurchCalendar(denomination: string, nation: string) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchChurchEventRows(denomination, nation);
      setEvents(buildCalendarEvents(rows, nation));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load the church calendar");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [denomination, nation]);

  useEffect(() => {
    void load();
  }, [load]);

  return { events, loading, error, reload: load };
}
