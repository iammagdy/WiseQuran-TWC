import { addToSyncQueue, getAllSyncQueueEntries, deleteSyncQueueEntry, getSyncQueueCount } from "./db";
import { isSupabaseConfigured, supabase } from "./supabase";
import { logger } from "./logger";

export { getSyncQueueCount };

// ─── Queue change notifications ──────────────────────────────────────────────
type RefreshCallback = () => void;
const changeListeners = new Set<RefreshCallback>();

export function subscribeToQueueChanges(cb: RefreshCallback): () => void {
  changeListeners.add(cb);
  return () => changeListeners.delete(cb);
}

function notifyQueueChanged(): void {
  changeListeners.forEach((cb) => cb());
}

// ─── Error classification ─────────────────────────────────────────────────────

/** Returns true when a Supabase result error looks like a transient network or server problem. */
function isRetriableError(err: { message?: string; status?: number } | null): boolean {
  if (!err) return false;
  if (!navigator.onLine) return true;
  if (typeof err.status === "number" && err.status >= 500) return true;
  const msg = (err.message ?? "").toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("network request failed") ||
    msg.includes("networkerror") ||
    msg.includes("load failed") ||
    msg.includes("timeout")
  );
}

/** Returns true when a thrown exception is a network connectivity failure. */
function isThrownNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes("failed to fetch") ||
      msg.includes("network request failed") ||
      msg.includes("networkerror") ||
      msg.includes("load failed") ||
      msg.includes("the internet connection appears to be offline")
    );
  }
  return err instanceof Error && err.name === "AbortError";
}

// ─── Core helpers ─────────────────────────────────────────────────────────────

async function persistToQueue(
  table: string,
  operation: "upsert" | "insert",
  payload: Record<string, unknown>,
  onConflict?: string
): Promise<void> {
  try {
    await addToSyncQueue({ table, operation, payload, onConflict, timestamp: Date.now() });
    notifyQueueChanged();
    // Phase C: ask the SW to fire `sync` when connectivity returns,
    // so the queue drains even if the tab is closed at the time the
    // network comes back. Silently no-ops on browsers without
    // Background Sync — `useSyncQueue.ts` still flushes on the
    // existing online/visibility events as a fallback.
    void registerBackgroundSync();
  } catch (queueErr) {
    logger.warn("[syncQueue] Failed to persist entry:", queueErr);
  }
}

// ─── Service-worker auth handoff (Phase C closed-tab flush) ─────────────────
//
// The SW drains the offline write queue directly via PostgREST when
// connectivity returns while the tab is closed. To do that it needs
// the Supabase URL, anon key, and current user access token. We
// persist these in a Cache entry the SW can read; the page calls
// `persistSwAuth(session)` on every auth state change, and
// `clearSwAuth()` on sign-out. Failures are best-effort: if the SW
// can't read the blob it simply throws and the existing page-side
// flush keeps doing its job.
const SW_AUTH_CACHE = "wise-sw-auth-v1";
const SW_AUTH_REQUEST_URL = "/__wise_sw_auth__";

interface SwAuthBlob {
  url: string;
  anonKey: string;
  accessToken: string;
  /** Unix ms when the access token expires (best-effort upper bound). */
  expiresAt: number;
}

export async function persistSwAuth(args: {
  accessToken: string | null | undefined;
  expiresAtSeconds?: number | null;
}): Promise<void> {
  if (typeof caches === "undefined") return;
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";
  if (!url || !anonKey || !args.accessToken) {
    await clearSwAuth();
    return;
  }
  const expiresAt =
    typeof args.expiresAtSeconds === "number" && Number.isFinite(args.expiresAtSeconds)
      ? args.expiresAtSeconds * 1000
      : Date.now() + 60 * 60 * 1000; // assume 1h if Supabase didn't tell us
  const blob: SwAuthBlob = { url, anonKey, accessToken: args.accessToken, expiresAt };
  try {
    const cache = await caches.open(SW_AUTH_CACHE);
    await cache.put(
      SW_AUTH_REQUEST_URL,
      new Response(JSON.stringify(blob), {
        headers: { "Content-Type": "application/json" },
      }),
    );
  } catch {
    /* best-effort */
  }
}

export async function clearSwAuth(): Promise<void> {
  if (typeof caches === "undefined") return;
  try {
    const cache = await caches.open(SW_AUTH_CACHE);
    await cache.delete(SW_AUTH_REQUEST_URL);
  } catch {
    /* ignore */
  }
}

/**
 * Best-effort Background Sync registration. Returns true when the
 * browser accepted the registration (Chromium, Edge, Samsung Internet
 * with the PWA installed); false otherwise — Safari and Firefox both
 * fall into the false branch and the regular online/visibility-event
 * flush in `useSyncQueue.ts` does the work.
 */
export async function registerBackgroundSync(): Promise<boolean> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return false;
  try {
    const reg = (await navigator.serviceWorker.ready) as ServiceWorkerRegistration & {
      sync?: { register: (tag: string) => Promise<void> };
    };
    if (!reg.sync) return false;
    await reg.sync.register("wise-sync-queue");
    return true;
  } catch {
    return false;
  }
}

function writeToSupabase(
  table: string,
  operation: "upsert" | "insert",
  payload: Record<string, unknown>,
  options?: { onConflict?: string }
) {
  const builder = supabase.from(table);
  return operation === "upsert"
    ? builder.upsert(payload, options)
    : builder.insert(payload);
}

let isFlushing = false;

// ─── Public API ───────────────────────────────────────────────────────────────

export async function enqueuedSupabaseWrite(
  table: string,
  operation: "upsert" | "insert",
  payload: Record<string, unknown>,
  options?: { onConflict?: string }
): Promise<void> {
  if (!isSupabaseConfigured) return;

  try {
    const result = await writeToSupabase(table, operation, payload, options);

    if (result.error) {
      if (isRetriableError(result.error)) {
        await persistToQueue(table, operation, payload, options?.onConflict);
      } else {
        logger.error(`[syncQueue] Permanent error on ${operation} to ${table}:`, result.error.message);
      }
    }
  } catch (err) {
    if (!navigator.onLine || isThrownNetworkError(err)) {
      await persistToQueue(table, operation, payload, options?.onConflict);
    } else {
      logger.error(`[syncQueue] Unexpected error on ${operation} to ${table}:`, err);
    }
  }
}

// Persisted timestamp of the last successful flush. Surfaced to the
// UI (offline/last-sync banner) without dragging in a React state
// dependency.
const LAST_FLUSH_LS_KEY = "wise-sync-last-flush-ms";

export function getLastFlushMs(): number | null {
  try {
    const raw = localStorage.getItem(LAST_FLUSH_LS_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function recordFlush(): void {
  try {
    localStorage.setItem(LAST_FLUSH_LS_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export async function flushSyncQueue(): Promise<number> {
  if (!isSupabaseConfigured || !navigator.onLine || isFlushing) return 0;

  isFlushing = true;
  let flushed = 0;
  try {
    const entries = await getAllSyncQueueEntries();
    for (const entry of entries) {
      if (entry.id === undefined) continue;
      try {
        const opts = entry.onConflict ? { onConflict: entry.onConflict } : undefined;
        const result = await writeToSupabase(entry.table, entry.operation, entry.payload, opts);

        if (!result.error) {
          await deleteSyncQueueEntry(entry.id);
          flushed++;
        } else if (!isRetriableError(result.error)) {
          // Permanent failure — drop the entry to avoid an indefinitely stuck queue
          logger.error(`[syncQueue] Dropping permanently failed entry for ${entry.table}:`, result.error.message);
          await deleteSyncQueueEntry(entry.id);
        }
        // Retriable errors: leave in queue for the next flush
      } catch {
        // Keep entry in queue; retry on next flush
      }
    }
  } catch (err) {
    logger.warn("[syncQueue] Failed to flush queue:", err);
  } finally {
    isFlushing = false;
    if (flushed > 0) {
      recordFlush();
      notifyQueueChanged();
    }
  }
  return flushed;
}
