import { useState, useRef, useEffect, useCallback } from "react";
import { getReciterAudioUrl } from "@/lib/reciters";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useDeviceId } from "@/hooks/useDeviceId";
import { mobileAudioManager } from "@/lib/mobile-audio";

export interface SleepModePrefs {
  reciterId: string;
  surahNumber: number;
  timerMinutes: number;
  quranVolume: number;
}

const PREFS_KEYS = {
  reciter: "wise-sleep-mode-reciter",
  timer: "wise-sleep-mode-timer",
  surah: "wise-sleep-mode-surah",
  quranVolume: "wise-sleep-mode-quran-volume",
} as const;

function loadPrefs(): SleepModePrefs {
  return {
    reciterId: localStorage.getItem(PREFS_KEYS.reciter) ?? "alafasy",
    surahNumber: Number(localStorage.getItem(PREFS_KEYS.surah) ?? 36),
    timerMinutes: Number(localStorage.getItem(PREFS_KEYS.timer) ?? 30),
    quranVolume: Number(localStorage.getItem(PREFS_KEYS.quranVolume) ?? 80),
  };
}

function savePrefs(prefs: SleepModePrefs) {
  localStorage.setItem(PREFS_KEYS.reciter, prefs.reciterId);
  localStorage.setItem(PREFS_KEYS.surah, String(prefs.surahNumber));
  localStorage.setItem(PREFS_KEYS.timer, String(prefs.timerMinutes));
  localStorage.setItem(PREFS_KEYS.quranVolume, String(prefs.quranVolume));
}

const FADE_OUT_START_SECS = 180;
const SLEEP_CHANNEL = "sleep" as const;

export function useSleepModePlayer() {
  const { user } = useAuth();
  const deviceId = useDeviceId();

  const [prefs, setPrefsState] = useState<SleepModePrefs>(loadPrefs);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(prefs.timerMinutes * 60);
  const [hasError, setHasError] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  const quranAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const isPlayingRef = useRef(false);
  const hasStartedRef = useRef(false);
  // Monotonically increasing token. Each play() call captures a token; any
  // async continuation that finds the global token has moved on bails out.
  // This protects against rapid play -> stop -> play (or play -> play with
  // different prefs) where an older play()'s post-await continuation could
  // otherwise mutate state and start a stale playback after a newer action.
  const playTokenRef = useRef(0);

  const setPrefs = useCallback((updates: Partial<SleepModePrefs>) => {
    setPrefsState((prev) => {
      const next = { ...prev, ...updates };
      savePrefs(next);
      return next;
    });
  }, []);

  // Sleep mode intentionally does NOT acquire a screen wake-lock: the user wants
  // the screen to turn off while audio continues to play. The audio element keeps
  // playing in the background via the OS media session, with no battery cost from
  // a forced-on screen.

  const detachAudioListeners = useCallback((audio: HTMLAudioElement | null) => {
    if (!audio) return;
    audio.ontimeupdate = null;
    audio.onloadedmetadata = null;
    audio.onplaying = null;
    audio.onwaiting = null;
  }, []);

  const stopAll = useCallback(() => {
    // Invalidate any in-flight play() continuation so it cannot mutate state
    // or start playback after we stop.
    playTokenRef.current += 1;
    if (timerIntervalRef.current) { clearInterval(timerIntervalRef.current); timerIntervalRef.current = null; }
    if (fadeIntervalRef.current) { clearInterval(fadeIntervalRef.current); fadeIntervalRef.current = null; }
    detachAudioListeners(quranAudioRef.current);
    if (hasStartedRef.current) {
      // Only touch the shared audio element if Sleep Mode actually used it.
      mobileAudioManager.stop(SLEEP_CHANNEL, true);
    }
    quranAudioRef.current = null;
    hasStartedRef.current = false;
    isPlayingRef.current = false;
    setIsPlaying(false);
    setIsLoading(false);
    setAudioCurrentTime(0);
    setAudioDuration(0);
  }, [detachAudioListeners]);

  const saveSession = useCallback(async (completed: boolean) => {
    if (!sessionIdRef.current) return;
    await supabase
      .from("sleep_mode_sessions")
      .update({ completed, ended_at: new Date().toISOString() })
      .eq("id", sessionIdRef.current);
  }, []);

  const startSession = useCallback(async (currentPrefs: SleepModePrefs) => {
    const { data } = await supabase
      .from("sleep_mode_sessions")
      .insert({
        user_id: user?.id ?? null,
        device_id: user ? null : deviceId,
        reciter_id: currentPrefs.reciterId,
        surah_number: currentPrefs.surahNumber,
        timer_minutes: currentPrefs.timerMinutes,
        nature_sound: null,
        completed: false,
      })
      .select("id")
      .maybeSingle();
    if (data?.id) sessionIdRef.current = data.id;
  }, [user, deviceId]);

  const startFadeOut = useCallback((currentQuranVol: number) => {
    let qVol = currentQuranVol / 100;
    const steps = FADE_OUT_START_SECS / 2;
    const qDecrement = qVol / steps;

    fadeIntervalRef.current = setInterval(() => {
      qVol = Math.max(0, qVol - qDecrement);
      if (quranAudioRef.current) quranAudioRef.current.volume = qVol;
      if (qVol <= 0) {
        if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      }
    }, 2000);
  }, []);

  const play = useCallback(async (overridePrefs?: SleepModePrefs) => {
    // stopAll() bumps playTokenRef. Capture the new token AFTER, so this
    // play() invocation has its own identity for staleness checks below.
    stopAll();
    const myToken = ++playTokenRef.current;
    const isStale = () => playTokenRef.current !== myToken;

    setHasError(false);
    setIsLoading(true);

    const currentPrefs = overridePrefs ?? (await new Promise<SleepModePrefs>((res) => {
      setPrefsState((p) => { res(p); return p; });
    }));

    // === iOS-safe audio bring-up ===
    // Grab the shared, properly-configured audio element for the "sleep" channel
    // (playsInline, webkit-playsinline, crossOrigin="anonymous", preload="auto"
    // are all set on it by mobileAudioManager.getAudio). Then call prime()
    // SYNCHRONOUSLY inside this user-gesture-initiated call so the underlying
    // .play() of the silent unlock MP3 happens within the activation tick —
    // this is what registers the element as "user-activated" on iOS Safari /
    // standalone PWA mode. The promise can resolve later, but the gesture has
    // been "spent" on this element, not lost.
    const audio = mobileAudioManager.getAudio(SLEEP_CHANNEL);
    quranAudioRef.current = audio;
    hasStartedRef.current = true;

    const primePromise = mobileAudioManager.prime(SLEEP_CHANNEL);

    try {
      // These can run after the gesture; the element is already activated.
      await primePromise;
      if (isStale()) return;
      const url = await getReciterAudioUrl(currentPrefs.reciterId, currentPrefs.surahNumber);
      if (isStale()) return;

      // Re-attach fresh listeners after prime (prime restores src, but we want
      // to drive the timer/loader UI off the real reciter audio element).
      detachAudioListeners(audio);
      audio.ontimeupdate = () => setAudioCurrentTime(audio.currentTime);
      audio.onloadedmetadata = () => setAudioDuration(audio.duration);
      audio.onplaying = () => setIsLoading(false);
      audio.onwaiting = () => setIsLoading(true);

      const totalSecs = currentPrefs.timerMinutes * 60;
      setRemainingSeconds(totalSecs);

      // mobileAudioManager.play sets the src, runs audio.load(), and calls
      // .play() — with a single retry-after-load fallback if the first call
      // is rejected (which iOS occasionally does on cold start).
      await mobileAudioManager.play(SLEEP_CHANNEL, url, {
        forceLoad: true,
        volume: currentPrefs.quranVolume / 100,
      });
      if (isStale()) {
        // A newer action superseded us after we already started playback —
        // stop this stray audio so it doesn't leak.
        mobileAudioManager.stop(SLEEP_CHANNEL, true);
        return;
      }

      isPlayingRef.current = true;
      setIsPlaying(true);

      await startSession(currentPrefs);
      if (isStale()) return;

      let elapsed = 0;
      timerIntervalRef.current = setInterval(() => {
        elapsed += 1;
        const remaining = totalSecs - elapsed;
        setRemainingSeconds(remaining);

        if (remaining === FADE_OUT_START_SECS) {
          startFadeOut(currentPrefs.quranVolume);
        }

        if (remaining <= 0) {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          saveSession(true);
          stopAll();
        }
      }, 1000);
    } catch {
      if (isStale()) return;
      setHasError(true);
      setIsLoading(false);
      stopAll();
    }
  }, [stopAll, startSession, startFadeOut, saveSession, detachAudioListeners]);

  const pause = useCallback(() => {
    quranAudioRef.current?.pause();
    if (timerIntervalRef.current) { clearInterval(timerIntervalRef.current); timerIntervalRef.current = null; }
    if (fadeIntervalRef.current) { clearInterval(fadeIntervalRef.current); fadeIntervalRef.current = null; }
    isPlayingRef.current = false;
    setIsPlaying(false);
  }, []);

  const resume = useCallback(async () => {
    if (!quranAudioRef.current) return;
    // Resume on the same activated element — no src swap, so iOS allows it.
    await mobileAudioManager.play(SLEEP_CHANNEL).catch(() => {});
    isPlayingRef.current = true;
    setIsPlaying(true);

    setPrefsState((currentPrefs) => {
      let elapsed = currentPrefs.timerMinutes * 60 - remainingSeconds;
      const totalSecs = currentPrefs.timerMinutes * 60;

      timerIntervalRef.current = setInterval(() => {
        elapsed += 1;
        const remaining = totalSecs - elapsed;
        setRemainingSeconds(remaining);
        if (remaining === FADE_OUT_START_SECS) {
          startFadeOut(currentPrefs.quranVolume);
        }
        if (remaining <= 0) {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          saveSession(true);
          stopAll();
        }
      }, 1000);

      return currentPrefs;
    });
  }, [remainingSeconds, startFadeOut, saveSession, stopAll]);

  const togglePlay = useCallback(async () => {
    if (isLoading) return;
    if (!isPlaying && !quranAudioRef.current) {
      setPrefsState((currentPrefs) => {
        play(currentPrefs);
        return currentPrefs;
      });
    } else if (isPlaying) {
      pause();
    } else {
      await resume();
    }
  }, [isLoading, isPlaying, play, pause, resume]);

  useEffect(() => {
    setRemainingSeconds(prefs.timerMinutes * 60);
  }, [prefs.timerMinutes]);

  useEffect(() => {
    if (quranAudioRef.current) {
      quranAudioRef.current.volume = prefs.quranVolume / 100;
    }
  }, [prefs.quranVolume]);

  useEffect(() => {
    if (isPlayingRef.current && quranAudioRef.current) {
      setPrefsState((currentPrefs) => {
        play(currentPrefs);
        return currentPrefs;
      });
    }
  }, [prefs.reciterId, prefs.surahNumber]);

  useEffect(() => {
    return () => {
      stopAll();
      if (sessionIdRef.current) saveSession(false);
    };
  }, []);

  return {
    prefs,
    setPrefs,
    isPlaying,
    isLoading,
    hasError,
    remainingSeconds,
    audioCurrentTime,
    audioDuration,
    togglePlay,
    stop: () => { saveSession(false); stopAll(); setRemainingSeconds(prefs.timerMinutes * 60); },
  };
}
