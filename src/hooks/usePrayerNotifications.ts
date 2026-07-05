import { useEffect, useRef } from "react";
import { calculatePrayerTimes, type PrayerTimes, formatArabicTime } from "@/lib/prayer-times";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useLocation } from "@/hooks/useLocation";

const PRAYER_NAMES: Record<string, string> = {
  fajr: "الفجر",
  dhuhr: "الظهر",
  asr: "العصر",
  maghrib: "المغرب",
  isha: "العشاء",
};

const PRAYER_ORDER = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function usePrayerNotifications() {
  const [enabled] = useLocalStorage<boolean>("wise-prayer-notifications", false);
  const { location } = useLocation();
  const notifiedRef = useRef<Set<string>>(new Set());
  const lastDayRef = useRef(todayKey());

  useEffect(() => {
    if (!enabled) return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const check = () => {
      const today = todayKey();
      if (today !== lastDayRef.current) {
        notifiedRef.current.clear();
        lastDayRef.current = today;
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
          new Notification(`حان وقت صلاة ${PRAYER_NAMES[id]} 🕌`, {
            body: formatArabicTime(prayerTime),
            icon: "/icons/icon-192.png",
            dir: "rtl",
            lang: "ar",
          });
        }
      }
    };

    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, [enabled, location]);
}
