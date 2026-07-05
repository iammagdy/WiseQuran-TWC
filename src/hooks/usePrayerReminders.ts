import { useEffect, useRef } from "react";
import { calculatePrayerTimes, type PrayerTimes } from "@/lib/prayer-times";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useLocation } from "@/hooks/useLocation";
import {
  ADHAN_STORAGE_KEY,
  DEFAULT_ADHAN_SETTINGS,
  CHIME_URL,
  type AdhanSettings,
} from "@/lib/adhan-settings";

const PRAYER_ORDER = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;

const PRAYER_NAMES_AR: Record<string, string> = {
  fajr: "الفجر",
  dhuhr: "الظهر",
  asr: "العصر",
  maghrib: "المغرب",
  isha: "العشاء",
};

const POST_REMINDER_MESSAGES: Record<string, string> = {
  simple: "لا تنسَ أذكار ما بعد الصلاة",
  dhikr: "سبحان الله ۳۳ • الحمد لله ۳۳ • الله أكبر ۳۳",
  quran: "﴿وَأَقِمِ الصَّلَاةَ إِنَّ الصَّلَاةَ تَنْهَى عَنِ الْفَحْشَاءِ وَالْمُنكَرِ﴾",
};

function timeStringToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function playChime(vol: number) {
  const audio = new Audio(CHIME_URL);
  audio.volume = Math.max(0, Math.min(1, vol / 100));
  audio.play().catch((err) => {
    console.error("[Adhan] Failed to play chime:", err);
  });
}

export function usePrayerReminders() {
  const [settings] = useLocalStorage<AdhanSettings>(ADHAN_STORAGE_KEY, DEFAULT_ADHAN_SETTINGS);
  const [notificationsEnabled] = useLocalStorage<boolean>("wise-prayer-notifications", false);
  const { location } = useLocation();
  const firedRef = useRef<Set<string>>(new Set());
  const lastDayRef = useRef(todayKey());

  useEffect(() => {
    const hasPreReminder = settings.preReminderMinutes > 0;
    const hasPostReminder = settings.postReminderMinutes > 0;
    if (!hasPreReminder && !hasPostReminder) return;
    if (!notificationsEnabled) return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const check = () => {
      const today = todayKey();
      if (today !== lastDayRef.current) {
        firedRef.current.clear();
        lastDayRef.current = today;
      }

      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const options = location
        ? { latitude: location.latitude, longitude: location.longitude }
        : {};
      const times: PrayerTimes = calculatePrayerTimes(now, options);

      for (const id of PRAYER_ORDER) {
        const perConfig = settings.perPrayer?.[id];
        const reminderAllowed = perConfig?.reminderEnabled !== false;
        if (!reminderAllowed) continue;

        const prayerTime = times[id];
        const prayerMinutes = timeStringToMinutes(prayerTime);

        if (hasPreReminder) {
          const triggerMinutes = prayerMinutes - settings.preReminderMinutes;
          const preKey = `${today}-pre-${id}`;
          const preDiff = currentMinutes - triggerMinutes;
          if (preDiff >= 0 && preDiff < 2 && !firedRef.current.has(preKey)) {
            firedRef.current.add(preKey);
            new Notification(`تذكير: صلاة ${PRAYER_NAMES_AR[id]}`, {
              body: `صلاة ${PRAYER_NAMES_AR[id]} بعد ${settings.preReminderMinutes} دقيقة`,
              icon: "/icons/icon-192.png",
              dir: "rtl",
              lang: "ar",
            });
            playChime(settings.reminderVolume);
          }
        }

        if (hasPostReminder) {
          const triggerMinutes = prayerMinutes + settings.postReminderMinutes;
          const postKey = `${today}-post-${id}`;
          const message = POST_REMINDER_MESSAGES[settings.postReminderContent] ?? POST_REMINDER_MESSAGES.simple;
          const postDiff = currentMinutes - triggerMinutes;
          if (postDiff >= 0 && postDiff < 2 && !firedRef.current.has(postKey)) {
            firedRef.current.add(postKey);
            new Notification(`بعد صلاة ${PRAYER_NAMES_AR[id]}`, {
              body: message,
              icon: "/icons/icon-192.png",
              dir: "rtl",
              lang: "ar",
            });
            playChime(settings.reminderVolume);
          }
        }
      }
    };

    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, [settings, notificationsEnabled, location]);
}
