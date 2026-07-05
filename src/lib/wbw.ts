import { openDB } from "idb";

export interface WbwWord {
  /** 1-based position within the ayah */
  p: number;
  /** Arabic word (Uthmani) */
  a: string;
  /** English translation */
  t: string;
  /** Transliteration */
  tr: string;
  /** Root letters (space-separated), if known */
  root?: string;
}

export interface WbwSurahData {
  surah: number;
  /** key: ayah number as string */
  ayahs: Record<string, WbwWord[]>;
}

const WBW_DB_NAME = "wise-quran-wbw";
const WBW_STORE = "wbw";
const WBW_DB_VERSION = 1;

let wbwDbPromise: ReturnType<typeof openDB> | null = null;
function wbwDb() {
  if (!wbwDbPromise) {
    wbwDbPromise = openDB(WBW_DB_NAME, WBW_DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(WBW_STORE)) {
          db.createObjectStore(WBW_STORE, { keyPath: "surah" });
        }
      },
    }).catch((err) => {
      wbwDbPromise = null;
      throw err;
    });
  }
  return wbwDbPromise;
}

interface WbwManifest {
  supportedSurahs: number[];
}

let manifestPromise: Promise<WbwManifest> | null = null;
export function loadWbwManifest(): Promise<WbwManifest> {
  if (!manifestPromise) {
    manifestPromise = fetch("/data/wbw/manifest.json")
      .then((r) => (r.ok ? r.json() : { supportedSurahs: [] }))
      .catch(() => ({ supportedSurahs: [] }));
  }
  return manifestPromise;
}

let rootsPromise: Promise<Record<string, string>> | null = null;
function loadRoots(): Promise<Record<string, string>> {
  if (!rootsPromise) {
    rootsPromise = fetch("/data/wbw/roots.json")
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: Record<string, string>) => {
        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(data)) {
          if (k.startsWith("_")) continue;
          out[k] = v;
        }
        return out;
      })
      .catch(() => ({}));
  }
  return rootsPromise;
}

/**
 * Strip diacritics, tatweel, and normalize alef/ya/ta marbuta variants
 * so we can look words up in the roots map.
 */
export function normalizeArabic(input: string): string {
  if (!input) return "";
  let s = input;
  // Remove tatweel
  s = s.replace(/\u0640/g, "");
  // Remove harakat (fatha, kasra, damma, sukun, shadda, tanwin, maddah, etc.)
  s = s.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "");
  // Normalize alef variants (alef hamza above/below, alef madda, alef wasla, alef khanjareeya)
  s = s.replace(/[\u0622\u0623\u0625\u0671]/g, "\u0627");
  // Normalize ya variants (alef maksura → ya)
  s = s.replace(/\u0649/g, "\u064A");
  // Normalize ta marbuta → ha
  s = s.replace(/\u0629/g, "\u0647");
  // Normalize hamza on waw/ya → bare letter
  s = s.replace(/\u0624/g, "\u0648").replace(/\u0626/g, "\u064A");
  return s.trim();
}

const memCache = new Map<number, WbwSurahData>();
const inflight = new Map<number, Promise<WbwSurahData | null>>();

async function readFromIdb(surah: number): Promise<WbwSurahData | null> {
  try {
    const db = await wbwDb();
    const rec = await db.get(WBW_STORE, surah);
    return (rec as WbwSurahData | undefined) ?? null;
  } catch {
    return null;
  }
}

async function writeToIdb(data: WbwSurahData): Promise<void> {
  try {
    const db = await wbwDb();
    await db.put(WBW_STORE, data);
  } catch {
    /* IDB unavailable — non-fatal, we still have memory + network fallback */
  }
}

/**
 * Lazy-load WBW data for a surah. Order of preference:
 *   1. Memory cache (this session)
 *   2. IndexedDB cache (persistent, offline)
 *   3. Bundled JSON under /data/wbw/<n>.json
 * Returns null if the surah has no bundled WBW data yet.
 */
export async function loadWbwSurah(surah: number): Promise<WbwSurahData | null> {
  const cached = memCache.get(surah);
  if (cached) return cached;
  const pending = inflight.get(surah);
  if (pending) return pending;

  const promise = (async () => {
    const fromIdb = await readFromIdb(surah);
    if (fromIdb) {
      const enriched = await enrichWithRoots(fromIdb);
      memCache.set(surah, enriched);
      return enriched;
    }
    try {
      const res = await fetch(`/data/wbw/${surah}.json`);
      if (!res.ok) return null;
      const raw = (await res.json()) as WbwSurahData;
      await writeToIdb(raw);
      const enriched = await enrichWithRoots(raw);
      memCache.set(surah, enriched);
      return enriched;
    } catch {
      return null;
    }
  })();

  inflight.set(surah, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(surah);
  }
}

async function enrichWithRoots(data: WbwSurahData): Promise<WbwSurahData> {
  const roots = await loadRoots();
  const out: WbwSurahData = { surah: data.surah, ayahs: {} };
  for (const [ayahKey, words] of Object.entries(data.ayahs)) {
    out.ayahs[ayahKey] = words.map((w) => {
      const key = normalizeArabic(w.a);
      const root = roots[key];
      return root ? { ...w, root } : w;
    });
  }
  return out;
}
