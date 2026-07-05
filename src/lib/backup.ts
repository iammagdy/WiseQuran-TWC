import { getDB, addToSyncQueue, recalculateAudioBytes, saveAudio, audioByteLength, audioToBlob } from "@/lib/db";
import type { SyncQueueEntry } from "@/lib/db";

const WISE_LS_PREFIX = "wise-";
const BACKUP_VERSION = 2;
const SUPPORTED_VERSIONS = [1, 2] as const;
// base64 inflates bytes by ~4/3; applied to audio size estimates.
const BASE64_OVERHEAD = 4 / 3;

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, Math.min(i + chunk, bytes.length))),
    );
  }
  return btoa(binary);
}

function base64ToBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

interface AzkarItem {
  id: string;
  text: string;
  translation: string;
  count: number;
}

interface AzkarEntry {
  category: string;
  items: AzkarItem[];
}

interface SurahEntry {
  number: number;
  ayahs: { number: number; text: string; numberInSurah: number }[];
}

interface TafsirEntry {
  id: string;
  editionId: string;
  surahNumber: number;
  ayahs: { numberInSurah: number; text: string }[];
}

interface AudioEntry {
  id: string;
  reciterId: string;
  surahNumber: number;
  // base64-encoded ArrayBuffer; decoded by restoreBackup.
  data: string;
}

export interface BackupData {
  version: number;
  exportedAt: string;
  localStorage: Record<string, string>;
  idb: {
    azkar: AzkarEntry[];
    syncQueue: SyncQueueEntry[];
    surahCount: number;
    audioCount: number;
    tafsirCount: number;
    // v2+ optional offline content. Audio blobs are base64-encoded
    // inline; large, but the only format that round-trips through
    // JSON without adding a ZIP dependency. Users can choose to
    // exclude audio via the export options.
    surahs?: SurahEntry[];
    tafsir?: TafsirEntry[];
    audio?: AudioEntry[];
  };
}

export interface ExportOptions {
  includeOfflineContent?: boolean;
  includeAudio?: boolean;
}

export interface BackupSizeEstimate {
  totalBytes: number;
  localStorageBytes: number;
  surahsBytes: number;
  tafsirBytes: number;
  audioBytes: number;
  azkarBytes: number;
}

/**
 * Estimates the on-disk size of a backup before export so the UI can
 * warn the user about large archives (especially when audio is
 * included). Does not serialize; counts bytes using IDB metadata and
 * LS string lengths.
 */
export async function estimateBackupSize(options: ExportOptions = {}): Promise<BackupSizeEstimate> {
  let lsBytes = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(WISE_LS_PREFIX)) continue;
    const value = localStorage.getItem(key) ?? "";
    lsBytes += key.length + value.length;
  }

  const db = await getDB();
  const azkar = await db.getAll("azkar");
  const azkarBytes = new Blob([JSON.stringify(azkar)]).size;

  let surahsBytes = 0;
  let tafsirBytes = 0;
  let audioBytes = 0;

  if (options.includeOfflineContent) {
    const surahs = await db.getAll("surahs");
    surahsBytes = new Blob([JSON.stringify(surahs)]).size;
    const tafsir = await db.getAll("tafsir");
    tafsirBytes = new Blob([JSON.stringify(tafsir)]).size;
  }

  if (options.includeAudio) {
    const audioKeys = (await db.getAllKeys("audio")) as string[];
    // Pull each row lazily — byteLength is on the wrapped object, but
    // getAllKeys doesn't give us sizes. Fall back to the LS tracker
    // for an O(1) estimate when available.
    const tracked = parseInt(localStorage.getItem("wise-audio-bytes-total") ?? "0", 10) || 0;
    if (tracked > 0) {
      audioBytes = Math.round(tracked * BASE64_OVERHEAD);
    } else {
      for (const key of audioKeys) {
        const row = await db.get("audio", key);
        if (row?.data) audioBytes += Math.round(audioByteLength(row.data) * BASE64_OVERHEAD);
      }
    }
  }

  return {
    totalBytes: lsBytes + azkarBytes + surahsBytes + tafsirBytes + audioBytes,
    localStorageBytes: lsBytes,
    surahsBytes,
    tafsirBytes,
    audioBytes,
    azkarBytes,
  };
}

export async function exportBackup(options: ExportOptions = {}): Promise<BackupData> {
  const lsData: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(WISE_LS_PREFIX)) {
      lsData[key] = localStorage.getItem(key) ?? "";
    }
  }

  const db = await getDB();

  const azkar = await db.getAll("azkar");
  const syncQueueRaw = await db.getAll("syncQueue");
  const surahCount = await db.count("surahs");
  const audioCount = await db.count("audio");
  const tafsirCount = await db.count("tafsir");

  const syncQueue: SyncQueueEntry[] = syncQueueRaw.map(
    ({ id: _id, ...rest }): SyncQueueEntry => rest as SyncQueueEntry,
  );

  const idb: BackupData["idb"] = {
    azkar,
    syncQueue,
    surahCount,
    audioCount,
    tafsirCount,
  };

  if (options.includeOfflineContent) {
    idb.surahs = await db.getAll("surahs");
    idb.tafsir = await db.getAll("tafsir");
  }

  if (options.includeAudio) {
    const rows = await db.getAll("audio");
    // Audio rows are now Blob-backed (v8 schema). `bufferToBase64`
    // expects an ArrayBuffer, so we materialize each Blob into one
    // here. Legacy ArrayBuffer rows pass through `audioToBlob` as a
    // zero-copy wrap, then `arrayBuffer()` returns the original.
    // Only the JSON export path needs this — the binary `.wqb` path
    // streams Blobs directly without ever touching base64.
    idb.audio = await Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        reciterId: r.reciterId,
        surahNumber: r.surahNumber,
        data: bufferToBase64(await audioToBlob(r.data).arrayBuffer()),
      })),
    );
  }

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    localStorage: lsData,
    idb,
  };
}

export function downloadBackupFile(data: BackupData): void {
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `wise-quran-backup-${dateStr}.json`;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export interface RestoreResult {
  lsKeysRestored: number;
  azkarRestored: number;
  syncQueueRestored: number;
  surahsRestored: number;
  tafsirRestored: number;
  audioRestored: number;
}

function isAzkarEntry(value: unknown): value is AzkarEntry {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.category === "string" && Array.isArray(v.items);
}

function isSurahEntry(value: unknown): value is SurahEntry {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.number === "number" && Array.isArray(v.ayahs);
}

function isTafsirEntry(value: unknown): value is TafsirEntry {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.editionId === "string" &&
    typeof v.surahNumber === "number" &&
    Array.isArray(v.ayahs)
  );
}

function isAudioEntry(value: unknown): value is AudioEntry {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.reciterId === "string" &&
    typeof v.surahNumber === "number" &&
    typeof v.data === "string"
  );
}

export async function restoreBackup(data: BackupData): Promise<RestoreResult> {
  if (!SUPPORTED_VERSIONS.includes(data.version as (typeof SUPPORTED_VERSIONS)[number])) {
    throw new Error(`Unsupported backup version: ${data.version}`);
  }

  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(WISE_LS_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }

  let lsKeysRestored = 0;
  for (const [key, value] of Object.entries(data.localStorage)) {
    if (key.startsWith(WISE_LS_PREFIX)) {
      localStorage.setItem(key, value);
      lsKeysRestored++;
    }
  }

  const db = await getDB();

  let azkarRestored = 0;
  if (Array.isArray(data.idb?.azkar)) {
    await db.clear("azkar");
    for (const entry of data.idb.azkar) {
      if (isAzkarEntry(entry)) {
        await db.put("azkar", entry);
        azkarRestored++;
      }
    }
  }

  let syncQueueRestored = 0;
  if (Array.isArray(data.idb?.syncQueue)) {
    await db.clear("syncQueue");
    for (const entry of data.idb.syncQueue) {
      await addToSyncQueue(entry);
      syncQueueRestored++;
    }
  }

  let surahsRestored = 0;
  if (Array.isArray(data.idb?.surahs)) {
    await db.clear("surahs");
    for (const entry of data.idb.surahs) {
      if (isSurahEntry(entry)) {
        await db.put("surahs", entry);
        surahsRestored++;
      }
    }
  }

  let tafsirRestored = 0;
  if (Array.isArray(data.idb?.tafsir)) {
    await db.clear("tafsir");
    for (const entry of data.idb.tafsir) {
      if (isTafsirEntry(entry)) {
        await db.put("tafsir", entry);
        tafsirRestored++;
      }
    }
  }

  let audioRestored = 0;
  if (Array.isArray(data.idb?.audio)) {
    await db.clear("audio");
    for (const entry of data.idb.audio) {
      if (!isAudioEntry(entry)) continue;
      try {
        const buffer = base64ToBuffer(entry.data);
        await saveAudio(entry.reciterId, entry.surahNumber, buffer);
        audioRestored++;
      } catch {
        // Skip malformed audio entries; keep restoring the rest.
      }
    }
  }

  // The audio byte tracker lives in LS and may have been overwritten
  // by the restored snapshot. Recompute from the actual audio store
  // so storage stats stay accurate.
  await recalculateAudioBytes();

  return {
    lsKeysRestored,
    azkarRestored,
    syncQueueRestored,
    surahsRestored,
    tafsirRestored,
    audioRestored,
  };
}

function validateBackupData(raw: unknown): raw is BackupData {
  if (!raw || typeof raw !== "object") return false;
  const r = raw as Record<string, unknown>;
  if (typeof r.version !== "number") return false;
  if (!SUPPORTED_VERSIONS.includes(r.version as (typeof SUPPORTED_VERSIONS)[number])) return false;
  if (typeof r.exportedAt !== "string") return false;
  if (!r.localStorage || typeof r.localStorage !== "object" || Array.isArray(r.localStorage)) return false;
  if (!r.idb || typeof r.idb !== "object" || Array.isArray(r.idb)) return false;
  const idb = r.idb as Record<string, unknown>;
  if (!Array.isArray(idb.azkar)) return false;
  if (!Array.isArray(idb.syncQueue)) return false;
  if (typeof idb.surahCount !== "number") return false;
  if (typeof idb.audioCount !== "number") return false;
  if (typeof idb.tafsirCount !== "number") return false;
  if (idb.surahs !== undefined && !Array.isArray(idb.surahs)) return false;
  if (idb.tafsir !== undefined && !Array.isArray(idb.tafsir)) return false;
  return true;
}

export function parseBackupFile(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw: unknown = JSON.parse(e.target?.result as string);
        if (!validateBackupData(raw)) {
          reject(new Error("Invalid or incompatible backup file (version mismatch or missing fields)"));
          return;
        }
        resolve(raw);
      } catch {
        reject(new Error("Failed to parse backup file"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

// ---------------------------------------------------------------------------
// Binary (streamed) backup format
// ---------------------------------------------------------------------------
// Layout on disk:
//   [4 bytes]  magic "WQB\0"
//   [4 bytes]  header-length (little-endian uint32)
//   [N bytes]  header JSON (same shape as BackupData, but `idb.audio` is a
//              `audioManifest: Array<{id,reciterId,surahNumber,length}>`)
//   [rest]     concatenated audio buffers, in manifest order
//
// Export assembles a single `Blob` from individual buffer parts — the
// browser streams it to disk without materialising the whole archive
// in memory, which is what makes this safe for hundreds of MB of audio.
// Restore uses `File.slice(...).arrayBuffer()` to pull out each audio
// buffer one at a time, so the restore side is also streaming.

const BINARY_MAGIC = new Uint8Array([0x57, 0x51, 0x42, 0x00]); // "WQB\0"
const BINARY_FORMAT_VERSION = 1;

interface AudioManifestEntry {
  id: string;
  reciterId: string;
  surahNumber: number;
  length: number;
}

interface BinaryBackupHeader {
  magicVersion: number;
  version: number;
  exportedAt: string;
  localStorage: Record<string, string>;
  idb: {
    azkar: AzkarEntry[];
    syncQueue: SyncQueueEntry[];
    surahCount: number;
    audioCount: number;
    tafsirCount: number;
    surahs?: SurahEntry[];
    tafsir?: TafsirEntry[];
    audioManifest: AudioManifestEntry[];
  };
}

function u32ToBytes(n: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, n >>> 0, true);
  return out;
}

function bytesToU32(bytes: Uint8Array): number {
  return new DataView(bytes.buffer, bytes.byteOffset, 4).getUint32(0, true);
}

export async function exportBackupBinary(options: ExportOptions = {}): Promise<Blob> {
  const lsData: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(WISE_LS_PREFIX)) continue;
    const value = localStorage.getItem(key);
    if (value !== null) lsData[key] = value;
  }

  const db = await getDB();
  const azkar = await db.getAll("azkar");
  const syncQueue = await db.getAll("syncQueue");
  const surahCount = await db.count("surahs");
  const audioCount = await db.count("audio");
  const tafsirCount = await db.count("tafsir");

  const idb: BinaryBackupHeader["idb"] = {
    azkar,
    syncQueue,
    surahCount,
    audioCount,
    tafsirCount,
    audioManifest: [],
  };
  if (options.includeOfflineContent) {
    idb.surahs = await db.getAll("surahs");
    idb.tafsir = await db.getAll("tafsir");
  }

  // Collect each row's audio as a Blob so the final concatenation
  // happens lazily — `new Blob([header, ...blobs])` keeps references
  // to each part rather than copying the bytes into a contiguous JS
  // buffer. This keeps export memory flat even with many GB of audio.
  const audioBlobs: Blob[] = [];
  if (options.includeAudio) {
    const rows = await db.getAll("audio");
    for (const r of rows) {
      const size = audioByteLength(r.data);
      idb.audioManifest.push({
        id: r.id,
        reciterId: r.reciterId,
        surahNumber: r.surahNumber,
        length: size,
      });
      audioBlobs.push(audioToBlob(r.data));
    }
  }

  const header: BinaryBackupHeader = {
    magicVersion: BINARY_FORMAT_VERSION,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    localStorage: lsData,
    idb,
  };

  const headerBytes = new TextEncoder().encode(JSON.stringify(header));
  const parts: BlobPart[] = [BINARY_MAGIC, u32ToBytes(headerBytes.byteLength), headerBytes, ...audioBlobs];
  return new Blob(parts, { type: "application/octet-stream" });
}

export function downloadBackupBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function readBinaryHeader(file: File | Blob): Promise<{ header: BinaryBackupHeader; bodyOffset: number } | null> {
  // We only read the first few KB to parse the header — no need to
  // materialise the audio body. Header size is bounded by the JSON
  // text containing only metadata (surahs/tafsir may be bulky, so
  // we read them on demand by slicing enough bytes).
  if (file.size < 8) return null;
  const preludeBytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  for (let i = 0; i < 4; i++) {
    if (preludeBytes[i] !== BINARY_MAGIC[i]) return null;
  }
  const headerLen = bytesToU32(preludeBytes.slice(4, 8));
  if (!Number.isFinite(headerLen) || headerLen <= 0 || headerLen > 256 * 1024 * 1024) return null;
  const headerBytes = new Uint8Array(await file.slice(8, 8 + headerLen).arrayBuffer());
  const header = JSON.parse(new TextDecoder().decode(headerBytes)) as BinaryBackupHeader;
  return { header, bodyOffset: 8 + headerLen };
}

async function restoreBinaryBackup(file: File | Blob, header: BinaryBackupHeader, bodyOffset: number): Promise<RestoreResult> {
  if (!SUPPORTED_VERSIONS.includes(header.version as (typeof SUPPORTED_VERSIONS)[number])) {
    throw new Error(`Unsupported backup version: ${header.version}`);
  }

  // Reuse the JSON restore for everything except audio.
  const jsonShape: BackupData = {
    version: header.version,
    exportedAt: header.exportedAt,
    localStorage: header.localStorage,
    idb: {
      azkar: header.idb.azkar,
      syncQueue: header.idb.syncQueue,
      surahCount: header.idb.surahCount,
      audioCount: header.idb.audioCount,
      tafsirCount: header.idb.tafsirCount,
      surahs: header.idb.surahs,
      tafsir: header.idb.tafsir,
      audio: undefined, // restored separately below, streaming
    },
  };
  const base = await restoreBackup(jsonShape);

  let audioRestored = 0;
  if (Array.isArray(header.idb.audioManifest) && header.idb.audioManifest.length > 0) {
    const db = await getDB();
    await db.clear("audio");
    let cursor = bodyOffset;
    for (const entry of header.idb.audioManifest) {
      if (!entry || typeof entry.length !== "number" || entry.length < 0) {
        cursor += Number(entry?.length) > 0 ? Number(entry.length) : 0;
        continue;
      }
      try {
        // `file.slice(...)` returns a Blob view backed by the original
        // file — no bytes are read into JS memory until consumed. We
        // hand that Blob straight to `saveAudio`, which stores it in
        // IDB without ever materialising the full payload on the heap.
        const slice = file.slice(cursor, cursor + entry.length, "audio/mpeg");
        await saveAudio(entry.reciterId, entry.surahNumber, slice);
        audioRestored++;
      } catch {
        // Skip this entry but keep streaming subsequent ones.
      }
      cursor += entry.length;
    }
    await recalculateAudioBytes();
  }

  return { ...base, audioRestored: base.audioRestored + audioRestored };
}

/**
 * Single entry point for restore. Detects binary vs JSON and handles
 * each without materialising the full archive in memory.
 */
export async function restoreBackupFromFile(file: File): Promise<RestoreResult> {
  const binary = await readBinaryHeader(file);
  if (binary) {
    return restoreBinaryBackup(file, binary.header, binary.bodyOffset);
  }
  // Fall back to legacy JSON.
  const parsed = await parseBackupFile(file);
  return restoreBackup(parsed);
}
