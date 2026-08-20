import { useCallback, useEffect, useState } from "react";

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
const listeners = new Set<() => void>();

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
    return () => {
      listeners.delete(sync);
      window.removeEventListener("storage", sync);
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
    },
    [],
  );

  const remove = useCallback((id: string) => {
    const all = read();
    delete all[id];
    write(all);
  }, []);

  const entries = Object.values(data).sort((a, b) => b.updatedAt - a.updatedAt);

  return { data, entries, update, remove };
}