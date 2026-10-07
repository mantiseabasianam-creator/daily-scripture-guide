import { BOOKS, BOOK_USFM } from "@/lib/bible";
import { getBiblePassage, type ApiBiblePassage } from "@/lib/bible-api.functions";

const DB_NAME = "scripture-reader-bible-v1";
const CHAPTERS = "chapters";
const TRANSLATIONS = "translations";
const MAX_TRANSLATIONS = 2;
const MAX_CHAPTERS = 2500;
export const OFFLINE_CHAPTER_MESSAGE =
  "This chapter isn't downloaded yet — connect to the internet to read it, or it will download automatically next time you're online";

type CachedChapter = {
  key: string;
  translationId: string;
  bookCode: string;
  chapter: number;
  passage: ApiBiblePassage;
  lastUsedAt: number;
};

type CachedTranslation = { id: string; lastUsedAt: number };

let databasePromise: Promise<IDBDatabase | null> | null = null;
let activeDownloadId: string | null = null;
let downloadRunning = false;

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(CHAPTERS)) {
        const chapters = database.createObjectStore(CHAPTERS, { keyPath: "key" });
        chapters.createIndex("translationId", "translationId", { unique: false });
      }
      if (!database.objectStoreNames.contains(TRANSLATIONS)) {
        database.createObjectStore(TRANSLATIONS, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open offline Bible storage"));
  }).catch(() => null);

  return databasePromise;
}

function chapterKey(translationId: string, bookCode: string, chapter: number) {
  return `${translationId}|${bookCode}|${chapter}`;
}

function updateTranslationUsage(database: IDBDatabase, translationId: string, at: number) {
  database.transaction(TRANSLATIONS, "readwrite").objectStore(TRANSLATIONS).put({
    id: translationId,
    lastUsedAt: at,
  } satisfies CachedTranslation);
}

export async function readCachedChapter(
  translationId: string,
  bookCode: string,
  chapter: number,
): Promise<ApiBiblePassage | null> {
  const database = await openDatabase();
  if (!database) return null;

  return new Promise((resolve) => {
    const transaction = database.transaction(CHAPTERS, "readwrite");
    const store = transaction.objectStore(CHAPTERS);
    const request = store.get(chapterKey(translationId, bookCode, chapter));
    let passage: ApiBiblePassage | null = null;
    request.onsuccess = () => {
      const entry = request.result as CachedChapter | undefined;
      if (!entry) return;
      entry.lastUsedAt = Date.now();
      store.put(entry);
      updateTranslationUsage(database, translationId, entry.lastUsedAt);
      passage = entry.passage;
    };
    transaction.oncomplete = () => resolve(passage);
    transaction.onerror = () => resolve(null);
    transaction.onabort = () => resolve(null);
  });
}

export async function saveCachedChapter(
  translationId: string,
  bookCode: string,
  chapter: number,
  passage: ApiBiblePassage,
): Promise<void> {
  const database = await openDatabase();
  if (!database) return;

  return new Promise((resolve) => {
    const now = Date.now();
    const transaction = database.transaction([CHAPTERS, TRANSLATIONS], "readwrite");
    const chapters = transaction.objectStore(CHAPTERS);
    const translations = transaction.objectStore(TRANSLATIONS);
    chapters.put({
      key: chapterKey(translationId, bookCode, chapter),
      translationId,
      bookCode,
      chapter,
      passage,
      lastUsedAt: now,
    } satisfies CachedChapter);
    translations.put({ id: translationId, lastUsedAt: now } satisfies CachedTranslation);

    const cachedTranslations = translations.getAll();
    cachedTranslations.onsuccess = () => {
      const oldest = (cachedTranslations.result as CachedTranslation[])
        .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
        .slice(MAX_TRANSLATIONS);
      for (const translation of oldest) {
        const keys = chapters.index("translationId").getAllKeys(translation.id);
        keys.onsuccess = () => {
          for (const key of keys.result) chapters.delete(key);
        };
        translations.delete(translation.id);
      }
    };

    const allChapters = chapters.getAll();
    allChapters.onsuccess = () => {
      const entries = (allChapters.result as CachedChapter[]).sort(
        (a, b) => a.lastUsedAt - b.lastUsedAt,
      );
      for (const entry of entries.slice(0, Math.max(0, entries.length - MAX_CHAPTERS))) {
        chapters.delete(entry.key);
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
}

async function nextMissingChapter(translationId: string) {
  const database = await openDatabase();
  if (!database) return null;
  const keys = await new Promise<IDBValidKey[]>((resolve) => {
    const transaction = database.transaction(CHAPTERS, "readonly");
    const request = transaction.objectStore(CHAPTERS).index("translationId").getAllKeys(translationId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve([]);
  });
  const cached = new Set(keys.map(String));

  for (const book of BOOKS) {
    const bookCode = BOOK_USFM[book.name] ?? book.name;
    for (let chapter = 1; chapter <= book.chapters; chapter += 1) {
      if (!cached.has(chapterKey(translationId, bookCode, chapter))) return { bookCode, chapter };
    }
  }
  return null;
}

function online() {
  return typeof navigator === "undefined" || navigator.onLine;
}

function waitUntilOnline() {
  if (online() || typeof window === "undefined") return Promise.resolve();
  return new Promise<void>((resolve) => window.addEventListener("online", () => resolve(), { once: true }));
}

function waitForIdle() {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return new Promise<void>((resolve) => setTimeout(resolve, 1500));
  }
  if (document.visibilityState === "hidden") {
    return new Promise<void>((resolve) => setTimeout(resolve, 5000));
  }
  if ("requestIdleCallback" in window) {
    return new Promise<void>((resolve) => window.requestIdleCallback(() => resolve(), { timeout: 4000 }));
  }
  return new Promise<void>((resolve) => setTimeout(resolve, 1800));
}

async function downloadSelectedTranslation() {
  if (downloadRunning || !activeDownloadId) return;
  downloadRunning = true;
  const translationId = activeDownloadId;
  try {
    while (activeDownloadId === translationId) {
      await waitUntilOnline();
      if (activeDownloadId !== translationId) break;
      const next = await nextMissingChapter(translationId);
      if (!next) {
        activeDownloadId = null;
        break;
      }
      try {
        const passage = await getBiblePassage({
          data: { bibleId: translationId, book: next.bookCode, chapter: String(next.chapter) },
        });
        await saveCachedChapter(translationId, next.bookCode, next.chapter, passage);
      } catch {
        if (!online()) continue;
        break;
      }
      await waitForIdle();
    }
  } finally {
    downloadRunning = false;
    if (activeDownloadId && activeDownloadId !== translationId) void downloadSelectedTranslation();
  }
}

export function startSelectedTranslationDownload(translationId: string) {
  if (!translationId) return;
  activeDownloadId = translationId;
  void downloadSelectedTranslation();
}

export async function getBibleChapter(
  translationId: string,
  bookCode: string,
  chapter: number,
): Promise<ApiBiblePassage> {
  const cached = await readCachedChapter(translationId, bookCode, chapter);
  if (cached) return cached;

  if (!online()) throw new Error(OFFLINE_CHAPTER_MESSAGE);

  try {
    const passage = await getBiblePassage({
      data: { bibleId: translationId, book: bookCode, chapter: String(chapter) },
    });
    await saveCachedChapter(translationId, bookCode, chapter, passage);
    return passage;
  } catch (error) {
    if (!online()) {
      const saved = await readCachedChapter(translationId, bookCode, chapter);
      if (saved) return saved;
      throw new Error(OFFLINE_CHAPTER_MESSAGE);
    }
    throw error;
  }
}