import { useEffect, useRef } from "react";
import { calculatePrayerTimes, type PrayerTimes, formatArabicTime } from "@/lib/prayer-times";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useLocation } from "@/hooks/useLocation";
import { showAppNotification } from "@/lib/notifications";

const PRAYER_NAMES: Record<string, string> = {
  fajr: "الفجر",
  dhuhr: "الظهر",
  asr: "العصر",
  maghrib: "المغرب",
  isha: "العشاء",
};

const PRAYER_ORDER = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;

const NOTIFIED_STORAGE_KEY = "wise-prayer-notified";

interface NotifiedState {
  date: string;
  ids: string[];
}

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function readNotified(): NotifiedState {
  try {
    const raw = localStorage.getItem(NOTIFIED_STORAGE_KEY);
    if (!raw) return { date: todayKey(), ids: [] };
    const parsed = JSON.parse(raw) as Partial<NotifiedState>;
    if (!parsed || typeof parsed.date !== "string" || !Array.isArray(parsed.ids)) {
      return { date: todayKey(), ids: [] };
    }
    return { date: parsed.date, ids: parsed.ids.filter((x): x is string => typeof x === "string") };
  } catch {
    return { date: todayKey(), ids: [] };
  }
}

function writeNotified(state: NotifiedState): void {
  try { localStorage.setItem(NOTIFIED_STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

export function usePrayerNotifications() {
  const [enabled] = useLocalStorage<boolean>("wise-prayer-notifications", false);
  const { location } = useLocation();
  const notifiedRef = useRef<Set<string>>(new Set());
  const lastDayRef = useRef<string>(todayKey());

  useEffect(() => {
    if (!enabled) return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const initial = readNotified();
    const today = todayKey();
    if (initial.date !== today) {
      notifiedRef.current = new Set();
      lastDayRef.current = today;
      writeNotified({ date: today, ids: [] });
    } else {
      notifiedRef.current = new Set(initial.ids);
      lastDayRef.current = initial.date;
    }

    const check = () => {
      const today = todayKey();
      if (today !== lastDayRef.current) {
        notifiedRef.current = new Set();
        lastDayRef.current = today;
        writeNotified({ date: today, ids: [] });
      }

      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const options = location
        ? { latitude: location.latitude, longitude: location.longitude }
        : {};
      const times: PrayerTimes = calculatePrayerTimes(now, options);

      for (const id of PRAYER_ORDER) {
        const prayerTime = times[id];
        const [ph, pm] = prayerTime.split(":").map(Number);
        const prayerMinutes = ph * 60 + pm;
        const diff = currentMinutes - prayerMinutes;
        if (diff >= 0 && diff < 2 && !notifiedRef.current.has(id)) {
          notifiedRef.current.add(id);
          writeNotified({ date: today, ids: Array.from(notifiedRef.current) });
          showAppNotification(`حان وقت صلاة ${PRAYER_NAMES[id]} 🕌`, {
            body: formatArabicTime(prayerTime),
            dir: "rtl",
            lang: "ar",
            tag: `wise-prayer-notification-${today}-${id}`,
          });
        }
      }
    };

    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, [enabled, location]);
}
