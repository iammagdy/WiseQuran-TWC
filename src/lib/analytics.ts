import { supabase, isSupabaseConfigured } from "./supabase";
import { getAllBookmarks } from "./db";
import { logger } from "./logger";

const SESSION_KEY = "wise-analytics-session-id";
const LAST_HEARTBEAT_KEY = "wise-analytics-last-heartbeat";
const DURATION_KEY = "wise-analytics-duration";
const METRICS_KEY = "wise-analytics-metrics";

function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export interface FeatureMetrics {
  pages: Record<string, number>;
  actions: Record<string, number>;
}

function getStoredMetrics(): FeatureMetrics {
  try {
    const raw = sessionStorage.getItem(METRICS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { pages: {}, actions: {} };
}

function saveStoredMetrics(metrics: FeatureMetrics) {
  try {
    sessionStorage.setItem(METRICS_KEY, JSON.stringify(metrics));
  } catch (e) {}
}

export function trackPageView(pathname: string) {
  if (typeof window === "undefined") return;
  const metrics = getStoredMetrics();
  
  // Categorize paths
  let pageName = "other";
  if (pathname === "/") pageName = "quran";
  else if (pathname.startsWith("/surah/")) pageName = "reader";
  else if (pathname === "/azkar") pageName = "azkar";
  else if (pathname === "/prayer") pageName = "prayer";
  else if (pathname === "/tasbeeh") pageName = "tasbeeh";
  else if (pathname === "/stats") pageName = "stats";
  else if (pathname === "/hifz") pageName = "hifz";
  else if (pathname === "/hifz/test") pageName = "recitation_test";
  else if (pathname === "/qibla") pageName = "qibla";
  else if (pathname === "/sleep") pageName = "sleep";
  else if (pathname === "/ramadan") pageName = "ramadan";
  else if (pathname === "/settings") pageName = "settings";
  else if (pathname === "/bookmarks") pageName = "bookmarks";
  
  metrics.pages[pageName] = (metrics.pages[pageName] || 0) + 1;
  saveStoredMetrics(metrics);
  
  void triggerQuickUpdate();
}

export function trackEvent(actionName: string) {
  if (typeof window === "undefined") return;
  const metrics = getStoredMetrics();
  metrics.actions[actionName] = (metrics.actions[actionName] || 0) + 1;
  saveStoredMetrics(metrics);
  
  void triggerQuickUpdate();
}

async function triggerQuickUpdate(): Promise<void> {
  if (!isSupabaseConfigured) return;
  const sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) return;
  
  const currentDuration = parseInt(sessionStorage.getItem(DURATION_KEY) || "0", 10);
  const metrics = getStoredMetrics();
  
  try {
    await supabase
      .from("visitor_analytics")
      .update({
        session_duration_seconds: currentDuration,
        feature_metrics: metrics,
        last_active_at: new Date().toISOString(),
      })
      .eq("session_id", sessionId);
  } catch (e) {
    logger.debug("[analytics] quick update failed", e);
  }
}

interface LocalStats {
  bookmarks: number;
  hifz: number;
  tasbeeh: number;
}

async function getLocalStats(): Promise<LocalStats> {
  let bookmarks = 0;
  try {
    const list = await getAllBookmarks();
    bookmarks = list.length;
  } catch (e) {
    logger.debug("[analytics] failed to read bookmarks count", e);
  }

  let hifz = 0;
  try {
    const raw = localStorage.getItem("wise-hifz");
    if (raw) {
      const parsed = JSON.parse(raw);
      hifz = Array.isArray(parsed) ? parsed.length : (typeof parsed === "object" ? Object.keys(parsed).length : 0);
    }
  } catch (e) {
    logger.debug("[analytics] failed to read hifz progress", e);
  }

  let tasbeeh = 0;
  try {
    const raw = localStorage.getItem("wise-tasbeeh-count");
    if (raw) {
      tasbeeh = parseInt(raw, 10) || 0;
    }
  } catch (e) {
    logger.debug("[analytics] failed to read tasbeeh count", e);
  }

  return { bookmarks, hifz, tasbeeh };
}

function getDeviceInfo(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  let os = "Unknown OS";
  if (ua.indexOf("Win") !== -1) os = "Windows";
  else if (ua.indexOf("Mac") !== -1) os = "MacOS";
  else if (ua.indexOf("X11") !== -1) os = "UNIX";
  else if (ua.indexOf("Linux") !== -1) os = "Linux";
  else if (/Android/.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";

  let browser = "Unknown Browser";
  if (ua.indexOf("Chrome") !== -1) browser = "Chrome";
  else if (ua.indexOf("Safari") !== -1) browser = "Safari";
  else if (ua.indexOf("Firefox") !== -1) browser = "Firefox";

  return `${os} / ${browser}`;
}

let trackingInterval: any = null;

export async function initAnalytics(): Promise<void> {
  if (!isSupabaseConfigured) return;
  if (typeof window === "undefined") return;

  const sessionId = getSessionId();
  const isNewSession = !sessionStorage.getItem("wise-analytics-logged");

  if (isNewSession) {
    sessionStorage.setItem("wise-analytics-logged", "1");
    sessionStorage.setItem(DURATION_KEY, "0");
    sessionStorage.setItem(LAST_HEARTBEAT_KEY, Date.now().toString());

    // Fetch IP and Organization/Company info from ipapi (free, no key needed)
    let ip = "";
    let org = "Unknown Company";
    let city = "";
    let country = "";

    try {
      const res = await fetch("https://ipapi.co/json/");
      if (res.ok) {
        const geo = await res.json();
        ip = geo.ip || "";
        org = geo.org || "Unknown Company";
        city = geo.city || "";
        country = geo.country_name || "";
      }
    } catch (e) {
      logger.debug("[analytics] geoip lookup failed", e);
    }

    const device = getDeviceInfo();
    const stats = await getLocalStats();
    const metrics = getStoredMetrics();

    try {
      await supabase.from("visitor_analytics").insert({
        session_id: sessionId,
        ip,
        org,
        city,
        country,
        device,
        bookmarks_count: stats.bookmarks,
        hifz_count: stats.hifz,
        tasbeeh_count: stats.tasbeeh,
        session_duration_seconds: 0,
        feature_metrics: metrics,
      });
    } catch (e) {
      logger.debug("[analytics] failed to log session start", e);
    }
  }

  // Start heartbeat
  if (!trackingInterval) {
    trackingInterval = setInterval(async () => {
      await sendHeartbeat();
    }, 30000); // every 30 seconds
  }
}

async function sendHeartbeat(): Promise<void> {
  if (!isSupabaseConfigured) return;
  const sessionId = getSessionId();

  const lastHeartbeat = parseInt(sessionStorage.getItem(LAST_HEARTBEAT_KEY) || Date.now().toString(), 10);
  const now = Date.now();
  const diffSeconds = Math.round((now - lastHeartbeat) / 1000);
  sessionStorage.setItem(LAST_HEARTBEAT_KEY, now.toString());

  const currentDuration = parseInt(sessionStorage.getItem(DURATION_KEY) || "0", 10);
  const newDuration = currentDuration + diffSeconds;
  sessionStorage.setItem(DURATION_KEY, newDuration.toString());

  const stats = await getLocalStats();
  const metrics = getStoredMetrics();

  try {
    await supabase
      .from("visitor_analytics")
      .update({
        session_duration_seconds: newDuration,
        bookmarks_count: stats.bookmarks,
        hifz_count: stats.hifz,
        tasbeeh_count: stats.tasbeeh,
        feature_metrics: metrics,
        last_active_at: new Date().toISOString(),
      })
      .eq("session_id", sessionId);
  } catch (e) {
    logger.debug("[analytics] heartbeat update failed", e);
  }
}
