import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Reminder = {
  id: string;
  event_id: string;
  event_title: string;
  event_date_label: string;
  event_location: string | null;
  event_start: string;
  lead_minutes: number;
  remind_at: string;
  notified_at: string | null;
};

export const LEAD_OPTIONS = [
  { minutes: 1440, label: "1 day before" },
  { minutes: 60, label: "1 hour before" },
  { minutes: 0, label: "At the time of the event" },
] as const;

export function leadLabel(minutes: number) {
  return LEAD_OPTIONS.find((option) => option.minutes === minutes)?.label ?? `${minutes} min before`;
}

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function applyTime(date: Date, timeLabel: string) {
  const match = /(\d{1,2}):(\d{2})\s*(am|pm)/i.exec(timeLabel);
  if (!match) {
    date.setHours(9, 0, 0, 0);
    return date;
  }
  let hours = Number(match[1]) % 12;
  if (match[3]?.toLowerCase() === "pm") hours += 12;
  date.setHours(hours, Number(match[2]), 0, 0);
  return date;
}

/** Best-effort conversion of a human event date label into a start Date. */
export function parseEventStart(dateLabel: string, timeLabel: string): Date {
  const monthMatch = new RegExp(`(${MONTHS.join("|")})\\s+(\\d{1,2})`, "i").exec(dateLabel);
  const yearMatch = /(20\d{2})/.exec(dateLabel);
  if (monthMatch && yearMatch) {
    const month = MONTHS.indexOf(monthMatch[1]!.toLowerCase());
    const date = new Date(Number(yearMatch[1]), month, Number(monthMatch[2]));
    return applyTime(date, timeLabel);
  }

  const recurring = new RegExp(`first\\s+(${WEEKDAYS.join("|")})`, "i").exec(dateLabel);
  if (recurring) {
    const weekday = WEEKDAYS.indexOf(recurring[1]!.toLowerCase());
    const now = new Date();
    for (let monthOffset = 0; monthOffset < 3; monthOffset += 1) {
      const first = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
      const delta = (weekday - first.getDay() + 7) % 7;
      first.setDate(1 + delta);
      const candidate = applyTime(first, timeLabel);
      if (candidate.getTime() > now.getTime()) return candidate;
    }
  }

  const fallback = new Date();
  fallback.setDate(fallback.getDate() + 7);
  return applyTime(fallback, timeLabel);
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function useReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    setUserId(auth.user?.id ?? null);
    if (!auth.user) {
      setReminders([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("reminders")
      .select(
        "id, event_id, event_title, event_date_label, event_location, event_start, lead_minutes, remind_at, notified_at",
      )
      .order("event_start", { ascending: true });
    setReminders((data as Reminder[] | null) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void load();
    });
    return () => listener.subscription.unsubscribe();
  }, [load]);

  const setReminder = useCallback(
    async (
      event: {
        id: string;
        title: string;
        date: string;
        time: string;
        city?: string;
      },
      leadMinutes: number,
    ) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sign in to set reminders");
      const start = parseEventStart(event.date, event.time);
      const remindAt = new Date(start.getTime() - leadMinutes * 60_000);
      const { error } = await supabase.from("reminders").upsert(
        {
          user_id: auth.user.id,
          event_id: event.id,
          event_title: event.title,
          event_date_label: event.date,
          event_location: event.city ?? null,
          event_start: start.toISOString(),
          lead_minutes: leadMinutes,
          remind_at: remindAt.toISOString(),
          notified_at: null,
        },
        { onConflict: "user_id,event_id" },
      );
      if (error) throw error;
      await load();
    },
    [load],
  );

  const cancelReminder = useCallback(
    async (eventId: string) => {
      const { error } = await supabase.from("reminders").delete().eq("event_id", eventId);
      if (error) throw error;
      await load();
    },
    [load],
  );

  return { reminders, loading, userId, reload: load, setReminder, cancelReminder };
}
