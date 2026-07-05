import { onLCP, onCLS, onINP, onTTFB, type Metric } from "web-vitals";
import { logger } from "./logger";
import { supabase, isSupabaseConfigured } from "./supabase";

/**
 * Phase D — Real User Monitoring (RUM) for Core Web Vitals.
 *
 * Captures the four metrics the project cares about (LCP / CLS / INP /
 * TTFB), routes them through the existing logger, keeps a tiny
 * in-memory + sessionStorage ring so the DevKit panel can render the
 * current session's numbers, and (when the user is signed in + online
 * + Supabase is configured) inserts each finalized metric into a
 * `web_vitals` table for ad-hoc SQL analysis.
 *
 * The RUM payload is intentionally tiny so it doesn't itself become a
 * perf cost: name, value, rating, page path, session id, timestamp.
 * No hostnames, no user-agent, no device fingerprints — and the
 * Supabase insert is fire-and-forget so a slow network never blocks a
 * page interaction.
 */

const RING_KEY = "wise-vitals-ring-v1";
const SESSION_ID_KEY = "wise-vitals-session-v1";
const RING_MAX = 32;

export type VitalName = "LCP" | "CLS" | "INP" | "TTFB";
export type VitalRating = "good" | "needs-improvement" | "poor";

export interface VitalSample {
  name: VitalName;
  value: number;
  rating: VitalRating;
  path: string;
  sessionId: string;
  ts: number;
  /** Browser-provided id for the metric, useful for debugging. */
  id: string;
}

let initialized = false;

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_ID_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem(SESSION_ID_KEY, id);
    }
    return id;
  } catch {
    return "unknown";
  }
}

function readRing(): VitalSample[] {
  try {
    const raw = sessionStorage.getItem(RING_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? (arr as VitalSample[]) : [];
  } catch {
    return [];
  }
}

function writeRing(ring: VitalSample[]): void {
  try {
    sessionStorage.setItem(RING_KEY, JSON.stringify(ring.slice(-RING_MAX)));
  } catch {
    /* quota — drop silently */
  }
}

function pushSample(sample: VitalSample): void {
  const ring = readRing();
  ring.push(sample);
  writeRing(ring);
  try {
    window.dispatchEvent(new CustomEvent("wise-vitals", { detail: sample }));
  } catch {
    /* ignore */
  }
}

async function reportToSupabase(sample: VitalSample): Promise<void> {
  if (!isSupabaseConfigured) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  try {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session?.user) return;
    // Fire-and-forget. The table is optional — if it doesn't exist
    // (or RLS rejects the insert), we just swallow the error so RUM
    // failures never surface to the user.
    await supabase.from("web_vitals").insert({
      user_id: sess.session.user.id,
      name: sample.name,
      value: sample.value,
      rating: sample.rating,
      path: sample.path,
      session_id: sample.sessionId,
      ts: new Date(sample.ts).toISOString(),
    });
  } catch (err) {
    logger.debug("[vitals] supabase insert skipped:", err);
  }
}

function handleMetric(metric: Metric): void {
  const sample: VitalSample = {
    name: metric.name as VitalName,
    value: Math.round(metric.value * 1000) / 1000,
    rating: metric.rating as VitalRating,
    path: typeof location !== "undefined" ? location.pathname : "/",
    sessionId: getSessionId(),
    ts: Date.now(),
    id: metric.id,
  };
  logger.debug("[vitals]", sample.name, sample.value, sample.rating, sample.path);
  pushSample(sample);
  void reportToSupabase(sample);
}

/**
 * Idempotently subscribe to the four metrics. Safe to call from
 * `main.tsx` on every boot — `web-vitals` itself is also idempotent
 * but we double-gate just in case.
 */
export function initWebVitals(): void {
  if (initialized) return;
  if (typeof window === "undefined") return;
  initialized = true;
  try {
    onLCP(handleMetric);
    onCLS(handleMetric);
    onINP(handleMetric);
    onTTFB(handleMetric);
  } catch (err) {
    logger.warn("[vitals] failed to subscribe:", err);
  }
}

/** Read the current session's captured samples (most recent last). */
export function getSessionVitals(): VitalSample[] {
  return readRing();
}

/** Clear the in-session ring (DevKit "clear" button). */
export function clearSessionVitals(): void {
  try {
    sessionStorage.removeItem(RING_KEY);
    window.dispatchEvent(new CustomEvent("wise-vitals-cleared"));
  } catch {
    /* ignore */
  }
}
