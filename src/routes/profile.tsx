import { createFileRoute } from "@tanstack/react-router";
import { Bookmark, Highlighter, StickyNote, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/theme-toggle";
import { useLibrary, type SavedVerse } from "@/lib/library";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Library — Scripture Reader" },
      {
        name: "description",
        content:
          "Your saved bookmarks, highlighted passages and personal notes, kept together in one quiet place.",
      },
      { property: "og:title", content: "My Library — Scripture Reader" },
      {
        property: "og:description",
        content: "Bookmarks, highlights and notes saved to your profile.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { entries, remove } = useLibrary();
  const bookmarks = entries.filter((e) => e.bookmarked);
  const highlights = entries.filter((e) => e.highlight);
  const notes = entries.filter((e) => e.note);

  return (
    <AppShell title="Profile">
      <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl gradient-dawn font-display text-lg font-semibold text-primary-foreground">
              SR
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">My library</p>
              <p className="truncate text-xs text-muted-foreground">
                {entries.length} saved {entries.length === 1 ? "verse" : "verses"} on this device
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="Bookmarks" value={bookmarks.length} />
          <Stat label="Highlights" value={highlights.length} />
          <Stat label="Notes" value={notes.length} />
        </div>
      </section>

      <Tabs defaultValue="bookmarks" className="mt-6">
        <TabsList className="w-full rounded-full">
          <TabsTrigger value="bookmarks" className="flex-1 rounded-full">
            <Bookmark className="size-4" /> Saved
          </TabsTrigger>
          <TabsTrigger value="highlights" className="flex-1 rounded-full">
            <Highlighter className="size-4" /> Highlights
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex-1 rounded-full">
            <StickyNote className="size-4" /> Notes
          </TabsTrigger>
        </TabsList>
        <TabsContent value="bookmarks">
          <List items={bookmarks} onRemove={remove} empty="No bookmarked verses yet." />
        </TabsContent>
        <TabsContent value="highlights">
          <List items={highlights} onRemove={remove} empty="No highlighted verses yet." />
        </TabsContent>
        <TabsContent value="notes">
          <List items={notes} onRemove={remove} empty="No notes yet." />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-muted/70 py-3">
      <p className="font-display text-xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function List({
  items,
  empty,
  onRemove,
}: {
  items: SavedVerse[];
  empty: string;
  onRemove: (id: string) => void;
}) {
  if (!items.length) return <p className="mt-6 text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="mt-4 space-y-3">
      {items.map((e) => (
        <li key={e.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
            <p className="min-w-0 truncate font-sans text-xs font-medium text-primary">
              {e.reference} · {e.translation}
            </p>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 rounded-full"
              aria-label={`Remove ${e.reference}`}
              onClick={() => onRemove(e.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
          <p className="scripture-body mt-1">{e.text.trim()}</p>
          {e.note ? (
            <p className="mt-2 rounded-xl bg-muted/70 p-3 text-sm text-muted-foreground">{e.note}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
