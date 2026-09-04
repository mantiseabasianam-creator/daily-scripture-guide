import { useState } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { CalendarEvent } from "@/lib/church-calendar";

export function SuggestCorrection({ event }: { event: CalendarEvent }) {
  const [open, setOpen] = useState(false);
  const [suggested, setSuggested] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (message.trim().length < 5) {
      toast.error("Please describe what should be corrected");
      return;
    }
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        toast("Sign in to suggest a correction");
        return;
      }
      const { error } = await supabase.from("event_corrections").insert({
        user_id: auth.user.id,
        church_event_id: event.rowId,
        event_key: event.eventKey,
        denomination: event.denomination,
        nation: event.nation,
        event_name: event.title,
        current_date_label: `${event.date} · ${event.time}`,
        suggested_date: suggested.trim() || null,
        message: message.trim(),
      });
      if (error) throw error;
      toast.success("Thanks — your correction was sent for review");
      setOpen(false);
      setSuggested("");
      setMessage("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send your suggestion");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          <Flag className="size-3.5" /> Suggest a correction
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Suggest a correction</DialogTitle>
          <DialogDescription>
            {event.title} — currently listed for {event.date} at {event.time}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <label className="grid gap-1.5 text-sm font-medium">
            Correct date (optional)
            <Input
              value={suggested}
              onChange={(e) => setSuggested(e.target.value)}
              placeholder="e.g. May 27, or 2nd Sunday in June"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            What should change?
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Tell us how your church observes this service."
            />
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={busy}>
            {busy ? "Sending…" : "Send suggestion"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
