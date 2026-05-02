import { openDB, type DBSchema } from "idb";

export interface SyncQueueEntry {
  id?: number;
  table: string;
  operation: "upsert" | "insert";
  payload: Record<string, unknown>;
  onConflict?: string;
  timestamp: number;
  retryCount?: number;
}

export interface BookmarkRecord {
  id: string; // `${ownerKey}|${surah}:${ayah}` — owner-scoped so local records cannot leak across accounts on shared devices
  ownerKey: string; // `"u:"+userId` for signed-in users, `"d:"+deviceId` for anonymous
  surah: number;
  ayah: number;
  ayahText: string;
  surahName: string;
  note: string; // empty string when no note
  bookmarked: boolean; // true when the ayah is explicitly bookmarked
  createdAt: number;
  updatedAt: number;
}

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
      // Stored as Blob since v8 — Blob payloads in IDB are kept off-
      // the JS heap by the browser, which is essential for the
      // streaming download path (Phase B). Legacy v7 rows may still
      // be ArrayBuffer until the v8 upgrade rewrites them; readers
      // should go through `audioByteLength()` / `audioToBlob()`.
      data: Blob | ArrayBuffer;
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
  syncQueue: {
    key: number;
    value: SyncQueueEntry;
  };
  bookmarks: {
    key: string;
    value: BookmarkRecord;
    indexes: { "by-updated": number; "by-owner": string };
  };
}

const DB_NAME = "wise-quran-db";
const DB_VERSION = 8;

/**
 * Broadcast that the on-device offline library changed (surah text or
 * audio added/removed). Surfaces to listeners like the home Offline
 * Library tile so its counters update without a reload. Fire-and-
 * forget; never throws and never blocks the IDB write that triggered it.
 */
export const OFFLINE_CHANGED_EVENT = "wise-offline-changed";

function notifyOfflineChange(): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(OFFLINE_CHANGED_EVENT));
  } catch {
    /* ignore — best-effort notification */
  }
}

/**
 * Returns the byte size of an audio payload, regardless of whether it is
 * still a legacy ArrayBuffer (v7) or a Blob (v8+). All call sites that
 * need a size should go through this helper rather than touching
 * `.byteLength` / `.size` directly.
 */
export function audioByteLength(data: Blob | ArrayBuffer | undefined | null): number {
  if (!data) return 0;
  if (data instanceof Blob) return data.size;
  return data.byteLength;
}

/**
 * Wraps an audio payload as a Blob if it isn't already. Cheap when the
 * input is already a Blob (returned as-is). When given an ArrayBuffer
 * it constructs a single-chunk Blob — the underlying bytes are NOT
 * copied by the browser, only referenced.
 */
export function audioToBlob(data: Blob | ArrayBuffer, mime = "audio/mpeg"): Blob {
  return data instanceof Blob ? data : new Blob([data], { type: mime });
}

function audioKey(reciterId: string, surahNumber: number): string {
  return `${reciterId}-${surahNumber}`;
}

function tafsirKey(editionId: string, surahNumber: number): string {
  return `${editionId}-${surahNumber}`;
}

let dbPromise: ReturnType<typeof openDB<WiseQuranDB>> | null = null;

export const V6_BOOKMARKS_BACKUP_LS_KEY = "wise-bookmarks-v6-backup";

function openDatabase() {
  return openDB<WiseQuranDB>(DB_NAME, DB_VERSION, {
    // NOTE: `idb` awaits the returned promise while keeping the upgrade
    // transaction open, so we can safely read the old `bookmarks` store
    // before deleting it. This is what makes the v6→v7 migration lossless.
    async upgrade(db, oldVersion, _newVersion, transaction) {
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
      if (!db.objectStoreNames.contains("syncQueue")) {
        db.createObjectStore("syncQueue", { keyPath: "id", autoIncrement: true });
      }
      // v6 → v7: reshape bookmarks to be owner-scoped. Copy the FULL v6
      // rows (surah, ayah, ayahText, note, timestamps, …) into
      // localStorage first; only delete the old store after the copy
      // succeeds. The post-boot migration in `bookmarks.ts` rehydrates
      // these rows under the current anonymous owner.
      if (db.objectStoreNames.contains("bookmarks") && oldVersion < 7) {
        // Copy-then-delete: we must have the rows durably in LS
        // before we drop the v6 store. If reading the old rows fails
        // we throw to abort the whole upgrade transaction, which
        // leaves the DB at v6 so the next app load can retry the
        // migration without any data loss in between.
        const oldStore = transaction.objectStore("bookmarks");
        let rows: Array<Record<string, unknown>> = [];
        try {
          rows = (await oldStore.getAll()) as Array<Record<string, unknown>>;
        } catch (err) {
          try {
            localStorage.setItem("wise-bookmarks-v6-migration-error", String(Date.now()));
          } catch {
            /* ignore */
          }
          // Abort the upgrade — any stores we created earlier in this
          // callback are rolled back together with us. The user keeps
          // their v6 bookmarks intact and we try again next session.
          throw err;
        }
        if (rows.length > 0) {
          try {
            localStorage.setItem(V6_BOOKMARKS_BACKUP_LS_KEY, JSON.stringify(rows));
          } catch (err) {
            // Persisting to LS failed (quota?) — same story, abort.
            try {
              localStorage.setItem("wise-bookmarks-v6-migration-error", String(Date.now()));
            } catch {
              /* ignore */
            }
            throw err;
          }
        }
        db.deleteObjectStore("bookmarks");
        try {
          localStorage.removeItem("wise-bookmarks-migrated-v1");
        } catch {
          /* ignore */
        }
      }
      if (!db.objectStoreNames.contains("bookmarks")) {
        const bookmarksStore = db.createObjectStore("bookmarks", { keyPath: "id" });
        bookmarksStore.createIndex("by-updated", "updatedAt");
        bookmarksStore.createIndex("by-owner", "ownerKey");
      }
      // v7 → v8: rewrite legacy ArrayBuffer audio rows as Blobs so Phase
      // B's streaming download path is consistent with what's already
      // stored. We do this lazily by reading and rewriting each row in
      // the upgrade transaction. If a row is already a Blob (from a
      // future-rolled-back DB) we leave it alone. Bytes are NOT copied
      // by `new Blob([buf])` — the browser keeps a reference.
      if (oldVersion < 8 && db.objectStoreNames.contains("audio")) {
        const store = transaction.objectStore("audio");
        for await (const cursor of store.iterate()) {
          const row = cursor.value as { id: string; reciterId: string; surahNumber: number; data: Blob | ArrayBuffer };
          if (row?.data && !(row.data instanceof Blob)) {
            await cursor.update({
              ...row,
              data: new Blob([row.data], { type: "audio/mpeg" }),
            });
          }
        }
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

export async function saveSurah(number: number, ayahs: unknown[]) {
  const db = await getDB();
  await db.put("surahs", { number, ayahs });
  notifyOfflineChange();
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
  notifyOfflineChange();
}

// ── Audio byte tracking ────────────────────────────────────────────────────
// Store the running total in localStorage so getStorageStats() never has to
// load audio ArrayBuffers just to count bytes.
const AUDIO_BYTES_LS_KEY = "wise-audio-bytes-total";

function getTrackedAudioBytes(): number {
  return parseInt(localStorage.getItem(AUDIO_BYTES_LS_KEY) ?? "0", 10) || 0;
}
function addTrackedAudioBytes(n: number) {
  localStorage.setItem(AUDIO_BYTES_LS_KEY, String(getTrackedAudioBytes() + n));
}
function subtractTrackedAudioBytes(n: number) {
  localStorage.setItem(AUDIO_BYTES_LS_KEY, String(Math.max(0, getTrackedAudioBytes() - n)));
}
function resetTrackedAudioBytes() {
  localStorage.removeItem(AUDIO_BYTES_LS_KEY);
}

export async function saveAudio(reciterId: string, surahNumber: number, data: Blob | ArrayBuffer) {
  const db = await getDB();
  const key = audioKey(reciterId, surahNumber);
  // Always store as Blob (v8+). Wrapping an ArrayBuffer is cheap — the
  // browser keeps a reference, no copy. Storing a Blob keeps the
  // payload off the JS heap, which is what enables the streaming
  // download path in `quran-audio.ts` to stay flat in RAM.
  const blob = audioToBlob(data);
  // If overwriting, subtract old size first
  const existing = await db.get("audio", key);
  if (existing) subtractTrackedAudioBytes(audioByteLength(existing.data));
  await db.put("audio", { id: key, reciterId, surahNumber, data: blob });
  addTrackedAudioBytes(blob.size);
  notifyOfflineChange();
}

export async function getAudio(reciterId: string, surahNumber: number) {
  const db = await getDB();
  return db.get("audio", audioKey(reciterId, surahNumber));
}

export async function deleteAudio(reciterId: string, surahNumber: number) {
  const db = await getDB();
  const key = audioKey(reciterId, surahNumber);
  const existing = await db.get("audio", key);
  if (existing) subtractTrackedAudioBytes(audioByteLength(existing.data));
  await db.delete("audio", key);
  notifyOfflineChange();
}

/**
 * Returns downloaded surah numbers for a given reciter using key-only scan
 * (never loads ArrayBuffer data — fast O(n) over keys, not values).
 */
export async function getAllDownloadedAudio(reciterId: string): Promise<number[]> {
  const db = await getDB();
  const prefix = reciterId + "-";
  const allKeys = (await db.getAllKeys("audio")) as string[];
  return allKeys
    .filter((k) => k.startsWith(prefix))
    .map((k) => parseInt(k.slice(prefix.length), 10))
    .filter((n) => !isNaN(n));
}

export async function getAllAudioEntries() {
  const db = await getDB();
  return db.getAll("audio");
}

/**
 * Returns the full Map<reciterId, Set<surahNumber>> of downloaded audio
 * using a key-only scan. Avoids loading any blob/ArrayBuffer payloads
 * into memory — safe to call repeatedly on mobile during long bulk
 * downloads or storage UIs.
 */
export async function getDownloadedAudioMap(): Promise<Map<string, Set<number>>> {
  const db = await getDB();
  const allKeys = (await db.getAllKeys("audio")) as string[];
  const grouped = new Map<string, Set<number>>();
  for (const key of allKeys) {
    // Audio keys are written as `${reciterId}-${surahNumber}` and the
    // surah number is always a pure integer (1..114). Split on the
    // LAST dash so reciter IDs that themselves contain dashes
    // (e.g. "ar.husary-mujawwad") are reconstructed correctly.
    const lastDash = key.lastIndexOf("-");
    if (lastDash <= 0) continue;
    const surahPart = key.slice(lastDash + 1);
    if (!/^\d+$/.test(surahPart)) continue;
    const surahNumber = parseInt(surahPart, 10);
    if (Number.isNaN(surahNumber)) continue;
    const reciterId = key.slice(0, lastDash);
    const set = grouped.get(reciterId) ?? new Set<number>();
    set.add(surahNumber);
    grouped.set(reciterId, set);
  }
  return grouped;
}

export async function clearAllAudio() {
  const db = await getDB();
  await db.clear("audio");
  resetTrackedAudioBytes();
  notifyOfflineChange();
}

/**
 * Scan every audio row and rewrite the LS byte tracker from scratch.
 * Use this when the tracker drifts from reality (e.g. backup restore,
 * crash during save, manual IDB tampering).
 */
export async function recalculateAudioBytes(): Promise<number> {
  const db = await getDB();
  const all = await db.getAll("audio");
  let total = 0;
  for (const row of all) {
    total += audioByteLength(row.data);
  }
  localStorage.setItem(AUDIO_BYTES_LS_KEY, String(total));
  return total;
}

export async function clearAllData() {
  const db = await getDB();
  await db.clear("surahs");
  await db.clear("azkar");
  await db.clear("audio");
  resetTrackedAudioBytes();
  notifyOfflineChange();
}

export async function clearSurahsStore() {
  const db = await getDB();
  await db.clear("surahs");
  notifyOfflineChange();
}

export async function clearAzkarStore() {
  const db = await getDB();
  await db.clear("azkar");
}

export async function clearAllTafsir() {
  const db = await getDB();
  await db.clear("tafsir");
}

/**
 * Targeted deletion helper used by the Phase C "Download for offline"
 * orchestrator to roll back a freshly-warmed tafsir entry when the
 * user cancels mid-download. Best-effort — failures are swallowed
 * since they only affect cache hygiene, not correctness. (For surah
 * text the existing `deleteSurah(number)` above is reused.)
 */
export async function deleteTafsir(editionId: string, surahNumber: number): Promise<void> {
  const db = await getDB();
  await db.delete("tafsir", tafsirKey(editionId, surahNumber));
}

export async function addToSyncQueue(entry: Omit<SyncQueueEntry, "id">): Promise<void> {
  const db = await getDB();
  await db.add("syncQueue", entry as SyncQueueEntry);
}

export async function getAllSyncQueueEntries(): Promise<SyncQueueEntry[]> {
  const db = await getDB();
  return db.getAll("syncQueue");
}

export async function deleteSyncQueueEntry(id: number): Promise<void> {
  const db = await getDB();
  await db.delete("syncQueue", id);
}

export async function getSyncQueueCount(): Promise<number> {
  const db = await getDB();
  return db.count("syncQueue");
}

// ── Bookmarks + Notes ─────────────────────────────────────────────────────
// Bookmarks are owner-scoped: each record carries an `ownerKey`
// (`"u:"+userId` when signed in, `"d:"+deviceId` otherwise) and the IDB
// key is `${ownerKey}|${surah}:${ayah}`. This prevents local records
// from leaking across accounts on shared devices — signing out of one
// account and into another on the same browser only exposes the newly
// signed-in user's records.

export function bookmarkKey(ownerKey: string, surah: number, ayah: number): string {
  return `${ownerKey}|${surah}:${ayah}`;
}

export async function getBookmark(
  ownerKey: string,
  surah: number,
  ayah: number,
): Promise<BookmarkRecord | undefined> {
  const db = await getDB();
  return db.get("bookmarks", bookmarkKey(ownerKey, surah, ayah));
}

export async function putBookmark(record: BookmarkRecord): Promise<void> {
  const db = await getDB();
  await db.put("bookmarks", record);
}

export async function deleteBookmark(
  ownerKey: string,
  surah: number,
  ayah: number,
): Promise<void> {
  const db = await getDB();
  await db.delete("bookmarks", bookmarkKey(ownerKey, surah, ayah));
}

export async function getBookmarksForOwner(ownerKey: string): Promise<BookmarkRecord[]> {
  const db = await getDB();
  return db.getAllFromIndex("bookmarks", "by-owner", ownerKey);
}

export async function getAllBookmarks(): Promise<BookmarkRecord[]> {
  const db = await getDB();
  return db.getAll("bookmarks");
}

export async function clearAllBookmarks(): Promise<void> {
  const db = await getDB();
  await db.clear("bookmarks");
}

export async function clearBookmarksForOwner(ownerKey: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("bookmarks", "readwrite");
  const index = tx.store.index("by-owner");
  for await (const cursor of index.iterate(ownerKey)) {
    await cursor.delete();
  }
  await tx.done;
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

/**
 * Calculate storage usage breakdown.
 *
 * Fast path: audio bytes are read from the localStorage tracker
 * (updated by saveAudio/deleteAudio/clearAllAudio) so we never
 * have to load audio ArrayBuffers just to count bytes.
 * Surah and tafsir text sizes are computed from their (small) JSON.
 */
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

  // Use key-only queries where possible — no data loaded
  const [surahKeys, audioKeys, tafsirKeys] = await Promise.all([
    db.getAllKeys("surahs"),
    db.getAllKeys("audio"),
    db.getAllKeys("tafsir"),
  ]);

  // Surah text: read data only for text size (small JSON, no ArrayBuffers)
  const allSurahs = await db.getAll("surahs");
  let quranText = 0;
  for (const s of allSurahs) {
    quranText += new Blob([JSON.stringify(s)]).size;
  }

  // Audio: read from localStorage tracker — O(1), no IDB data read
  const audio = getTrackedAudioBytes();

  // Tafsir: small JSON, read for size
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
    audioCount: audioKeys.length,
    surahCount: surahKeys.length,
    tafsirCount: tafsirKeys.length,
  };
}

/**
 * Verify that a specific audio file exists and has valid data in IndexedDB
 */
export async function verifyAudioExists(reciterId: string, surahNumber: number): Promise<boolean> {
  try {
    const db = await getDB();
    const entry = await db.get("audio", audioKey(reciterId, surahNumber));
    return !!(entry && audioByteLength(entry.data) > 0);
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
  const deletePromises: Promise<void>[] = [];
  
  for (const entry of reciterAudio) {
    if (audioByteLength(entry.data) > 0) {
      valid.push(entry.surahNumber);
    } else {
      broken.push(entry.surahNumber);
      // Clean up broken entry
      deletePromises.push(db.delete("audio", entry.id));
    }
  }

  if (deletePromises.length > 0) {
    await Promise.all(deletePromises);
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
  const deletePromises: Promise<void>[] = [];
  
  for (const entry of all) {
    if (entry.ayahs && entry.ayahs.length > 0) {
      valid.push(entry.number);
    } else {
      broken.push(entry.number);
      deletePromises.push(db.delete("surahs", entry.number));
    }
  }

  if (deletePromises.length > 0) {
    await Promise.all(deletePromises);
  }
  
  return { valid, broken };
}
