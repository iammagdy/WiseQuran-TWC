import { getDB } from "./db";
import { SURAH_META } from "@/data/surah-meta";

export interface SearchResult {
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  text: string;
}

const MAX_RESULTS = 50;

export async function searchAyahs(query: string): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const db = await getDB();
  const allSurahs = await db.getAll("surahs");

  const results: SearchResult[] = [];

  for (const surah of allSurahs) {
    // ⚡ Bolt: O(1) direct indexing
    const meta = SURAH_META[surah.number - 1];
    const surahName = meta?.name || `سورة ${surah.number}`;

    for (const ayah of surah.ayahs) {
      if (ayah.text.includes(trimmed)) {
        results.push({
          surahNumber: surah.number,
          surahName,
          ayahNumber: ayah.numberInSurah,
          text: ayah.text,
        });
        if (results.length >= MAX_RESULTS) return results;
      }
    }
  }

  return results;
}
