import { useEffect, useRef, useCallback } from "react";
import { calculatePrayerTimes, type PrayerTimes } from "@/lib/prayer-times";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useLocation } from "@/hooks/useLocation";
import {
  ADHAN_STORAGE_KEY,
  buildAzanSourceList,
  DEFAULT_ADHAN_SETTINGS,
  ADHAN_VOICES,
  TAKBIR_URL,
  type AdhanSettings,
} from "@/lib/adhan-settings";
import { detectBrowser } from "@/lib/browser-detect";
import { mobileAudioManager } from "@/lib/mobile-audio";
import { showAppNotification } from "@/lib/notifications";

const PRAYER_ORDER = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
const PLAYED_STORAGE_KEY = "wise-adhan-played-events";
const MISSED_PRAYER_GRACE_MINUTES = 15;
// Cap one-shot scheduling at ~12 hours so we always re-arm when the day
// or location changes. `setTimeout` is unreliable past a few hours
// anyway (suspended tabs, DST, sleep/wake).
const MAX_SCHEDULE_MS = 12 * 60 * 60 * 1000;

const PRAYER_LABEL_AR: Record<string, string> = {
  fajr: "الفجر",
  dhuhr: "الظهر",
  asr: "العصر",
  maghrib: "المغرب",
  isha: "العشاء",
};

// Forwards the next scheduled adhan to the service worker so it can
// show a notification even when the tab is suspended. The in-page
// scheduler still runs as a foreground fallback; if both fire, the
// notification `tag` (minute-precision) dedupes them.
async function postAdhanScheduleToSW(prayerId: string, fireAt: number) {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({
      type: "WISE_ADHAN_SCHEDULE",
      prayerId,
      prayerLabel: PRAYER_LABEL_AR[prayerId] ?? prayerId,
      fireAt,
    });
  } catch {
    /* ignore — SW scheduling is best-effort */
  }
}

async function postAdhanCancelToSW() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({ type: "WISE_ADHAN_CANCEL" });
  } catch {
    /* ignore */
  }
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function loadPlayedEvents(day: string) {
  try {
    const raw = localStorage.getItem(PLAYED_STORAGE_KEY);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw) as { day?: string; keys?: string[] };
    if (parsed.day !== day) return new Set<string>();
    return new Set(parsed.keys ?? []);
  } catch {
    return new Set<string>();
  }
}

function savePlayedEvents(day: string, keys: Set<string>) {
  localStorage.setItem(PLAYED_STORAGE_KEY, JSON.stringify({ day, keys: Array.from(keys) }));
}

let activeAudio: HTMLAudioElement | null = null;

export function stopAdhan() {
  if (activeAudio) {
    mobileAudioManager.stop("alarm");
    activeAudio = null;
  }
}

export function useAdhan() {
  const [settings] = useLocalStorage<AdhanSettings>(ADHAN_STORAGE_KEY, DEFAULT_ADHAN_SETTINGS);
  const { location } = useLocation();
  const playedRef = useRef<Set<string>>(loadPlayedEvents(todayKey()));
  const lastDayRef = useRef(todayKey());
  const isIOSSafari = detectBrowser() === "ios-safari";

  const playAdhan = useCallback(async (prayerId: string, vol: number, isCatchUp = false) => {
    stopAdhan();
    const voice = ADHAN_VOICES.find((v) => v.id === settings.voiceId) ?? ADHAN_VOICES[0];
    let src: string;
    if (settings.takbirOnlyMode) {
      src = TAKBIR_URL;
    } else if (prayerId === "fajr" && settings.fajrSpecialAdhan) {
      src = voice.fajrFile;
    } else {
      src = voice.file;
    }

    const sources = buildAzanSourceList([src], isIOSSafari);

    try {
      const audio = await mobileAudioManager.playWithFallback("alarm", sources, {
        volume: Math.max(0, Math.min(1, vol / 100)),
        resetTime: true,
      });
      activeAudio = audio;
    } catch (err) {
      console.error("[Adhan] Failed to play audio:", src, err);
      activeAudio = null;
    }

    const shouldNotify = document.visibilityState !== "visible" || isCatchUp;
    if (shouldNotify) {
      await showAppNotification(`حان وقت صلاة ${prayerId === "fajr" ? "الفجر" : prayerId === "dhuhr" ? "الظهر" : prayerId === "asr" ? "العصر" : prayerId === "maghrib" ? "المغرب" : "العشاء"} 🕌`, {
        body: isCatchUp ? "تم تشغيل الأذان فور عودة التطبيق للواجهة" : "الأذان يعمل الآن",
        dir: "rtl",
        lang: "ar",
        tag: `wise-adhan-${todayKey()}-${prayerId}`,
      });
    }
  }, [isIOSSafari, settings.voiceId, settings.takbirOnlyMode, settings.fajrSpecialAdhan]);

  useEffect(() => {
    if (!settings.adhanEnabled) {
      // Toggling adhan off must also clear any timer already armed
      // inside the service worker — otherwise a previously scheduled
      // notification will still fire.
      void postAdhanCancelToSW();
      return;
    }

    let scheduleTimer: ReturnType<typeof setTimeout> | null = null;

    const syncDay = (today: string) => {
      if (today !== lastDayRef.current) {
        lastDayRef.current = today;
        playedRef.current = loadPlayedEvents(today);
      }
    };

    const markPlayed = (today: string, key: string) => {
      playedRef.current.add(key);
      savePlayedEvents(today, playedRef.current);
    };

    const prayerDateFor = (base: Date, hhmm: string) => {
      const [h, m] = hhmm.split(":").map(Number);
      const d = new Date(base);
      d.setHours(h, m, 0, 0);
      return d;
    };

    // Walk today's prayer times (and the first of tomorrow's if we're
    // past isha) and play/catch-up any that are due, then return the
    // next future event so we can schedule a precise wake-up.
    const processAndFindNext = (allowCatchUp: boolean): Date | null => {
      const now = new Date();
      const today = todayKey();
      syncDay(today);

      const baseOpts = location
        ? { latitude: location.latitude, longitude: location.longitude }
        : {};
      const times: PrayerTimes = calculatePrayerTimes(now, baseOpts);

      let next: Date | null = null;
      for (const id of PRAYER_ORDER) {
        const perConfig = settings.perPrayer?.[id];
        const adhanAllowed = perConfig?.adhanEnabled !== false;
        const scheduled = prayerDateFor(now, times[id]);
        const diffMs = now.getTime() - scheduled.getTime();
        const key = `${today}-${id}`;

        const shouldPlayNow = diffMs >= 0 && diffMs < 2 * 60 * 1000;
        const shouldRecoverMissed =
          allowCatchUp && diffMs >= 2 * 60 * 1000 && diffMs <= MISSED_PRAYER_GRACE_MINUTES * 60 * 1000;

        if (!playedRef.current.has(key) && adhanAllowed && (shouldPlayNow || shouldRecoverMissed)) {
          markPlayed(today, key);
          playAdhan(id, settings.adhanVolume, shouldRecoverMissed);
        }

        if (scheduled.getTime() > now.getTime()) {
          if (!next || scheduled.getTime() < next.getTime()) next = scheduled;
        }
      }

      // Past isha for today — look at tomorrow's fajr.
      if (!next) {
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const tomorrowTimes = calculatePrayerTimes(tomorrow, baseOpts);
        next = prayerDateFor(tomorrow, tomorrowTimes.fajr);
      }
      return next;
    };

    // Locate which prayer the next scheduled Date corresponds to so
    // we can pass the right label to the service worker.
    const findPrayerIdAt = (scheduled: Date): string | null => {
      const baseOpts = location
        ? { latitude: location.latitude, longitude: location.longitude }
        : {};
      const sameDay = calculatePrayerTimes(scheduled, baseOpts);
      for (const id of PRAYER_ORDER) {
        const [h, m] = sameDay[id].split(":").map(Number);
        if (h === scheduled.getHours() && m === scheduled.getMinutes()) return id;
      }
      return null;
    };

    const schedule = (allowCatchUp: boolean) => {
      if (scheduleTimer) clearTimeout(scheduleTimer);
      const next = processAndFindNext(allowCatchUp);
      if (!next) {
        void postAdhanCancelToSW();
        return;
      }
      const delay = Math.min(Math.max(next.getTime() - Date.now(), 1_000), MAX_SCHEDULE_MS);
      // Ship the exact fire time to the service worker so it can show
      // a notification even when the tab is suspended. The in-page
      // scheduler below is the foreground fallback; the SW uses a
      // minute-precision notification tag to avoid double-firing.
      const nextPrayerId = findPrayerIdAt(next);
      if (nextPrayerId) void postAdhanScheduleToSW(nextPrayerId, next.getTime());
      // Always allow catch-up on scheduled wake-ups: if the tab/device
      // was suspended past the scheduled time, `setTimeout` can fire
      // late without ever triggering a focus/visibility event, so we
      // rely on the grace-window catch-up to recover missed prayers.
      scheduleTimer = setTimeout(() => schedule(true), delay);
    };

    schedule(true);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") schedule(true);
    };

    window.addEventListener("focus", onVisibilityChange);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      if (scheduleTimer) clearTimeout(scheduleTimer);
      window.removeEventListener("focus", onVisibilityChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [settings, location, playAdhan]);
}
