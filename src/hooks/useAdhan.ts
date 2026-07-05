import { useEffect, useRef, useCallback } from "react";
import { calculatePrayerTimes, type PrayerTimes } from "@/lib/prayer-times";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useLocation } from "@/hooks/useLocation";
import {
  ADHAN_STORAGE_KEY,
  DEFAULT_ADHAN_SETTINGS,
  ADHAN_VOICES,
  TAKBIR_URL,
  type AdhanSettings,
} from "@/lib/adhan-settings";

const PRAYER_ORDER = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

let activeAudio: HTMLAudioElement | null = null;

export function stopAdhan() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
}

export function useAdhan() {
  const [settings] = useLocalStorage<AdhanSettings>(ADHAN_STORAGE_KEY, DEFAULT_ADHAN_SETTINGS);
  const { location } = useLocation();
  const playedRef = useRef<Set<string>>(new Set());
  const lastDayRef = useRef(todayKey());

  const playAdhan = useCallback((prayerId: string, vol: number) => {
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
    const audio = new Audio(src);
    audio.volume = Math.max(0, Math.min(1, vol / 100));
    activeAudio = audio;
    audio.play().catch((err) => {
      console.error("[Adhan] Failed to play audio:", src, err);
      activeAudio = null;
    });
    audio.addEventListener("ended", () => {
      activeAudio = null;
    });
  }, [settings.voiceId, settings.takbirOnlyMode, settings.fajrSpecialAdhan]);

  useEffect(() => {
    if (!settings.adhanEnabled) return;

    const check = () => {
      const today = todayKey();
      if (today !== lastDayRef.current) {
        playedRef.current.clear();
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
        const key = `${today}-${id}`;
        const perConfig = settings.perPrayer?.[id];
        const adhanAllowed = perConfig?.adhanEnabled !== false;
        const [ph, pm] = prayerTime.split(":").map(Number);
        const prayerMinutes = ph * 60 + pm;
        const diff = currentMinutes - prayerMinutes;
        if (diff >= 0 && diff < 2 && !playedRef.current.has(key) && adhanAllowed) {
          playedRef.current.add(key);
          playAdhan(id, settings.adhanVolume);
        }
      }
    };

    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, [settings, location, playAdhan]);
}
