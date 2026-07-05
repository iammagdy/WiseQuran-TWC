import { useEffect, useRef } from "react";
import { calculatePrayerTimes, type PrayerTimes } from "@/lib/prayer-times";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useLocation } from "@/hooks/useLocation";
import {
  ADHAN_STORAGE_KEY,
  DEFAULT_ADHAN_SETTINGS,
  CHIME_URL,
  REMINDER_SOUNDS,
  type AdhanSettings,
} from "@/lib/adhan-settings";
import { mobileAudioManager } from "@/lib/mobile-audio";
import { showAppNotification } from "@/lib/notifications";

const PRAYER_ORDER = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
const FIRED_STORAGE_KEY = "wise-prayer-reminder-events";
const MISSED_REMINDER_GRACE_MINUTES = 20;

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

function loadReminderEvents(day: string) {
  try {
    const raw = localStorage.getItem(FIRED_STORAGE_KEY);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw) as { day?: string; keys?: string[] };
    if (parsed.day !== day) return new Set<string>();
    return new Set(parsed.keys ?? []);
  } catch {
    return new Set<string>();
  }
}

function saveReminderEvents(day: string, keys: Set<string>) {
  localStorage.setItem(FIRED_STORAGE_KEY, JSON.stringify({ day, keys: Array.from(keys) }));
}

async function playReminderSound(soundId: string | undefined, vol: number) {
  const id = soundId ?? "chime";
  const sound = REMINDER_SOUNDS.find((s) => s.id === id);
  const file = sound?.file ?? CHIME_URL;
  if (!file) return;
  mobileAudioManager.play("alarm", file, {
    volume: Math.max(0, Math.min(1, vol / 100)),
    resetTime: true,
  }).catch((err) => {
    console.error("[Adhan] Failed to play reminder sound:", err);
  });
}

export function usePrayerReminders() {
  const [settings] = useLocalStorage<AdhanSettings>(ADHAN_STORAGE_KEY, DEFAULT_ADHAN_SETTINGS);
  const [notificationsEnabled] = useLocalStorage<boolean>("wise-prayer-notifications", false);
  const { location } = useLocation();
  const firedRef = useRef<Set<string>>(loadReminderEvents(todayKey()));
  const lastDayRef = useRef(todayKey());

  useEffect(() => {
    const hasPreReminder = settings.preReminderMinutes > 0;
    const hasPostReminder = settings.postReminderMinutes > 0;
    if (!hasPreReminder && !hasPostReminder) return;
    if (!notificationsEnabled) return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const syncDay = (today: string) => {
      if (today !== lastDayRef.current) {
        lastDayRef.current = today;
        firedRef.current = loadReminderEvents(today);
      }
    };

    const markFired = (today: string, key: string) => {
      firedRef.current.add(key);
      saveReminderEvents(today, firedRef.current);
    };

    const check = (allowCatchUp: boolean) => {
      const today = todayKey();
      syncDay(today);

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
          const shouldFire = preDiff >= 0 && preDiff < 2;
          const shouldRecover = allowCatchUp && preDiff >= 2 && preDiff <= MISSED_REMINDER_GRACE_MINUTES;
          if ((shouldFire || shouldRecover) && !firedRef.current.has(preKey)) {
            markFired(today, preKey);
            showAppNotification(`تذكير: صلاة ${PRAYER_NAMES_AR[id]}`, {
              body: `صلاة ${PRAYER_NAMES_AR[id]} بعد ${settings.preReminderMinutes} دقيقة`,
              dir: "rtl",
              lang: "ar",
              tag: preKey,
            });
            playReminderSound(settings.reminderSoundId, settings.reminderVolume);
          }
        }

        if (hasPostReminder) {
          const triggerMinutes = prayerMinutes + settings.postReminderMinutes;
          const postKey = `${today}-post-${id}`;
          const message = POST_REMINDER_MESSAGES[settings.postReminderContent] ?? POST_REMINDER_MESSAGES.simple;
          const postDiff = currentMinutes - triggerMinutes;
          const shouldFire = postDiff >= 0 && postDiff < 2;
          const shouldRecover = allowCatchUp && postDiff >= 2 && postDiff <= MISSED_REMINDER_GRACE_MINUTES;
          if ((shouldFire || shouldRecover) && !firedRef.current.has(postKey)) {
            markFired(today, postKey);
            showAppNotification(`بعد صلاة ${PRAYER_NAMES_AR[id]}`, {
              body: message,
              dir: "rtl",
              lang: "ar",
              tag: postKey,
            });
            playReminderSound(settings.reminderSoundId, settings.reminderVolume);
          }
        }
      }
    };

    check(true);
    const interval = setInterval(() => check(false), 15_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") check(true);
    };
    window.addEventListener("focus", onVisibilityChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onVisibilityChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [settings, notificationsEnabled, location]);
}
