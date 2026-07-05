import { useEffect, useRef } from "react";
import { calculatePrayerTimes, type PrayerTimes } from "@/lib/prayer-times";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useLocation } from "@/hooks/useLocation";

const AZKAR_TIMES = {
  fajr: {
    id: "morning",
    nameAr: "أذكار الصباح",
    nameEn: "Morning Azkar",
    bodyAr: "ابدأ يومك بذكر الله",
    bodyEn: "Start your day with the remembrance of Allah",
    icon: "🌅",
  },
  maghrib: {
    id: "evening",
    nameAr: "أذكار المساء",
    nameEn: "Evening Azkar",
    bodyAr: "اختم يومك بذكر الله",
    bodyEn: "End your day with the remembrance of Allah",
    icon: "🌙",
  },
} as const;

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function useAzkarNotifications() {
  const [enabled] = useLocalStorage<boolean>("wise-azkar-notifications", false);
  const [language] = useLocalStorage<string>("wise-language", "ar");
  const { location } = useLocation();
  const notifiedRef = useRef<Set<string>>(new Set());
  const lastDayRef = useRef(todayKey());

  useEffect(() => {
    if (!enabled) return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const isAr = language === "ar";

    const check = () => {
      const today = todayKey();
      if (today !== lastDayRef.current) {
        notifiedRef.current.clear();
        lastDayRef.current = today;
      }

      const now = new Date();
      const nowHH = now.getHours().toString().padStart(2, "0");
      const nowMM = now.getMinutes().toString().padStart(2, "0");
      const nowTime = `${nowHH}:${nowMM}`;

      const options = location
        ? { latitude: location.latitude, longitude: location.longitude }
        : {};
      const times: PrayerTimes = calculatePrayerTimes(now, options);

      const fajr = AZKAR_TIMES.fajr;
      if (times.fajr === nowTime && !notifiedRef.current.has("morning")) {
        notifiedRef.current.add("morning");
        new Notification(`${isAr ? fajr.nameAr : fajr.nameEn} ${fajr.icon}`, {
          body: isAr ? fajr.bodyAr : fajr.bodyEn,
          icon: "/icons/icon-192.png",
          dir: isAr ? "rtl" : "ltr",
          lang: isAr ? "ar" : "en",
        });
      }

      const maghrib = AZKAR_TIMES.maghrib;
      if (times.maghrib === nowTime && !notifiedRef.current.has("evening")) {
        notifiedRef.current.add("evening");
        new Notification(`${isAr ? maghrib.nameAr : maghrib.nameEn} ${maghrib.icon}`, {
          body: isAr ? maghrib.bodyAr : maghrib.bodyEn,
          icon: "/icons/icon-192.png",
          dir: isAr ? "rtl" : "ltr",
          lang: isAr ? "ar" : "en",
        });
      }
    };

    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, [enabled, location, language]);
}
