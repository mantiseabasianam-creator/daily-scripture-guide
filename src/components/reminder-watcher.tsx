import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime, type Reminder } from "@/lib/reminders";

/**
 * Polls for reminders whose scheduled time has arrived and surfaces them as a
 * browser notification (when permitted) plus an in-app alert banner.
 */
export function ReminderWatcher() {
  const [due, setDue] = useState<Reminder[]>([]);

  useEffect(() => {
    let active = true;

    const check = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user || !active) return;
      const { data } = await supabase
        .from("reminders")
        .select(
          "id, event_id, event_title, event_date_label, event_location, event_start, lead_minutes, remind_at, notified_at",
        )
        .is("notified_at", null)
        .lte("remind_at", new Date().toISOString());
      const rows = (data as Reminder[] | null) ?? [];
      if (!rows.length || !active) return;

      setDue((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        return [...prev, ...rows.filter((r) => !seen.has(r.id))];
      });

      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        for (const reminder of rows) {
          new Notification(`Upcoming: ${reminder.event_title}`, {
            body: `${reminder.event_date_label}${reminder.event_location ? ` · ${reminder.event_location}` : ""}`,
          });
        }
      }

      await supabase
        .from("reminders")
        .update({ notified_at: new Date().toISOString() })
        .in(
          "id",
          rows.map((r) => r.id),
        );
    };

    void check();
    const timer = window.setInterval(() => void check(), 60_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  if (!due.length) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-50 space-y-2 p-3">
      {due.map((reminder) => (
        <div
          key={reminder.id}
          role="alert"
          className="mx-auto flex max-w-xl items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft"
        >
          <BellRing className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{reminder.event_title} is coming up</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {reminder.event_date_label} · starts {formatDateTime(reminder.event_start)}
            </p>
          </div>
          <button
            type="button"
            aria-label="Dismiss reminder"
            onClick={() => setDue((prev) => prev.filter((r) => r.id !== reminder.id))}
            className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
