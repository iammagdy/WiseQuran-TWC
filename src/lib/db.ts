import { openDB, type DBSchema } from "idb";

interface WiseQuranDB extends DBSchema {
  surahs: {
    key: number;
    value: {
      number: number;
      ayahs: { number: number; text: string; numberInSurah: number }[];
    };
  };
  azkar: {
    key: string;
    value: {
      category: string;
      items: { id: string; text: string; translation: string; count: number }[];
    };
  };
  audio: {
    key: string;
    value: {
      id: string;
      reciterId: string;
      surahNumber: number;
      data: ArrayBuffer;
    };
  };
  tafsir: {
    key: string; // "editionId-surahNumber"
    value: {
      id: string;
      editionId: string;
      surahNumber: number;
      ayahs: { numberInSurah: number; text: string }[];
    };
  };
}

const DB_NAME = "wise-quran-db";
const DB_VERSION = 4;

function audioKey(reciterId: string, surahNumber: number): string {
  return `${reciterId}-${surahNumber}`;
}

function tafsirKey(editionId: string, surahNumber: number): string {
  return `${editionId}-${surahNumber}`;
}

let dbPromise: ReturnType<typeof openDB<WiseQuranDB>> | null = null;

function openDatabase() {
  return openDB<WiseQuranDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains("surahs")) {
        db.createObjectStore("surahs", { keyPath: "number" });
      }
      if (!db.objectStoreNames.contains("azkar")) {
        db.createObjectStore("azkar", { keyPath: "category" });
      }
      if (db.objectStoreNames.contains("audio") && oldVersion < 3) {
        db.deleteObjectStore("audio");
      }
      if (!db.objectStoreNames.contains("audio")) {
        db.createObjectStore("audio", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("tafsir")) {
        db.createObjectStore("tafsir", { keyPath: "id" });
      }
    },
  });
}

export async function getDB() {
  if (!dbPromise) {
    dbPromise = openDatabase().catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

export async function saveSurah(number: number, ayahs: any[]) {
  const db = await getDB();
  await db.put("surahs", { number, ayahs });
}

export async function getSurah(number: number) {
  const db = await getDB();
  return db.get("surahs", number);
}

export async function getAllDownloadedSurahs(): Promise<number[]> {
  const db = await getDB();
  const keys = await db.getAllKeys("surahs");
  return keys as number[];
}

export async function deleteSurah(number: number) {
  const db = await getDB();
  await db.delete("surahs", number);
}

export async function saveAudio(reciterId: string, surahNumber: number, data: ArrayBuffer) {
  const db = await getDB();
  await db.put("audio", { id: audioKey(reciterId, surahNumber), reciterId, surahNumber, data });
}

export async function getAudio(reciterId: string, surahNumber: number) {
  const db = await getDB();
  return db.get("audio", audioKey(reciterId, surahNumber));
}

export async function deleteAudio(reciterId: string, surahNumber: number) {
  const db = await getDB();
  await db.delete("audio", audioKey(reciterId, surahNumber));
}

export async function getAllDownloadedAudio(reciterId: string): Promise<number[]> {
  const db = await getDB();
  const all = await db.getAll("audio");
  return all.filter((a) => a.reciterId === reciterId).map((a) => a.surahNumber);
}

export async function clearAllAudio() {
  const db = await getDB();
  await db.clear("audio");
}

export async function clearAllData() {
  const db = await getDB();
  await db.clear("surahs");
  await db.clear("azkar");
  await db.clear("audio");
}

export async function clearAllTafsir() {
  const db = await getDB();
  await db.clear("tafsir");
}

export async function saveTafsir(editionId: string, surahNumber: number, ayahs: { numberInSurah: number; text: string }[]) {
  const db = await getDB();
  await db.put("tafsir", { id: tafsirKey(editionId, surahNumber), editionId, surahNumber, ayahs });
}

export async function getTafsir(editionId: string, surahNumber: number) {
  const db = await getDB();
  return db.get("tafsir", tafsirKey(editionId, surahNumber));
}

/**
 * Check available storage quota and return usage information
 */
export async function checkStorageQuota(): Promise<{
  usage: number;
  quota: number;
  available: number;
  percentUsed: number;
  hasEnoughSpace: (requiredBytes: number) => boolean;
}> {
  if (!navigator.storage || !navigator.storage.estimate) {
    return {
      usage: 0,
      quota: 0,
      available: 0,
      percentUsed: 0,
      hasEnoughSpace: () => true,
    };
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const available = quota - usage;
    const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;

    return {
      usage,
      quota,
      available,
      percentUsed,
      hasEnoughSpace: (requiredBytes: number) => available > requiredBytes * 1.1,
    };
  } catch {
    return {
      usage: 0,
      quota: 0,
      available: 0,
      percentUsed: 0,
      hasEnoughSpace: () => true,
    };
  }
}

/** Calculate storage usage breakdown in bytes */
export async function getStorageStats(): Promise<{
  quranText: number;
  audio: number;
  tafsir: number;
  total: number;
  audioCount: number;
  surahCount: number;
  tafsirCount: number;
}> {
  const db = await getDB();

  // Quran text
  const allSurahs = await db.getAll("surahs");
  let quranText = 0;
  for (const s of allSurahs) {
    quranText += new Blob([JSON.stringify(s)]).size;
  }

  // Audio
  const allAudio = await db.getAll("audio");
  let audio = 0;
  for (const a of allAudio) {
    audio += a.data.byteLength;
  }

  // Tafsir
  const allTafsir = await db.getAll("tafsir");
  let tafsir = 0;
  for (const t of allTafsir) {
    tafsir += new Blob([JSON.stringify(t)]).size;
  }

  return {
    quranText,
    audio,
    tafsir,
    total: quranText + audio + tafsir,
    audioCount: allAudio.length,
    surahCount: allSurahs.length,
    tafsirCount: allTafsir.length,
  };
}

/**
 * Verify that a specific audio file exists and has valid data in IndexedDB
 */
export async function verifyAudioExists(reciterId: string, surahNumber: number): Promise<boolean> {
  try {
    const db = await getDB();
    const entry = await db.get("audio", audioKey(reciterId, surahNumber));
    return !!(entry && entry.data && entry.data.byteLength > 0);
  } catch {
    return false;
  }
}

/**
 * Verify that a specific surah text exists and has ayahs in IndexedDB
 */
export async function verifySurahExists(surahNumber: number): Promise<boolean> {
  try {
    const db = await getDB();
    const entry = await db.get("surahs", surahNumber);
    return !!(entry && entry.ayahs && entry.ayahs.length > 0);
  } catch {
    return false;
  }
}

/**
 * Bulk verify all downloaded audio files and return list of broken surah numbers
 */
export async function verifyAllAudio(reciterId: string): Promise<{
  valid: number[];
  broken: number[];
}> {
  const db = await getDB();
  const all = await db.getAll("audio");
  const reciterAudio = all.filter((a) => a.reciterId === reciterId);
  
  const valid: number[] = [];
  const broken: number[] = [];
  
  for (const entry of reciterAudio) {
    if (entry.data && entry.data.byteLength > 0) {
      valid.push(entry.surahNumber);
    } else {
      broken.push(entry.surahNumber);
      // Clean up broken entry
      await db.delete("audio", entry.id);
    }
  }
  
  return { valid, broken };
}

/**
 * Bulk verify all downloaded surah texts and return list of broken surah numbers
 */
export async function verifyAllSurahs(): Promise<{
  valid: number[];
  broken: number[];
}> {
  const db = await getDB();
  const all = await db.getAll("surahs");
  
  const valid: number[] = [];
  const broken: number[] = [];
  
  for (const entry of all) {
    if (entry.ayahs && entry.ayahs.length > 0) {
      valid.push(entry.number);
    } else {
      broken.push(entry.number);
      await db.delete("surahs", entry.number);
    }
  }
  
  return { valid, broken };
}
