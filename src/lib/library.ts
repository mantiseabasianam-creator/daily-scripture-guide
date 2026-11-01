import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SavedVerse = {
  id: string;
  reference: string;
  text: string;
  translation: string;
  bookmarked?: boolean;
  highlight?: string | null;
  note?: string;
  updatedAt: number;
};

const KEY = "scripture-reader:library";
const SYNC_QUEUE_KEY = "scripture-reader:library-sync-queue-v1";
const listeners = new Set<() => void>();
type SyncOperation = {
  userId: string;
  verseId: string;
  action: "save" | "remove";
  entry?: SavedVerse;
};
let syncInProgress = false;

function read(): Record<string, SavedVerse> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Record<string, SavedVerse>;
  } catch {
    return {};
  }
}

function write(data: Record<string, SavedVerse>) {
  window.localStorage.setItem(KEY, JSON.stringify(data));
  listeners.forEach((l) => l());
}

function readSyncQueue(): SyncOperation[] {
  try {
    return JSON.parse(window.localStorage.getItem(SYNC_QUEUE_KEY) ?? "[]") as SyncOperation[];
  } catch {
    return [];
  }
}

function writeSyncQueue(queue: SyncOperation[]) {
  try {
    window.localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Keep local reading and note edits available if storage quota is exhausted.
  }
}

async function queueLibraryOperation(operation: Omit<SyncOperation, "userId">) {
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return;
    const queue = readSyncQueue().filter(
      (item) => item.userId !== userId || item.verseId !== operation.verseId,
    );
    queue.push({ ...operation, userId });
    writeSyncQueue(queue);
    await syncSavedVerseQueue();
  } catch {
    // Network/auth errors leave the local edit intact for the next reconnect.
  }
}

async function syncSavedVerseQueue() {
  if (syncInProgress || typeof navigator === "undefined" || !navigator.onLine) return;
  syncInProgress = true;
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return;

    let queue = readSyncQueue();
    const ownedOperations = queue.filter((operation) => operation.userId === userId);
    for (const operation of ownedOperations) {
      const result = operation.action === "remove"
        ? await supabase
            .from("saved_verses")
            .delete()
            .eq("user_id", userId)
            .eq("verse_id", operation.verseId)
        : await supabase.from("saved_verses").upsert(
            {
              user_id: userId,
              verse_id: operation.verseId,
              reference: operation.entry?.reference ?? operation.verseId,
              text: operation.entry?.text ?? "",
              translation: operation.entry?.translation ?? "",
              bookmarked: operation.entry?.bookmarked ?? false,
              highlight: operation.entry?.highlight ?? null,
              note: operation.entry?.note ?? null,
              updated_at: new Date(operation.entry?.updatedAt ?? Date.now()).toISOString(),
            },
            { onConflict: "user_id,verse_id" },
          );
      if (result.error) return;
      queue = queue.filter(
        (item) =>
          item.userId !== operation.userId ||
          item.verseId !== operation.verseId ||
          item.action !== operation.action ||
          item.entry?.updatedAt !== operation.entry?.updatedAt,
      );
      writeSyncQueue(queue);
    }
  } catch {
    // Leave unsent changes queued; connectivity/auth events retry them.
  } finally {
    syncInProgress = false;
  }
}

export const HIGHLIGHTS = [
  { id: "gold", label: "Gold" },
  { id: "sky", label: "Sky" },
  { id: "sage", label: "Sage" },
  { id: "rose", label: "Rose" },
] as const;

export function useLibrary() {
  const [data, setData] = useState<Record<string, SavedVerse>>({});

  useEffect(() => {
    const sync = () => setData(read());
    sync();
    listeners.add(sync);
    window.addEventListener("storage", sync);
    const retrySync = () => void syncSavedVerseQueue();
    window.addEventListener("online", retrySync);
    const { data: authSubscription } = supabase.auth.onAuthStateChange(() => {
      setTimeout(retrySync, 0);
    });
    retrySync();
    return () => {
      listeners.delete(sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener("online", retrySync);
      authSubscription.subscription.unsubscribe();
    };
  }, []);

  const update = useCallback(
    (entry: Omit<SavedVerse, "updatedAt">, patch: Partial<SavedVerse>) => {
      const all = read();
      const next: SavedVerse = {
        ...entry,
        ...all[entry.id],
        ...patch,
        reference: entry.reference,
        text: entry.text,
        translation: entry.translation,
        updatedAt: Date.now(),
      };
      if (!next.bookmarked && !next.highlight && !next.note) delete all[entry.id];
      else all[entry.id] = next;
      write(all);
      void queueLibraryOperation(
        !next.bookmarked && !next.highlight && !next.note
          ? { verseId: entry.id, action: "remove" }
          : { verseId: entry.id, action: "save", entry: next },
      );
    },
    [],
  );

  const remove = useCallback((id: string) => {
    const all = read();
    delete all[id];
    write(all);
    void queueLibraryOperation({ verseId: id, action: "remove" });
  }, []);

  const entries = Object.values(data).sort((a, b) => b.updatedAt - a.updatedAt);

  return { data, entries, update, remove };
}