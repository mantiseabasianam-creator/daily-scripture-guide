import { Bookmark, Highlighter, StickyNote } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { HIGHLIGHTS, type SavedVerse, useLibrary } from "@/lib/library";

const HL_CLASS: Record<string, string> = {
  gold: "bg-hl-gold",
  sky: "bg-hl-sky",
  sage: "bg-hl-sage",
  rose: "bg-hl-rose",
};

export function VerseRow({
  id,
  reference,
  verseNumber,
  text,
  translation,
  saved,
}: {
  id: string;
  reference: string;
  verseNumber?: number | undefined;
  text: string;
  translation: string;
  saved?: SavedVerse | undefined;
}) {
  const { update } = useLibrary();
  const [note, setNote] = useState(saved?.note ?? "");
  const base = { id, reference, text, translation };

  return (
    <div className="group rounded-xl px-2 py-1.5 transition-colors hover:bg-muted/60">
      <p className={cn("scripture-body rounded-md", saved?.highlight && HL_CLASS[saved.highlight])}>
        {verseNumber ? (
          <sup className="mr-1.5 font-sans text-[0.7em] font-semibold text-primary">
            {verseNumber}
          </sup>
        ) : null}
        {text.trim()}
      </p>

      <div className="mt-1 flex items-center gap-1 opacity-70 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="size-8 rounded-full"
          aria-label={saved?.bookmarked ? "Remove bookmark" : "Bookmark verse"}
          onClick={() => update(base, { bookmarked: !saved?.bookmarked })}
        >
          <Bookmark
            className={cn("size-4", saved?.bookmarked && "fill-gold text-gold")}
          />
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 rounded-full" aria-label="Highlight verse">
              <Highlighter className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="flex items-center gap-2">
              {HIGHLIGHTS.map((h) => (
                <button
                  key={h.id}
                  aria-label={`Highlight ${h.label}`}
                  onClick={() =>
                    update(base, { highlight: saved?.highlight === h.id ? null : h.id })
                  }
                  className={cn(
                    "size-7 rounded-full border border-border",
                    HL_CLASS[h.id],
                    saved?.highlight === h.id && "ring-2 ring-ring",
                  )}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 rounded-full" aria-label="Add note">
              <StickyNote className={cn("size-4", saved?.note && "text-primary")} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 space-y-2">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Your reflection on this verse…"
              rows={4}
            />
            <Button size="sm" className="w-full" onClick={() => update(base, { note })}>
              Save note
            </Button>
          </PopoverContent>
        </Popover>

        <span className="ml-auto font-sans text-xs text-muted-foreground">{reference}</span>
      </div>
    </div>
  );
}