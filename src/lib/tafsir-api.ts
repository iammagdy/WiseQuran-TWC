import { getTafsir, saveTafsir } from "./db";
import { isOfflineTafsirEdition, loadOfflineTafsirSurah } from "./offline-tafsir";

const API_BASE = "https://api.alquran.cloud/v1";

export interface TafsirAyah {
  numberInSurah: number;
  text: string;
}

export async function fetchTafsir(
  surahNumber: number,
  editionId: string,
  signal?: AbortSignal,
): Promise<TafsirAyah[]> {
  // Prefer bundled offline data when available.
  if (isOfflineTafsirEdition(editionId)) {
    return loadOfflineTafsirSurah(editionId, surahNumber);
  }

  // Check cache
  const cached = await getTafsir(editionId, surahNumber);
  if (cached) return cached.ayahs;

  const res = await fetch(`${API_BASE}/surah/${surahNumber}/${editionId}`, { signal });
  if (!res.ok) throw new Error("Failed to fetch tafsir");
  const data = await res.json();

  const ayahs: TafsirAyah[] = (data.data.ayahs as Array<{ numberInSurah: number; text: string }>).map((a) => ({
    numberInSurah: a.numberInSurah,
    text: a.text,
  }));

  await saveTafsir(editionId, surahNumber, ayahs);
  return ayahs;
}
