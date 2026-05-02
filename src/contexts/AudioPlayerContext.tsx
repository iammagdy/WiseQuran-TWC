import { useState, useRef, useCallback, useEffect, useMemo, type ReactNode } from "react";
import { resolveAudioSource, cachePlayingAudio } from "@/lib/quran-audio";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { DEFAULT_RECITER, getReciterById, getReciterAyahAudioUrl, getReciterAudioUrls } from "@/lib/reciters";
import { fetchChapterRecitation, findCurrentAyahByTime, type AyahTimestamp } from "@/lib/ayah-timestamps";
import { SURAH_META } from "@/data/surah-meta";
import { toast } from "sonner";
import type { Ayah } from "@/lib/quran-api";
import { mobileAudioManager } from "@/lib/mobile-audio";
import { audioDebugLog } from "@/lib/audio-debug-log";
import {
  AudioPlayerStateContext,
  AudioPlayerTimeContext,
  AudioPlayerAyahContext,
  type AudioPlayerStableState,
  type AudioPlayerVolatileState,
  type AudioPlayerStateContextType,
} from "@/hooks/useAudioPlayer";

// NOTE: hooks (useAudioPlayer / useAudioPlayerState / etc.) are NOT
// re-exported from this file. Co-locating non-component exports with a
// React component breaks Vite Fast Refresh ("export is incompatible")
// — every save would full-reload and tank in-progress audio state.
// Consumers must import hooks from `@/hooks/useAudioPlayer` directly.

const INITIAL_STABLE: AudioPlayerStableState = {
  surahNumber: null,
  surahName: "",
  playing: false,
  loading: false,
  offline: false,
  playingReciterId: DEFAULT_RECITER,
  currentAyahNumber: null,
  isAyahMode: false,
  currentAyahIndex: 0,
  totalAyahs: 0,
};

const INITIAL_VOLATILE: AudioPlayerVolatileState = {
  currentTime: 0,
  duration: 0,
  currentAyahInSurah: null,
};

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const onAyahEndedRef = useRef<(() => void) | null>(null);
  const [reciterId] = useLocalStorage<string>("wise-reciter", DEFAULT_RECITER);

  const reciterIdRef = useRef(reciterId);
  const surahNumberRef = useRef<number | null>(null);

  const timestampsRef = useRef<AyahTimestamp[]>([]);
  const ayahsRef = useRef<Ayah[]>([]);
  const stoppedRef = useRef(false);
  const lastTimeUpdateRef = useRef(0);
  const isVisibleRef = useRef(true);

  const [stableState, setStableState] = useState<AudioPlayerStableState>(INITIAL_STABLE);
  const [volatileState, setVolatileState] = useState<AudioPlayerVolatileState>(INITIAL_VOLATILE);
  const [ayahState, setAyahState] = useState<{ currentAyahInSurah: number | null }>({ currentAyahInSurah: null });

  useEffect(() => {
    reciterIdRef.current = reciterId;
  }, [reciterId]);

  useEffect(() => {
    // Initialise from current state in case the provider mounts while already hidden.
    isVisibleRef.current = document.visibilityState === "visible";

    const handleVisibility = () => {
      const visible = document.visibilityState === "visible";
      isVisibleRef.current = visible;
      if (visible) {
        // Force an immediate timeupdate on return so the progress bar syncs at once.
        lastTimeUpdateRef.current = 0;
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const cleanupBlobUrl = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      mobileAudioManager.stop("quran", true);
      audioRef.current = null;
      cleanupBlobUrl();
    };
  }, [cleanupBlobUrl]);

  useEffect(() => {
    if (!("mediaSession" in navigator) || !stableState.playing) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: stableState.surahName,
      artist: getReciterById(stableState.playingReciterId).name,
      album: "القرآن الكريم",
    });

    const handlePlay = () => {
      const audio = audioRef.current;
      const savedUrl = currentUrlRef.current;
      // After long background suspension (iOS lock screen, app switched
      // away), the <audio> element can lose its src. If that happened,
      // reload from the remembered URL before asking the manager to play.
      const srcLost = !audio || !audio.src || audio.src === "" || audio.src === window.location.href;
      if (srcLost && savedUrl) {
        mobileAudioManager.play("quran", savedUrl, { forceLoad: true }).catch((err) =>
          audioDebugLog(
            "AudioPlayerContext.mediaSession.handlePlay:reloadFailed",
            { urlPreview: savedUrl.slice(0, 60) },
            err,
          ),
        );
        return;
      }
      mobileAudioManager.play("quran").catch((err) =>
        audioDebugLog(
          "AudioPlayerContext.mediaSession.handlePlay:resumeFailed",
          undefined,
          err,
        ),
      );
    };
    const handlePause = () => { audioRef.current?.pause(); };

    navigator.mediaSession.setActionHandler("play", handlePlay);
    navigator.mediaSession.setActionHandler("pause", handlePause);

    return () => {
      if ("mediaSession" in navigator) {
        navigator.mediaSession.setActionHandler("play", null);
        navigator.mediaSession.setActionHandler("pause", null);
      }
    };
  }, [stableState.playing, stableState.surahName, stableState.playingReciterId]);

  const fallbackUrlsRef = useRef<string[]>([]);
  const fallbackIndexRef = useRef(0);
  const activeSurahForRetryRef = useRef<number | null>(null);
  const activeReciterForRetryRef = useRef<string>("");
  const sourceSetRef = useRef(false);
  // Remember the URL currently loaded into the audio element so the
  // Media Session (lock screen / Bluetooth) "play" handler can rebuild
  // the source if the element lost its src during background suspension.
  const currentUrlRef = useRef<string | null>(null);

  const setupAudioListeners = useCallback((audio: HTMLAudioElement) => {
    audio.addEventListener("loadedmetadata", () => {
      setStableState((s) => ({ ...s, loading: false }));
      setVolatileState((s) => ({ ...s, duration: audio.duration }));
    });
    audio.addEventListener("timeupdate", () => {
      if (!isVisibleRef.current) return;
      const now = Date.now();
      if (now - lastTimeUpdateRef.current < 250) return;
      lastTimeUpdateRef.current = now;

      const currentTime = audio.currentTime;
      const timestamps = timestampsRef.current;

      let ayahInSurah: number | null = null;
      if (timestamps.length > 0) {
        ayahInSurah = findCurrentAyahByTime(timestamps, currentTime * 1000);
      }

      setVolatileState((s) => ({
        ...s,
        currentTime,
        currentAyahInSurah: ayahInSurah,
      }));
      setAyahState((prev) =>
        prev.currentAyahInSurah === ayahInSurah ? prev : { currentAyahInSurah: ayahInSurah }
      );
    });
    audio.addEventListener("ended", () => {
      setStableState((s) => ({ ...s, playing: false }));
      setVolatileState((s) => ({ ...s, currentAyahInSurah: null }));
      setAyahState({ currentAyahInSurah: null });
      onAyahEndedRef.current?.();
    });
    audio.addEventListener("error", () => {
      if (!sourceSetRef.current) return;

      const nextIndex = fallbackIndexRef.current;
      const fallbacks = fallbackUrlsRef.current;

      if (nextIndex < fallbacks.length && audioRef.current === audio) {
        const nextUrl = fallbacks[nextIndex];
        fallbackIndexRef.current = nextIndex + 1;
        currentUrlRef.current = nextUrl;
        mobileAudioManager.play("quran", nextUrl, { forceLoad: true }).catch((err) =>
          audioDebugLog(
            "AudioPlayerContext.fallback:playFailed",
            { fallbackIndex: nextIndex, urlPreview: nextUrl.slice(0, 60) },
            err,
          ),
        );
        return;
      }

      setStableState((s) => ({ ...s, loading: false }));
      toast.error("تعذر تشغيل الصوت. يرجى المحاولة مرة أخرى.");
    });
    audio.addEventListener("pause", () => {
      setStableState((s) => ({ ...s, playing: false }));
    });
    audio.addEventListener("play", () => {
      setStableState((s) => ({ ...s, playing: true, loading: false }));
    });
  }, []);

  const play = useCallback((surahNumber: number, surahName: string, ayahs?: Ayah[], reciterIdOverride?: string) => {
    stoppedRef.current = false;
    const currentReciterId = reciterIdOverride ?? reciterIdRef.current;

    // If already playing this surah with the same reciter, just resume.
    // If reciter changed, fall through and reload audio with the new reciter.
    if (
      audioRef.current &&
      surahNumberRef.current === surahNumber &&
      activeReciterForRetryRef.current === currentReciterId
    ) {
      audioRef.current.play().catch((err) =>
        audioDebugLog(
          "AudioPlayerContext.play:resumeRejected",
          { surahNumber, reciterId: currentReciterId },
          err,
        ),
      );
      return;
    }

    audioRef.current?.pause();
    cleanupBlobUrl();

    surahNumberRef.current = surahNumber;
    ayahsRef.current = ayahs || [];
    timestampsRef.current = [];
    // Mark this reciter as the active one *synchronously* so that any
    // subsequent rapid play() call for the same surah but a different reciter
    // can be detected by the in-flight loadAndPlay below and bail out.
    activeReciterForRetryRef.current = currentReciterId;

    let audio = audioRef.current;
    if (!audio) {
      audio = mobileAudioManager.getAudio("quran");
      audioRef.current = audio;
      setupAudioListeners(audio);
    }

    const primePromise = mobileAudioManager.prime("quran");

    setStableState(() => ({
      ...INITIAL_STABLE,
      surahNumber,
      surahName,
      loading: true,
      playingReciterId: currentReciterId,
    }));
    setVolatileState(INITIAL_VOLATILE);
    setAyahState({ currentAyahInSurah: null });

    const loadAndPlay = async () => {
      try {
        await primePromise;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'NotAllowedError') {
          setStableState((s) => ({ ...s, loading: false }));
          toast.error("يحتاج المتصفح إلى التفاعل لتشغيل الصوت. يرجى الضغط على زر التشغيل مرة أخرى.");
        }
        return;
      }

      if (
        surahNumberRef.current !== surahNumber ||
        activeReciterForRetryRef.current !== currentReciterId ||
        stoppedRef.current
      ) return;

      activeSurahForRetryRef.current = surahNumber;
      sourceSetRef.current = false;

      let primaryUrl: string | null = null;
      try {
        const qfData = await fetchChapterRecitation(currentReciterId, surahNumber);
        if (qfData) {
          timestampsRef.current = qfData.timestamps;
          primaryUrl = qfData.audioUrl;
          setStableState((s) => ({ ...s, totalAyahs: qfData.timestamps.length }));
        }
      } catch (err) {
        // Falls back to the cached/CDN URL list below — but record the
        // failure so a recurring "Quran reader skips Quran Foundation"
        // shows up in the diagnostics ring buffer instead of being
        // invisible.
        audioDebugLog(
          "AudioPlayerContext.fetchChapterRecitation:error",
          { reciterId: currentReciterId, surahNumber },
          err,
        );
      }

      if (!primaryUrl) {
        const cached = await resolveAudioSource(currentReciterId, surahNumber);
        if (cached?.cached) {
          primaryUrl = cached.url;
          blobUrlRef.current = cached.url;
        }
      }

      if (
        stoppedRef.current ||
        activeReciterForRetryRef.current !== currentReciterId ||
        surahNumberRef.current !== surahNumber
      ) return;

      const allUrls = await getReciterAudioUrls(currentReciterId, surahNumber);
      if (!primaryUrl && !navigator.onLine) {
        setStableState((s) => ({ ...s, offline: true, loading: false }));
        return;
      }

      const orderedUrls: string[] = [];
      if (primaryUrl) orderedUrls.push(primaryUrl);
      allUrls.forEach(u => !orderedUrls.includes(u) && orderedUrls.push(u));

      if (orderedUrls.length === 0) {
        setStableState((s) => ({ ...s, offline: true, loading: false }));
        return;
      }

      fallbackUrlsRef.current = orderedUrls.slice(1);
      fallbackIndexRef.current = 0;
      sourceSetRef.current = true;

      if (
        activeReciterForRetryRef.current !== currentReciterId ||
        surahNumberRef.current !== surahNumber
      ) return;

      if (audioRef.current) {
        try {
          currentUrlRef.current = orderedUrls[0];
          await mobileAudioManager.play("quran", orderedUrls[0], { forceLoad: true });
          if (!blobUrlRef.current) {
            cachePlayingAudio(currentReciterId, surahNumber, orderedUrls[0]).catch((err) => {
              audioDebugLog(
                "AudioPlayerContext.cachePlayingAudio:error",
                { reciterId: currentReciterId, surahNumber },
                err,
              );
            });
          }
        } catch (error) {
          audioDebugLog(
            "AudioPlayerContext.play:rejected",
            { reciterId: currentReciterId, surahNumber, urlPreview: orderedUrls[0]?.slice(0, 60) },
            error,
          );
          setStableState((s) => ({ ...s, loading: false }));
        }
      }
    };

    loadAndPlay();

  }, [cleanupBlobUrl, setupAudioListeners]);

  const togglePlayPause = useCallback(async () => {
    if (!audioRef.current) return;

    if (!audioRef.current.paused) {
      audioRef.current.pause();
    } else {
      await mobileAudioManager.play("quran");
    }
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setVolatileState((s) => ({ ...s, currentTime: time }));
    }
  }, []);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    surahNumberRef.current = null;
    mobileAudioManager.stop("quran", true);
    audioRef.current = null;
    cleanupBlobUrl();
    currentUrlRef.current = null;
    timestampsRef.current = [];
    ayahsRef.current = [];
    setStableState(INITIAL_STABLE);
    setVolatileState(INITIAL_VOLATILE);
    setAyahState({ currentAyahInSurah: null });
  }, [cleanupBlobUrl]);

  const setPlaybackRate = useCallback((rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, []);

  const setOnAyahEnded = useCallback((cb: (() => void) | null) => {
    onAyahEndedRef.current = cb;
  }, []);

  const seekToAyah = useCallback((ayahNumber: number) => {
    const ts = timestampsRef.current.find((t) => t.numberInSurah === ayahNumber);
    if (ts && audioRef.current) {
      const timeInSeconds = ts.from / 1000;
      audioRef.current.currentTime = timeInSeconds;
      setVolatileState((s) => ({ ...s, currentTime: timeInSeconds }));
    }
  }, []);

  const playNextSurah = useCallback(() => {
    const current = surahNumberRef.current;
    if (!current || current >= 114) return;
    const next = SURAH_META[current];
    if (next) {
      play(next.number, next.name);
    }
  }, [play]);

  const playPreviousSurah = useCallback(() => {
    const current = surahNumberRef.current;
    if (!current || current <= 1) return;
    const prev = SURAH_META[current - 2];
    if (prev) {
      play(prev.number, prev.name);
    }
  }, [play]);

  const hasPrev = stableState.surahNumber !== null && stableState.surahNumber > 1;
  const hasNext = stableState.surahNumber !== null && stableState.surahNumber < 114;

  const stableContextValue = useMemo<AudioPlayerStateContextType>(
    () => ({
      ...stableState,
      reciterId,
      play,
      togglePlayPause,
      seek,
      seekToAyah,
      stop,
      setPlaybackRate,
      setOnAyahEnded,
      playNextSurah,
      playPreviousSurah,
      hasPrev,
      hasNext,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stableState, reciterId, play, togglePlayPause, seek, seekToAyah, stop, setPlaybackRate, setOnAyahEnded, playNextSurah, playPreviousSurah, hasPrev, hasNext]
  );

  return (
    <AudioPlayerStateContext.Provider value={stableContextValue}>
      <AudioPlayerAyahContext.Provider value={ayahState}>
        <AudioPlayerTimeContext.Provider value={volatileState}>
          {children}
        </AudioPlayerTimeContext.Provider>
      </AudioPlayerAyahContext.Provider>
    </AudioPlayerStateContext.Provider>
  );
}
