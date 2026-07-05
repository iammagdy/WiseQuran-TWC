import { useEffect, useRef } from "react";
import { calculatePrayerTimes, type PrayerTimes, type CalculationMethod } from "@/lib/prayer-times";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useLocation } from "@/hooks/useLocation";
import { showAppNotification } from "@/lib/notifications";
import {
  PRAYER_IDS,
  loadPrayerLog,
  todayKey,
  type PrayerId,
} from "@/lib/prayer-log";

const FIRED_KEY = "wise-prayer-checkoff-reminders-fired";
const LEAD_MINUTES = 15; // remind 15 min before window end (= next prayer start)

const PRAYER_NAMES_AR: Record<PrayerId, string> = {
  fajr: "الفجر",
  dhuhr: "الظهر",
  asr: "العصر",
  maghrib: "المغرب",
  isha: "العشاء",
};
const PRAYER_NAMES_EN: Record<PrayerId, string> = {
  fajr: "Fajr",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
};

function timeStringToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function loadFired(day: string): Set<string> {
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as { day?: string; keys?: string[] };
    if (parsed.day !== day) return new Set();
    return new Set(parsed.keys ?? []);
  } catch {
    return new Set();
  }
}

function saveFired(day: string, keys: Set<string>) {
  try {
    localStorage.setItem(FIRED_KEY, JSON.stringify({ day, keys: Array.from(keys) }));
  } catch {
    /* ignore */
  }
}

export function usePrayerCheckoffReminders() {
  const [enabled] = useLocalStorage<boolean>("wise-prayer-checkoff-reminders", false);
  const [calcMethod] = useLocalStorage<CalculationMethod>("wise-prayer-method", "egyptian");
  const { location } = useLocation();
  const firedRef = useRef<Set<string>>(loadFired(todayKey()));
  const lastDayRef = useRef(todayKey());

  useEffect(() => {
    if (!enabled) return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const isArabic = (navigator.language ?? "").toLowerCase().startsWith("ar");

    const check = () => {
      const today = todayKey();
      if (today !== lastDayRef.current) {
        lastDayRef.current = today;
        firedRef.current = loadFired(today);
      }

      const log = loadPrayerLog();
      const todayLog = log[today] ?? {};

      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const opts = location
        ? { latitude: location.latitude, longitude: location.longitude, method: calcMethod }
        : { method: calcMethod };
      const times: PrayerTimes = calculatePrayerTimes(now, opts);

      // Window end for prayer i is the start of prayer i+1.
      // For Isha, treat window end as 23:59 (same day).
      const startMinutes = PRAYER_IDS.map((id) => timeStringToMinutes(times[id]));

      for (let i = 0; i < PRAYER_IDS.length; i++) {
        const id = PRAYER_IDS[i];
        if (todayLog[id]) continue; // already marked

        const windowStart = startMinutes[i];
        const windowEnd = i < PRAYER_IDS.length - 1 ? startMinutes[i + 1] : 23 * 60 + 59;
        const triggerAt = windowEnd - LEAD_MINUTES;

        // Only inside the prayer's own window
        if (currentMinutes < windowStart) continue;
        if (currentMinutes < triggerAt) continue;
        if (currentMinutes >= windowEnd) continue; // window already closed

        const key = `${today}-${id}`;
        if (firedRef.current.has(key)) continue;
        firedRef.current.add(key);
        saveFired(today, firedRef.current);

        const name = isArabic ? PRAYER_NAMES_AR[id] : PRAYER_NAMES_EN[id];
        const title = isArabic
          ? `هل صليت ${name}؟`
          : `Did you pray ${name}?`;
        const body = isArabic
          ? "اضغط لتأكيد صلاتك قبل انتهاء الوقت."
          : "Tap to mark it before the window closes.";
        showAppNotification(title, {
          body,
          dir: isArabic ? "rtl" : "ltr",
          lang: isArabic ? "ar" : "en",
          tag: key,
        });
      }
    };

    check();
    const interval = setInterval(check, 60_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onVisibility);
    };
  }, [enabled, calcMethod, location]);
}
