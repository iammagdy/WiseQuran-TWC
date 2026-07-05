/**
 * Wise general diagnostic ring buffer (formerly audio-only).
 *
 * Promoted from the Sleep-Mode-only diagnose-and-fix logger to a
 * production-always-on, capped ring buffer that captures structured
 * events from every fragile path: the audio playback chain, the
 * Supabase fire-and-forget writes, the SW lifecycle, and any catch
 * block that would otherwise silently swallow an error. Keyed off
 * the same `audio-debug` flag for backwards compatibility.
 *
 * Two-axis gating:
 *
 *   1. CAPTURE — always on in every environment. Every `audioDebugLog`
 *      call appends to the 200-entry ring buffer. This is what makes
 *      future user-reported issues come with real evidence: the user
 *      flips the in-app Diagnostics panel open and copies the buffer.
 *      Cost is bounded — 200 entries with thunk-resolved payloads, all
 *      callsites are on cold paths (state transitions, errors, lifecycle
 *      events; never per-tick).
 *
 *   2. CONSOLE MIRROR + DEBUG PANEL VISIBILITY — gated by:
 *        - dev (`import.meta.env.DEV`),
 *        - URL `?debug=audio`,
 *        - `localStorage.audioDebug === "1"`.
 *      When this gate is OFF (production user without the flag), no
 *      `console.info` noise lands in the JS console, and the floating
 *      pill on Sleep Mode stays hidden. When it's ON, events also
 *      mirror to `console.info` with an `[audio-debug]` prefix so
 *      Safari Web Inspector picks them up, and the pill is visible.
 *
 * The Settings → Diagnostics page reads the buffer regardless of the
 * gate — that's the point of always-on capture.
 */

const MAX_ENTRIES = 200;

export interface AudioDebugEntry {
  id: number;
  ts: number; // performance.now() if available, else Date.now()
  iso: string; // wall-clock ISO timestamp for human reading
  step: string;
  payload?: Record<string, unknown>;
  error?: { name: string; message: string; stack?: string };
}

const entries: AudioDebugEntry[] = [];
const listeners = new Set<() => void>();
let nextId = 1;
// Cached snapshot for `useSyncExternalStore`. React requires the
// snapshot getter to return a STABLE reference between calls when
// nothing has changed; otherwise it concludes the store keeps changing
// and re-renders forever (Maximum update depth exceeded). We rebuild
// this snapshot only when the buffer actually mutates.
let cachedSnapshot: readonly AudioDebugEntry[] = [];

function invalidateSnapshot(): void {
  cachedSnapshot = entries.slice();
  for (const listener of listeners) listener();
}

function readUrlFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("debug") === "audio";
  } catch {
    return false;
  }
}

function readLocalStorageFlag(): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem("audioDebug") === "1";
  } catch {
    return false;
  }
}

function readDevFlag(): boolean {
  try {
    return Boolean(import.meta.env?.DEV);
  } catch {
    return false;
  }
}

// `enabled` controls the CONSOLE MIRROR + the floating debug pill —
// NOT the capture itself. Capture is always on (see module docstring).
// Captured once at module init so the per-push gate stays a single
// boolean read. The user can flip the flag at runtime via the panel's
// "Enable persistent debug" button — that calls setEnabled() below to
// update this in place.
let enabled = readDevFlag() || readUrlFlag() || readLocalStorageFlag();

/**
 * True when the noisy bits — `console.info` mirroring and the floating
 * Sleep-Mode debug pill — are active. Use this for "should the panel
 * pill be visible?" decisions; it does NOT mean "should we capture?",
 * since capture is always on.
 */
export function isAudioDebugEnabled(): boolean {
  return enabled;
}

/**
 * Test-only: re-evaluate the gate from URL/localStorage/DEV without
 * persisting anything. Lets a vitest case verify the production
 * default (gate is OFF when DEV is off and there's no URL param /
 * localStorage flag).
 */
export function __resetAudioDebugForTests(): void {
  enabled = readDevFlag() || readUrlFlag() || readLocalStorageFlag();
  entries.length = 0;
  nextId = 1;
  invalidateSnapshot();
}

/**
 * Manually flip the gate at runtime. Used by the in-app debug panel to
 * persist the flag to localStorage so it survives PWA cold-starts.
 */
export function setAudioDebugEnabled(value: boolean): void {
  enabled = value;
  if (typeof localStorage !== "undefined") {
    try {
      if (value) {
        localStorage.setItem("audioDebug", "1");
      } else {
        localStorage.removeItem("audioDebug");
      }
    } catch {
      /* ignore — best effort persistence */
    }
  }
  for (const listener of listeners) listener();
}
// Note: setAudioDebugEnabled doesn't change the entries buffer, so
// it notifies listeners directly without rebuilding the snapshot.

function nowMs(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function safeResolvePayload(
  thunk: () => Record<string, unknown>,
): Record<string, unknown> | undefined {
  try {
    return thunk();
  } catch (err) {
    return { __payloadThunkError: String(err) };
  }
}

function serializeError(err: unknown): AudioDebugEntry["error"] | undefined {
  if (!err) return undefined;
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  try {
    return { name: "NonError", message: String(err) };
  } catch {
    return { name: "NonError", message: "<unserializable>" };
  }
}

type PayloadInput =
  | Record<string, unknown>
  | (() => Record<string, unknown>)
  | undefined;

/**
 * Append a structured event to the ring buffer. Always-on — every call
 * captures, regardless of the URL/localStorage/DEV gate. The `enabled`
 * gate only controls whether the entry also mirrors to `console.info`.
 *
 * Pass a thunk for `payload` when the payload requires non-trivial
 * computation (string slicing, property reads on hot objects, etc.) —
 * the thunk runs once per call regardless of the gate. Eager objects
 * are fine for cheap literals like `{ channel }`.
 *
 * Cost guidance: this is intended for cold paths (state transitions,
 * errors, lifecycle events). Do NOT call from per-tick code (e.g.
 * timeupdate handlers) — even at always-on, 4Hz × 200 entries would
 * still flood the buffer in seconds and crowd out the diagnostically
 * useful entries.
 */
export function audioDebugLog(
  step: string,
  payload?: PayloadInput,
  error?: unknown,
): void {
  const resolvedPayload =
    typeof payload === "function" ? safeResolvePayload(payload) : payload;
  const entry: AudioDebugEntry = {
    id: nextId++,
    ts: nowMs(),
    iso: new Date().toISOString(),
    step,
    payload: resolvedPayload,
    error: serializeError(error),
  };
  entries.push(entry);
  if (entries.length > MAX_ENTRIES) {
    entries.splice(0, entries.length - MAX_ENTRIES);
  }
  cachedSnapshot = entries.slice();
  // Mirror to console.info only when the noisy gate is on. Production
  // users without `?debug=audio` / `audioDebug=1` see a clean console
  // even though their buffer is being populated for later inspection.
  if (enabled) {
    try {
      if (entry.error) {
        console.info(`[audio-debug] ${step}`, resolvedPayload ?? {}, entry.error);
      } else if (resolvedPayload) {
        console.info(`[audio-debug] ${step}`, resolvedPayload);
      } else {
        console.info(`[audio-debug] ${step}`);
      }
    } catch {
      /* console may be unavailable in some sandboxes */
    }
  }
  for (const listener of listeners) listener();
}

/**
 * Snapshot of the current ring buffer. Returns the SAME array reference
 * across calls until the buffer mutates — a hard requirement for
 * `useSyncExternalStore` (a new reference each call would loop React
 * forever with "Maximum update depth exceeded").
 */
export function getAudioDebugEntries(): readonly AudioDebugEntry[] {
  return cachedSnapshot;
}

export function clearAudioDebugEntries(): void {
  entries.length = 0;
  invalidateSnapshot();
}

export function subscribeAudioDebug(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * `wiseLogger` — generalized logger surface.
 *
 * Same ring buffer, same gating, same listeners as the audio-debug API
 * above. The aliases exist because this logger has been promoted from
 * a Sleep-Mode-only audio diagnostic into the project-wide structured
 * logger used by every fragile path (Supabase fire-and-forget writes,
 * SW lifecycle, scheduler, etc.). New callsites should prefer
 * `wiseLogger.log(step, payload, error)`; the existing `audioDebugLog`
 * / `isAudioDebugEnabled` / `setAudioDebugEnabled` exports remain for
 * back-compat and continue to work unchanged.
 */
export const wiseLogger = {
  log: audioDebugLog,
  isEnabled: isAudioDebugEnabled,
  setEnabled: setAudioDebugEnabled,
  getEntries: getAudioDebugEntries,
  clear: clearAudioDebugEntries,
  subscribe: subscribeAudioDebug,
} as const;
