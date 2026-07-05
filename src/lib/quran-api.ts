import { getSurah, saveSurah } from "./db";
import { SURAH_META } from "@/data/surah-meta";

const API_BASE = "https://api.alquran.cloud/v1";

export interface Ayah {
  number: number;
  text: string;
  numberInSurah: number;
  page?: number;
}

export interface SurahMeta {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

// Returns static bundled metadata — instant, works offline
export async function fetchSurahList(): Promise<SurahMeta[]> {
  return SURAH_META;
}

export async function fetchSurahAyahs(surahNumber: number, signal?: AbortSignal): Promise<Ayah[]> {
  // Check local cache first
  const cached = await getSurah(surahNumber);
  if (cached) return cached.ayahs;

  const res = await fetch(`${API_BASE}/surah/${surahNumber}/quran-uthmani`, { signal });
  const data = await res.json();
  const ayahs: Ayah[] = data.data.ayahs.map((a: unknown) => ({
    number: a.number,
    text: a.text,
    numberInSurah: a.numberInSurah,
    page: a.page,
  }));
  // Cache for offline use
  await saveSurah(surahNumber, ayahs);
  return ayahs;
}

export async function downloadSurah(surahNumber: number): Promise<void> {
  const res = await fetch(`${API_BASE}/surah/${surahNumber}/quran-uthmani`);
  const data = await res.json();
  const ayahs = data.data.ayahs.map((a: unknown) => ({
    number: a.number,
    text: a.text,
    numberInSurah: a.numberInSurah,
    page: a.page,
  }));
  await saveSurah(surahNumber, ayahs);
}

// Bulk download entire Quran in a single API call (~2.5MB)
export async function downloadAllSurahs(
  onProgress?: (percent: number) => void
): Promise<void> {
  onProgress?.(0);
  const res = await fetch(`${API_BASE}/quran/quran-uthmani`);
  if (!res.ok) throw new Error("Failed to fetch full Quran");
  const data = await res.json();

  // Group ayahs by surah
  const surahMap = new Map<number, Ayah[]>();
  for (const a of data.data.surahs) {
    const ayahs: Ayah[] = a.ayahs.map((ay: unknown) => ({
      number: ay.number,
      text: ay.text,
      numberInSurah: ay.numberInSurah,
      page: ay.page,
    }));
    surahMap.set(a.number, ayahs);
  }

  // Save each surah to IndexedDB in parallel
  let saved = 0;
  const total = surahMap.size;
  const savePromises = Array.from(surahMap.entries()).map(async ([num, ayahs]) => {
    await saveSurah(num, ayahs);
    saved++;
    onProgress?.(Math.round((saved / total) * 100));
  });

  await Promise.all(savePromises);
}
