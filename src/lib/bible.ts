export type Testament = "old" | "new";

export type Book = { name: string; chapters: number; testament: Testament };

export const BOOKS: Book[] = ([
  ["Genesis", 50], ["Exodus", 40], ["Leviticus", 27], ["Numbers", 36], ["Deuteronomy", 34],
  ["Joshua", 24], ["Judges", 21], ["Ruth", 4], ["1 Samuel", 31], ["2 Samuel", 24],
  ["1 Kings", 22], ["2 Kings", 25], ["1 Chronicles", 29], ["2 Chronicles", 36], ["Ezra", 10],
  ["Nehemiah", 13], ["Esther", 10], ["Job", 42], ["Psalms", 150], ["Proverbs", 31],
  ["Ecclesiastes", 12], ["Song of Solomon", 8], ["Isaiah", 66], ["Jeremiah", 52], ["Lamentations", 5],
  ["Ezekiel", 48], ["Daniel", 12], ["Hosea", 14], ["Joel", 3], ["Amos", 9],
  ["Obadiah", 1], ["Jonah", 4], ["Micah", 7], ["Nahum", 3], ["Habakkuk", 3],
  ["Zephaniah", 3], ["Haggai", 2], ["Zechariah", 14], ["Malachi", 4],
] as [string, number][]).map(([name, chapters]): Book => ({ name, chapters, testament: "old" }))
  .concat(
    ([
      ["Matthew", 28], ["Mark", 16], ["Luke", 24], ["John", 21], ["Acts", 28],
      ["Romans", 16], ["1 Corinthians", 16], ["2 Corinthians", 13], ["Galatians", 6], ["Ephesians", 6],
      ["Philippians", 4], ["Colossians", 4], ["1 Thessalonians", 5], ["2 Thessalonians", 3], ["1 Timothy", 6],
      ["2 Timothy", 4], ["Titus", 3], ["Philemon", 1], ["Hebrews", 13], ["James", 5],
      ["1 Peter", 5], ["2 Peter", 3], ["1 John", 5], ["2 John", 1], ["3 John", 1],
      ["Jude", 1], ["Revelation", 22],
    ] as [string, number][]).map(([name, chapters]): Book => ({ name, chapters, testament: "new" })),
  );

export type Translation = { id: string; abbr: string; name: string };

/**
 * Public-domain / freely licensed translations served by bible-api.com.
 * Modern copyrighted texts (NIV, ESV, NLT, AMP) require a paid licence key.
 */
export const TRANSLATIONS: Translation[] = [
  { id: "kjv", abbr: "KJV", name: "King James Version" },
  { id: "web", abbr: "WEB", name: "World English Bible" },
  { id: "bbe", abbr: "BBE", name: "Bible in Basic English" },
  { id: "oeb-us", abbr: "OEB", name: "Open English Bible (US)" },
  { id: "clementine", abbr: "VUL", name: "Clementine Latin Vulgate" },
  { id: "almeida", abbr: "ALM", name: "João Ferreira de Almeida" },
];

export type Verse = { book_name: string; chapter: number; verse: number; text: string };
export type Passage = {
  reference: string;
  verses: Verse[];
  translation_name: string;
  fromOfflineCache?: boolean;
};

const API = "https://bible-api.com";
const OFFLINE_CACHE_KEY = "scripture-reader-offline-passages-v1";
const MAX_OFFLINE_PASSAGES = 80;

type CachedPassages = Record<string, Passage>;

function passageCacheKey(ref: string, translation: string) {
  return `${translation}:${ref.trim().toLowerCase()}`;
}

function getCachedPassages(): CachedPassages {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_CACHE_KEY) ?? "{}") as CachedPassages;
  } catch {
    return {};
  }
}

function savePassageForOffline(ref: string, translation: string, passage: Passage) {
  if (typeof window === "undefined") return;
  try {
    const cache = getCachedPassages();
    const key = passageCacheKey(ref, translation);
    const entries = Object.entries(cache).filter(([cachedKey]) => cachedKey !== key);
    const recentEntries = entries.slice(-(MAX_OFFLINE_PASSAGES - 1));
    localStorage.setItem(
      OFFLINE_CACHE_KEY,
      JSON.stringify({ ...Object.fromEntries(recentEntries), [key]: passage }),
    );
  } catch {
    // Browsers may deny storage in private mode or when space is exhausted.
  }
}

export async function fetchPassage(ref: string, translation: string): Promise<Passage> {
  try {
    const res = await fetch(`${API}/${encodeURIComponent(ref)}?translation=${translation}`);
    if (!res.ok) throw new Error("Passage not found");
    const data = (await res.json()) as Passage;
    if (!data.verses?.length) throw new Error("Passage not found");
    savePassageForOffline(ref, translation, data);
    return data;
  } catch (error) {
    const cachedPassage = getCachedPassages()[passageCacheKey(ref, translation)];
    if (cachedPassage?.verses?.length) return { ...cachedPassage, fromOfflineCache: true };
    throw error;
  }
}

export function verseId(v: { book_name: string; chapter: number; verse: number }) {
  return `${v.book_name} ${v.chapter}:${v.verse}`;
}

const VOTD = [
  "John 3:16", "Psalms 23:1", "Philippians 4:13", "Jeremiah 29:11", "Proverbs 3:5",
  "Isaiah 41:10", "Romans 8:28", "Joshua 1:9", "Psalms 46:1", "Matthew 11:28",
  "2 Corinthians 5:17", "Psalms 118:24", "1 John 4:19", "Hebrews 11:1", "Galatians 5:22",
];

export function verseOfTheDayRef(date = new Date()) {
  const day = Math.floor(date.getTime() / 86_400_000);
  return VOTD[day % VOTD.length]!;
}
