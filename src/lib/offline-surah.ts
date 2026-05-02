import { downloadSurahAudio, formatBytes } from "./quran-audio";
import { fetchSurahAyahs } from "./quran-api";
import { fetchTafsir } from "./tafsir-api";
import {
  getSurah,
  getAudio,
  getTafsir,
  audioByteLength,
  deleteSurah,
  deleteTafsir,
  saveTafsir,
} from "./db";
/**
 * Phase C "Download for offline" orchestrator.
 *
 * One call to {@link downloadSurahForOffline} fans out to:
 *  - Mushaf text (cached in IDB by `fetchSurahAyahs`).
 *  - Tafsir for the user's selected edition, when it's one of the
 *    bundled offline editions (the API-only editions are paywalled
 *    behind a per-request auth header and aren't cacheable here).
 *  - Audio for the user's selected reciter via the existing streaming
 *    download path so peak heap pressure stays flat on long surahs.
 *
 * Reports a single 0–100 progress number so the caller can show one
 * unified progress bar instead of three. The audio dominates the
 * total so we weight it as ~80% of the bar; text + tafsir are quick
 * and share the remaining 20%.
 *
 * Aborting via `signal` cancels the in-flight audio fetch (text and
 * tafsir requests are themselves quick enough that we let them
 * resolve, but the function will then throw `AbortError` before any
 * post-cleanup runs).
 */
export interface OfflineDownloadResult {
  audioBytes: number;
  textCached: boolean;
  tafsirCached: boolean;
  /** Sum of audio + a coarse estimate of text/tafsir size. */
  totalBytes: number;
}

export async function downloadSurahForOffline(args: {
  surahNumber: number;
  reciterId: string;
  tafsirId: string;
  onProgress?: (pct: number) => void;
  signal?: AbortSignal;
}): Promise<OfflineDownloadResult> {
  const { surahNumber, reciterId, tafsirId, onProgress, signal } = args;

  // Weights chosen to keep the bar perceptually smooth: ~10% for
  // mushaf text, ~10% for tafsir, ~80% for audio.
  const TEXT_WEIGHT = 10;
  const TAFSIR_WEIGHT = 10;
  const AUDIO_WEIGHT = 80;

  let unifiedPct = 0;
  const report = (pct: number) => {
    unifiedPct = Math.max(unifiedPct, Math.min(100, Math.round(pct)));
    onProgress?.(unifiedPct);
  };

  // Track which entries we *freshly* cached during this run so an
  // AbortError can roll them back. We only delete entries that
  // weren't already in IDB before this download — otherwise a cancel
  // would delete cached data the user already had.
  const hadTextBefore = !!(await getSurah(surahNumber));
  const hadTafsirBefore = !!(await getTafsir(tafsirId, surahNumber));
  let freshlyCachedText = false;
  let freshlyCachedTafsir = false;

  const rollback = async () => {
    if (freshlyCachedText && !hadTextBefore) {
      try { await deleteSurah(surahNumber); } catch { /* ignore */ }
    }
    if (freshlyCachedTafsir && !hadTafsirBefore) {
      try { await deleteTafsir(tafsirId, surahNumber); } catch { /* ignore */ }
    }
  };

  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  // 1) Mushaf text — required. We must not claim "saved offline" if the
  // user can't read the surah; surface the failure to the caller. The
  // existing `fetchSurahAyahs` writes to IDB on success, so on success
  // we mark `freshlyCachedText` for rollback bookkeeping.
  let textCached = false;
  try {
    await fetchSurahAyahs(surahNumber, signal);
    textCached = true;
    if (!hadTextBefore) freshlyCachedText = true;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      await rollback();
      throw err;
    }
    await rollback();
    throw new Error(
      `Failed to download surah ${surahNumber} text: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  report(TEXT_WEIGHT);
  if (signal?.aborted) {
    await rollback();
    throw new DOMException("Aborted", "AbortError");
  }

  // 2) Tafsir — required for the user's selected edition regardless of
  // whether it's bundled-offline or API-only. `fetchTafsir` already
  // handles both cases (loads from bundled JSON or hits the API and
  // writes to IDB). We await it + an explicit `saveTafsir` so that
  // (a) bundled editions (whose `loadOfflineTafsirSurah` writes are
  // fire-and-forget) get a deterministic write barrier here, and
  // (b) cancel rollback can never race a still-in-flight persistence.
  let tafsirCached = false;
  try {
    const ayahs = await fetchTafsir(surahNumber, tafsirId, signal);
    await saveTafsir(tafsirId, surahNumber, ayahs);
    tafsirCached = true;
    if (!hadTafsirBefore) freshlyCachedTafsir = true;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      await rollback();
      throw err;
    }
    await rollback();
    throw new Error(
      `Failed to download tafsir for surah ${surahNumber}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  report(TEXT_WEIGHT + TAFSIR_WEIGHT);
  if (signal?.aborted) {
    await rollback();
    throw new DOMException("Aborted", "AbortError");
  }

  // 3) Audio — biggest payload by orders of magnitude. The streaming
  // download already saves to IDB incrementally so cancellation cleans
  // up partial audio rows.
  let audioBytes = 0;
  try {
    audioBytes = await downloadSurahAudio(
      reciterId,
      surahNumber,
      (pct) => report(TEXT_WEIGHT + TAFSIR_WEIGHT + (pct / 100) * AUDIO_WEIGHT),
      signal,
    );
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      // Roll back any text/tafsir we warmed in this run so the user
      // doesn't end up with a partially-cached surah after cancel.
      await rollback();
      throw err;
    }
    // Surface the non-abort audio failure but still roll back fresh
    // partial caches so a retry starts from a clean slate.
    await rollback();
    throw err;
  }

  report(100);

  // Coarse text/tafsir size estimate from the just-cached IDB rows.
  let textBytes = 0;
  let tafsirBytes = 0;
  if (textCached) {
    try {
      const row = await getSurah(surahNumber);
      if (row) textBytes = new Blob([JSON.stringify(row)]).size;
    } catch { /* ignore */ }
  }
  if (tafsirCached) {
    try {
      const row = await getTafsir(tafsirId, surahNumber);
      if (row) tafsirBytes = new Blob([JSON.stringify(row)]).size;
    } catch { /* ignore */ }
  }

  return {
    audioBytes,
    textCached,
    tafsirCached,
    totalBytes: audioBytes + textBytes + tafsirBytes,
  };
}

/**
 * Cheap "is this surah already fully offline for the given
 * reciter / tafsir choice?" check used to render the download
 * button's idle vs done state without spinning up a download.
 */
export async function isSurahFullyOffline(args: {
  surahNumber: number;
  reciterId: string;
  tafsirId: string;
}): Promise<boolean> {
  const { surahNumber, reciterId, tafsirId } = args;
  try {
    const [text, audio, tafsirRow] = await Promise.all([
      getSurah(surahNumber),
      getAudio(reciterId, surahNumber),
      getTafsir(tafsirId, surahNumber),
    ]);
    const hasText = !!(text && text.ayahs && text.ayahs.length > 0);
    const hasAudio = !!(audio && audioByteLength(audio.data) > 10_000);
    const hasTafsir = !!(tafsirRow && Array.isArray(tafsirRow.ayahs) && tafsirRow.ayahs.length > 0);
    return hasText && hasAudio && hasTafsir;
  } catch {
    return false;
  }
}

export { formatBytes };
