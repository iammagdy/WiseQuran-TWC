import { getTafsir, saveTafsir } from "./db";

export interface OfflineTafsirAyah {
  numberInSurah: number;
  text: string;
}

interface OfflineEditionConfig {
  /** Base path served from the public directory. No trailing slash. */
  basePath: string;
}

/**
 * Editions whose per-surah tafsir JSON is bundled in the app (under /data/tafsir/…)
 * and therefore available offline after the PWA caches the file on first read.
 *
 * The shape is a registry so additional sources (As-Saadi, Ibn Kathir summaries, …)
 * can be added later without touching callers.
 */
export const OFFLINE_TAFSIR_EDITIONS: Record<string, OfflineEditionConfig> = {
  "ar.muyassar": { basePath: "/data/tafsir/al-muyassar" },
};

export function isOfflineTafsirEdition(editionId: string): boolean {
  return editionId in OFFLINE_TAFSIR_EDITIONS;
}

const inFlight = new Map<string, Promise<OfflineTafsirAyah[]>>();
const memoryCache = new Map<string, OfflineTafsirAyah[]>();

function cacheKey(editionId: string, surahNumber: number) {
  return `${editionId}:${surahNumber}`;
}

/**
 * Load a surah's tafsir from the bundled offline JSON.
 * Memoized in memory, persisted in IndexedDB after first read.
 */
export async function loadOfflineTafsirSurah(
  editionId: string,
  surahNumber: number
): Promise<OfflineTafsirAyah[]> {
  const cfg = OFFLINE_TAFSIR_EDITIONS[editionId];
  if (!cfg) throw new Error(`No offline data for edition: ${editionId}`);

  const key = cacheKey(editionId, surahNumber);
  const mem = memoryCache.get(key);
  if (mem) return mem;

  const pending = inFlight.get(key);
  if (pending) return pending;

  const p = (async (): Promise<OfflineTafsirAyah[]> => {
    const cached = await getTafsir(editionId, surahNumber);
    if (cached && Array.isArray(cached.ayahs) && cached.ayahs.length > 0) {
      memoryCache.set(key, cached.ayahs);
      return cached.ayahs;
    }

    const res = await fetch(`${cfg.basePath}/${surahNumber}.json`);
    if (!res.ok) throw new Error(`Failed to load offline tafsir ${editionId}/${surahNumber}`);
    const ayahs = (await res.json()) as OfflineTafsirAyah[];
    memoryCache.set(key, ayahs);
    saveTafsir(editionId, surahNumber, ayahs).catch(() => { /* ignore persistence errors */ });
    return ayahs;
  })();

  inFlight.set(key, p);
  try {
    return await p;
  } finally {
    inFlight.delete(key);
  }
}

/** Get a single ayah's tafsir text. Returns null if not found. */
export async function getOfflineTafsirAyah(
  editionId: string,
  surahNumber: number,
  ayahNumber: number
): Promise<string | null> {
  const ayahs = await loadOfflineTafsirSurah(editionId, surahNumber);
  return ayahs.find((a) => a.numberInSurah === ayahNumber)?.text ?? null;
}
