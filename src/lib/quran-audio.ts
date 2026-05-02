import { saveAudio, getAudio, deleteAudio, checkStorageQuota, getAllAudioEntries, audioByteLength, audioToBlob } from "./db";
import { getReciterAudioUrls, getReciterAudioUrl } from "./reciters";
import { logger } from "./logger";
import { audioDebugLog } from "./audio-debug-log";

const MIN_AUDIO_SIZE = 10_240; // 10KB minimum
const MAGIC_PROBE_SIZE = 50;

/**
 * Validate that a buffer contains actual MP3/audio data by checking magic bytes.
 */
export function isValidAudioFile(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 4) return false;
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) return true;
  if (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0) return true;
  if (bytes[0] === 0x4F && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) return true;
  const textStart = new TextDecoder().decode(bytes.slice(0, MAGIC_PROBE_SIZE)).trim().toLowerCase();
  if (textStart.startsWith("<!doctype") || textStart.startsWith("<html") || textStart.startsWith("<head")) return false;
  return true;
}

/**
 * Blob-aware variant of {@link isValidAudioFile}. Slices only the first
 * 50 bytes off the Blob (cheap — does not materialize the whole payload
 * in RAM) and runs the magic-byte check on those.
 */
export async function isValidAudioBlob(blob: Blob): Promise<boolean> {
  if (blob.size < 4) return false;
  const head = await blob.slice(0, MAGIC_PROBE_SIZE).arrayBuffer();
  return isValidAudioFile(head);
}

/**
 * Try to get a playable audio source for a surah.
 */
export async function resolveAudioSource(
  reciterId: string,
  surahNumber: number
): Promise<{ url: string; cached: boolean } | null> {
  const cached = await getAudio(reciterId, surahNumber);
  if (cached) {
    // `cached.data` is a Blob since v8 of the IDB schema, but legacy
    // ArrayBuffer rows are normalized by `audioToBlob` (no copy).
    const blob = audioToBlob(cached.data);
    return { url: URL.createObjectURL(blob), cached: true };
  }

  if (navigator.onLine) {
    const url = await getReciterAudioUrl(reciterId, surahNumber);
    return { url, cached: false };
  }

  return null;
}

/**
 * Fetch audio from a URL and return a `Blob`.
 *
 * The streaming path appends each network chunk into a growing `Blob`
 * (`new Blob([prev, chunk])`). Modern browsers implement that
 * composition lazily — they keep a reference to the previous Blob's
 * bytes rather than copying them — so peak JS-heap RAM during the
 * download stays in the single-digit-MB range even for ~80 MB
 * recitations like Al-Baqarah. Without this, the previous
 * `Uint8Array[]` + final merge would briefly hold ~2× the file size
 * in heap.
 *
 * Progress is reported when `Content-Length` is present.
 *
 * NOTE: We intentionally use `mode: "cors"` here, even though some of
 * the CDNs we play from look like they might not support CORS. They
 * actually all do — empirically tested in v3.9.4 — so we get the full
 * streaming/progress/Content-Type benefits. `mode: "no-cors"` would
 * give us an opaque response whose `body` is null and whose `blob()`
 * returns an empty Blob (per the Fetch spec), which silently breaks
 * downloads.
 */
export async function fetchAudioFromUrl(
  url: string,
  onProgress?: (pct: number) => void,
  externalSignal?: AbortSignal,
): Promise<Blob> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90_000);
  const onExternalAbort = () => controller.abort();
  externalSignal?.addEventListener("abort", onExternalAbort);

  try {
    const res = await fetch(url, { signal: controller.signal, mode: "cors" });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const contentType = res.headers.get("Content-Type") || "audio/mpeg";
    if (contentType.includes("text/html")) {
      throw new Error("Server returned HTML instead of audio");
    }
    const blobType = contentType.startsWith("audio/") ? contentType : "audio/mpeg";

    const contentLength = Number(res.headers.get("Content-Length") || 0);
    const reader = res.body?.getReader();

    // Streaming path with progress.
    if (reader && contentLength > 0) {
      let blob = new Blob([], { type: blobType });
      let received = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          // Compose lazily — browser keeps refs, no byte copy.
          blob = new Blob([blob, value], { type: blobType });
          received += value.length;
          onProgress?.(Math.round((received / contentLength) * 100));
        }
      } catch (err) {
        // On cancel/abort, release the in-flight reader so the
        // underlying connection can shut down cleanly.
        try {
          await reader.cancel();
        } catch (cancelErr) {
          audioDebugLog(
            "quran-audio.fetchAudioFromUrl:readerCancelFailed",
            { urlPreview: url.slice(0, 80) },
            cancelErr,
          );
        }
        audioDebugLog(
          "quran-audio.fetchAudioFromUrl:streamError",
          { urlPreview: url.slice(0, 80) },
          err,
        );
        throw err;
      }
      return blob;
    }

    // Fallback: no Content-Length / no streaming reader available.
    // `res.blob()` is just as memory-friendly as the streaming path
    // and still avoids a second buffer allocation.
    const blob = await res.blob();
    onProgress?.(100);
    return blob.type ? blob : new Blob([blob], { type: blobType });
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  } finally {
    externalSignal?.removeEventListener("abort", onExternalAbort);
  }
}

/**
 * Download surah audio trying multiple URLs with comprehensive verification.
 * Returns the size in bytes of the downloaded audio.
 */
/** ~4 MB — chosen to be larger than typical TCP receive bursts so the
 * IDB write rate stays well under one transaction per second, while
 * still bounding the in-flight Blob to a small fraction of the full
 * file. */
const STREAM_FLUSH_BYTES = 4 * 1024 * 1024;

/**
 * Stream-download a surah recitation directly into IndexedDB.
 *
 * Unlike a buffer-then-save approach, this version periodically calls
 * `saveAudio` with the *growing* Blob as new network chunks arrive.
 * Combined with lazy Blob composition, that means:
 *  - Peak JS-heap pressure stays in the single-digit MB range even
 *    for ~80 MB recitations (Al-Baqarah).
 *  - If the user closes the tab mid-download, IDB already holds the
 *    bytes received so far (a final integrity check on the next visit
 *    can keep or drop them).
 *  - Aborting via `signal` cancels the in-flight fetch *and* deletes
 *    any partial row, so cancelled downloads never leave half-written
 *    audio behind.
 */
export async function downloadSurahAudio(
  reciterId: string,
  surahNumber: number,
  onProgress?: (pct: number) => void,
  signal?: AbortSignal,
): Promise<number> {
  const storageCheck = await checkStorageQuota();

  if (storageCheck.percentUsed > 95) {
    throw new Error("مساحة التخزين ممتلئة تقريباً. يرجى حذف بعض البيانات أولاً");
  }

  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  const urls = await getReciterAudioUrls(reciterId, surahNumber);
  let lastError: Error | null = null;

  for (let i = 0; i < urls.length; i++) {
    if (signal?.aborted) {
      await deleteAudio(reciterId, surahNumber).catch((err) =>
        audioDebugLog(
          "quran-audio.downloadSurahAudio:deleteOnAbortFailed",
          { reciterId, surahNumber },
          err,
        ),
      );
      throw new DOMException("Aborted", "AbortError");
    }
    try {
      logger.debug(`[audio-dl] trying source ${i + 1}/${urls.length}: ${urls[i].substring(0, 80)}...`);
      const blob = await streamAudioToIdb(
        urls[i],
        reciterId,
        surahNumber,
        storageCheck,
        onProgress,
        signal,
      );
      const blobSize = blob.size;

      if (blobSize < MIN_AUDIO_SIZE) {
        logger.warn(`[audio-dl] source ${i + 1} too small (${blobSize}B), skipping`);
        audioDebugLog("quran-audio.downloadSurahAudio:tooSmall", {
          reciterId,
          surahNumber,
          blobSize,
          sourceIndex: i,
        });
        await deleteAudio(reciterId, surahNumber).catch((err) =>
          audioDebugLog(
            "quran-audio.downloadSurahAudio:deleteOnTooSmallFailed",
            { reciterId, surahNumber },
            err,
          ),
        );
        continue;
      }

      // Final magic-byte check on the persisted row.
      const verified = await getAudio(reciterId, surahNumber);
      const verifiedSize = audioByteLength(verified?.data);
      if (!verified || verifiedSize < MIN_AUDIO_SIZE) {
        await deleteAudio(reciterId, surahNumber);
        throw new Error("فشل التحقق من حفظ الصوت في التخزين المحلي");
      }

      const verifiedBlob = audioToBlob(verified.data);
      if (!(await isValidAudioBlob(verifiedBlob))) {
        await deleteAudio(reciterId, surahNumber);
        throw new Error("الملف المحفوظ تالف أو غير صالح");
      }

      onProgress?.(100);
      logger.debug(`[audio-dl] ✓ streamed surah ${surahNumber} (${formatBytes(blobSize)})`);
      return blobSize;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      // Propagate aborts immediately — don't try the next mirror.
      if (err.name === "AbortError") {
        await deleteAudio(reciterId, surahNumber).catch((delErr) =>
          audioDebugLog(
            "quran-audio.downloadSurahAudio:deleteOnAbortFailed",
            { reciterId, surahNumber },
            delErr,
          ),
        );
        throw err;
      }
      lastError = err;
      logger.warn(`[audio-dl] source ${i + 1} failed:`, lastError.message);
      audioDebugLog(
        "quran-audio.downloadSurahAudio:sourceFailed",
        { reciterId, surahNumber, sourceIndex: i },
        err,
      );
      onProgress?.(0);
      await deleteAudio(reciterId, surahNumber).catch((delErr) =>
        audioDebugLog(
          "quran-audio.downloadSurahAudio:deleteOnSourceFailFailed",
          { reciterId, surahNumber },
          delErr,
        ),
      );
    }
  }

  throw new Error(`فشل تحميل الصوت من جميع المصادر: ${lastError?.message ?? "خطأ غير معروف"}`);
}

/**
 * Inner streaming loop. Fetches `url`, validates the first chunk's
 * magic bytes, and incrementally `saveAudio`s the growing Blob to
 * IDB. Returns the final accumulated Blob.
 */
async function streamAudioToIdb(
  url: string,
  reciterId: string,
  surahNumber: number,
  storageCheck: { hasEnoughSpace: (bytes: number) => boolean },
  onProgress: ((pct: number) => void) | undefined,
  signal: AbortSignal | undefined,
): Promise<Blob> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90_000);
  const onExternalAbort = () => controller.abort();
  signal?.addEventListener("abort", onExternalAbort);

  try {
    const res = await fetch(url, { signal: controller.signal, mode: "cors" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const contentType = res.headers.get("Content-Type") || "audio/mpeg";
    if (contentType.includes("text/html")) {
      throw new Error("Server returned HTML instead of audio");
    }
    const blobType = contentType.startsWith("audio/") ? contentType : "audio/mpeg";
    const contentLength = Number(res.headers.get("Content-Length") || 0);
    const reader = res.body?.getReader();

    let blob = new Blob([], { type: blobType });
    let received = 0;
    let bytesSinceFlush = 0;
    let validated = false;

    const flush = async () => {
      try {
        await saveAudio(reciterId, surahNumber, blob);
        bytesSinceFlush = 0;
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "QuotaExceededError") {
          throw new Error("تم تجاوز حد التخزين المسموح. يرجى حذف بعض الملفات");
        }
        throw e;
      }
    };

    if (reader) {
      try {
        while (true) {
          if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
          const { done, value } = await reader.read();
          if (done) break;
          blob = new Blob([blob, value], { type: blobType });
          received += value.length;
          bytesSinceFlush += value.length;

          // Cheap up-front validation on the first chunk to bail out
          // of HTML 404 pages before we waste the whole download.
          if (!validated && blob.size >= 4) {
            validated = true;
            if (!(await isValidAudioBlob(blob))) {
              throw new Error("Source did not return audio data");
            }
          }

          // Storage-quota guard recomputed against accumulated size.
          if (!storageCheck.hasEnoughSpace(received)) {
            throw new Error("مساحة التخزين غير كافية لحفظ هذا الملف");
          }

          if (contentLength > 0) {
            onProgress?.(Math.round((received / contentLength) * 100));
          }

          if (bytesSinceFlush >= STREAM_FLUSH_BYTES) await flush();
        }
      } catch (err) {
        try {
          await reader.cancel();
        } catch (cancelErr) {
          audioDebugLog(
            "quran-audio.streamAudioToIdb:readerCancelFailed",
            { reciterId, surahNumber },
            cancelErr,
          );
        }
        audioDebugLog(
          "quran-audio.streamAudioToIdb:streamError",
          { reciterId, surahNumber },
          err,
        );
        throw err;
      }
    } else {
      // No streaming reader — fall back to a single Blob fetch but
      // still go through `saveAudio` so the storage path stays
      // identical.
      const fallback = await res.blob();
      blob = fallback.type ? fallback : new Blob([fallback], { type: blobType });
      received = blob.size;
      validated = await isValidAudioBlob(blob);
      if (!validated) throw new Error("Source did not return audio data");
      if (!storageCheck.hasEnoughSpace(received)) {
        throw new Error("مساحة التخزين غير كافية لحفظ هذا الملف");
      }
      onProgress?.(100);
    }

    // Final flush: persist whatever we accumulated since the last
    // periodic write.
    await flush();
    return blob;
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", onExternalAbort);
  }
}

/**
 * Auto-cache audio after successful playback.
 */
export async function cachePlayingAudio(
  reciterId: string,
  surahNumber: number,
  audioUrl: string
): Promise<void> {
  const existing = await getAudio(reciterId, surahNumber);
  if (existing) return;

  try {
    const res = await fetch(audioUrl, { mode: "cors" });
    if (!res.ok) return;

    const contentType = res.headers.get("Content-Type") || "";
    if (contentType.includes("text/html")) return;

    // Pull the response straight into a Blob — `res.blob()` streams
    // and stays off the JS heap, so even Al-Baqarah-sized recitations
    // don't spike memory during background auto-caching.
    const blob = await res.blob();
    if (blob.size < MIN_AUDIO_SIZE) return;
    if (!(await isValidAudioBlob(blob))) return;

    await saveAudio(reciterId, surahNumber, blob);
    logger.debug(`[auto-cache] cached surah ${surahNumber} (${formatBytes(blob.size)})`);
  } catch (err) {
    // Silent fail — caching is best-effort, but record the failure so
    // a class of "audio plays but never caches for offline" reports
    // shows up in the diagnostics buffer.
    audioDebugLog(
      "quran-audio.cachePlayingAudio:error",
      { reciterId, surahNumber },
      err,
    );
  }
}

/**
 * Verify all downloaded audio files and repair/remove corrupted ones.
 * Returns a report of the verification process.
 */
export async function verifyAndRepairDownloads(
  reciterId: string,
  onProgress?: (current: number, total: number, surahNumber: number) => void
): Promise<{
  valid: number[];
  corrupted: number[];
  repaired: number[];
}> {
  const allAudio = await getAllAudioEntries();
  const reciterAudio = allAudio.filter((a) => a.reciterId === reciterId);

  const valid: number[] = [];
  const corrupted: number[] = [];

  for (let i = 0; i < reciterAudio.length; i++) {
    const audio = reciterAudio[i];
    onProgress?.(i + 1, reciterAudio.length, audio.surahNumber);

    try {
      const size = audioByteLength(audio.data);
      if (size < MIN_AUDIO_SIZE) {
        logger.warn(`[verify] surah ${audio.surahNumber}: too small (${size}B)`);
        corrupted.push(audio.surahNumber);
        await deleteAudio(reciterId, audio.surahNumber);
        continue;
      }

      const blob = audioToBlob(audio.data);
      if (!(await isValidAudioBlob(blob))) {
        logger.warn(`[verify] surah ${audio.surahNumber}: invalid audio format`);
        corrupted.push(audio.surahNumber);
        await deleteAudio(reciterId, audio.surahNumber);
        continue;
      }

      if (blob.size < MIN_AUDIO_SIZE) {
        logger.warn(`[verify] surah ${audio.surahNumber}: blob creation failed`);
        corrupted.push(audio.surahNumber);
        await deleteAudio(reciterId, audio.surahNumber);
        continue;
      }

      const url = URL.createObjectURL(blob);
      URL.revokeObjectURL(url);

      valid.push(audio.surahNumber);
      logger.debug(`[verify] surah ${audio.surahNumber}: ✓ valid (${formatBytes(size)})`);
    } catch (e) {
      console.error(`[verify] surah ${audio.surahNumber}: error during verification`, e);
      audioDebugLog(
        "quran-audio.verifyAndRepairDownloads:verifyFailed",
        { reciterId, surahNumber: audio.surahNumber },
        e,
      );
      corrupted.push(audio.surahNumber);
      await deleteAudio(reciterId, audio.surahNumber).catch((delErr) =>
        audioDebugLog(
          "quran-audio.verifyAndRepairDownloads:deleteFailed",
          { reciterId, surahNumber: audio.surahNumber },
          delErr,
        ),
      );
    }
  }

  return {
    valid,
    corrupted,
    repaired: [],
  };
}

/** Format bytes to a human-readable Arabic string */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
