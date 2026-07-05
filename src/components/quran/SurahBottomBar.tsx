import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Download, Loader2, Pause, Play, Repeat, Timer, WifiOff, X } from "lucide-react";
import { downloadSurahForOffline, isSurahFullyOffline, formatBytes } from "@/lib/offline-surah";
import { DEFAULT_TAFSIR } from "@/data/tafsir-editions";
import { toast } from "sonner";
import { cn, toArabicNumerals, formatTime } from "@/lib/utils";
import { useAudioPlayerState, useAudioPlayerTime } from "@/hooks/useAudioPlayer";
import { getReciterById } from "@/lib/reciters";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { Ayah } from "@/lib/quran-api";

interface Props {
  surahNumber: number;
  surahName: string;
  ayahs?: Ayah[];
}


const TIMER_PRESETS = [5, 10, 15, 20];

export default function SurahBottomBar({ surahNumber, surahName, ayahs }: Props) {
  const player = useAudioPlayerState();
  const { currentTime: playerCurrentTime, duration: playerDuration } = useAudioPlayerTime();
  const { t, language } = useLanguage();
  const isThisSurah = player.surahNumber === surahNumber;

  const [cached, setCached] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [dlProgress, setDlProgress] = useState(0);
  // Held in a ref so the cancel handler can reach the controller
  // without triggering re-renders on every progress tick.
  const dlAbortRef = useRef<AbortController | null>(null);

  const [timerActive, setTimerActive] = useState(false);
  const [timerRemaining, setTimerRemaining] = useState(0);
  const [showTimer, setShowTimer] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [loopEnabled, setLoopEnabled] = useLocalStorage<boolean>(`wise-loop-${surahNumber}`, false);
  const [tafsirId] = useLocalStorage<string>("wise-tafsir", DEFAULT_TAFSIR);

  // Reflect "fully offline" status (audio + text + bundled tafsir for the
  // current reciter/tafsir picks). Re-runs when the user switches reciter
  // or tafsir so the badge doesn't lie about a different bundle.
  useEffect(() => {
    let cancelled = false;
    void isSurahFullyOffline({ surahNumber, reciterId: player.reciterId, tafsirId }).then((ok) => {
      if (!cancelled) setCached(ok);
    });
    return () => { cancelled = true; };
  }, [surahNumber, player.reciterId, tafsirId]);

  useEffect(() => {
    if (!timerActive) return;
    timerRef.current = setInterval(() => {
      setTimerRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          setTimerActive(false);
          player.stop();
          toast(t("reading_time_up"), { duration: 5000 });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive, t, player]);

  const handlePlayPause = useCallback(async () => {
    if (isThisSurah) {
      player.togglePlayPause();
    } else {
      player.play(surahNumber, surahName, ayahs);
    }
  }, [isThisSurah, surahNumber, surahName, ayahs, player]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    player.seek(val);
  };

  const handleDownload = async () => {
    const controller = new AbortController();
    dlAbortRef.current = controller;
    setDownloading(true);
    setDlProgress(0);
    try {
      // Phase C: unified one-tap offline (audio + mushaf text + bundled
      // tafsir) instead of audio-only — keeps reader and surah-list
      // entry points behaviorally consistent.
      const result = await downloadSurahForOffline({
        surahNumber,
        reciterId: player.reciterId,
        tafsirId,
        signal: controller.signal,
        onProgress: setDlProgress,
      });
      // Verify all parts actually landed in IDB before claiming
      // success — guards against quota eviction between save and
      // read, and matches the surah-list button's contract.
      const verified = await isSurahFullyOffline({
        surahNumber,
        reciterId: player.reciterId,
        tafsirId,
      });
      if (!verified) {
        throw new Error(t("download_did_not_complete"));
      }
      setCached(true);
      toast.success(`${t("download_saved_offline")} (${formatBytes(result.totalBytes)})`);
    } catch (e) {
      // AbortError is the user's own cancel — show a quieter toast and
      // skip the generic "failed" message. Partial IDB rows are
      // already cleaned up inside the orchestrator.
      if (e instanceof Error && e.name === "AbortError") {
        toast(t("download_cancelled"));
      } else {
        toast.error(e instanceof Error ? e.message : t("download_failed_generic"));
      }
    } finally {
      dlAbortRef.current = null;
      setDownloading(false);
    }
  };

  const handleCancelDownload = () => {
    dlAbortRef.current?.abort();
  };

  // Abort any in-flight download when the bar unmounts (route change,
  // modal close, etc.) so background fetches don't keep eating data
  // and partial rows get cleaned up immediately.
  useEffect(() => {
    return () => { dlAbortRef.current?.abort(); };
  }, []);

  const startTimer = (minutes: number) => {
    const secs = minutes * 60;
    setTimerRemaining(secs);
    setTimerActive(true);
  };

  const stopTimer = () => {
    setTimerActive(false);
    setTimerRemaining(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const playing = isThisSurah && player.playing;
  const loading = isThisSurah && player.loading;
  const currentTime = isThisSurah ? playerCurrentTime : 0;
  const duration = isThisSurah ? playerDuration : 0;
  const offline = isThisSurah && player.offline;
  const pct = duration > 0 ? currentTime / duration * 100 : 0;

  return (
    <div className="fixed bottom-above-nav inset-x-0 z-50 px-3">
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'hsl(var(--card))',
          boxShadow: '0 -2px 24px -4px hsl(var(--primary) / 0.15), 0 8px 32px -8px hsl(0 0% 0% / 0.2)',
          border: '1.5px solid hsl(var(--primary) / 0.25)',
        }}
      >
        {/* Top accent line */}
        <div
          className="h-[3px] w-full"
          style={{ background: 'linear-gradient(to right, hsl(var(--primary) / 0.4), hsl(var(--primary)), hsl(var(--primary) / 0.4))' }}
        />

        <div className="px-4 pt-3 pb-2 space-y-3">
          {/* Offline warning */}
          <AnimatePresence>
            {offline && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-center gap-2 rounded-xl bg-muted p-2 text-[0.625rem] text-muted-foreground"
                dir={language === "ar" ? "rtl" : "ltr"}
              >
                <WifiOff className="h-3 w-3" />
                {t("audio_unavailable_offline")}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Row 1: Play + Seek slider */}
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handlePlayPause}
              disabled={loading}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-primary-foreground disabled:opacity-50 shadow-md"
              style={{ background: 'hsl(var(--primary))' }}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : playing ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 translate-x-[1px]" />
              )}
            </motion.button>

            <div className="flex flex-1 flex-col gap-1.5 min-w-0">
              {/* Styled seekable range */}
              <div className="relative h-2.5 w-full group">
                <div className="absolute inset-y-0 w-full rounded-full bg-muted overflow-hidden flex items-center" style={{ top: '50%', transform: 'translateY(-50%)', height: 6 }}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${pct}%`,
                      background: 'linear-gradient(to right, hsl(var(--primary) / 0.6), hsl(var(--primary)))',
                    }}
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={duration || 1}
                  value={currentTime}
                  onChange={handleSeek}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </div>
              <div className="flex justify-between text-[0.625rem] tabular-nums" dir={language === "ar" ? "rtl" : "ltr"}>
                <span className="text-primary font-semibold">{formatTime(currentTime, language)}</span>
                <span className="text-muted-foreground">{duration > 0 ? formatTime(duration, language) : "--:--"}</span>
              </div>
            </div>

            {/* Loop toggle */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setLoopEnabled(!loopEnabled)}
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all",
                loopEnabled
                  ? "text-primary-foreground shadow-sm"
                  : "text-muted-foreground bg-muted hover:bg-muted/70"
              )}
              style={loopEnabled ? { background: 'hsl(var(--primary))' } : {}}
            >
              <Repeat className="h-4 w-4" />
            </motion.button>

            {/* Timer toggle */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowTimer(!showTimer)}
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all",
                showTimer || timerActive
                  ? "text-primary bg-primary/15"
                  : "text-muted-foreground bg-muted hover:bg-muted/70"
              )}
            >
              <Timer className="h-4 w-4" />
            </motion.button>
          </div>

          {/* Row 2: Surah name + reciter + download */}
          <div className="flex items-center justify-between" dir={language === "ar" ? "rtl" : "ltr"}>
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-arabic text-sm font-bold text-foreground truncate">
                  {surahName}
                </span>
                {playing && (
                  <span className="text-[0.625rem] text-primary font-semibold shrink-0 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    {t("now_playing")}
                  </span>
                )}
              </div>
              <span className="text-[0.625rem] text-muted-foreground truncate">
                {getReciterById(player.surahNumber === surahNumber ? player.playingReciterId : player.reciterId).name}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!cached && !downloading && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-[0.625rem] font-semibold text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  <Download className="h-3 w-3" />
                  {t("download")}
                </motion.button>
              )}
              {downloading && (
                <span className="flex items-center gap-1 rounded-full bg-muted ps-3 pe-1 py-1 text-[0.625rem] text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>{language === "ar" ? toArabicNumerals(`${dlProgress}%`) : `${dlProgress}%`}</span>
                  <button
                    type="button"
                    onClick={handleCancelDownload}
                    aria-label={t("cancel_download_aria")}
                    className="ms-1 rounded-full p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {cached && !downloading && (
                <span className="flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1.5 text-[0.625rem] font-semibold text-primary">
                  <Check className="h-3 w-3" />
                  {t("downloaded")}
                </span>
              )}
            </div>
          </div>

          {/* Timer section */}
          <AnimatePresence>
            {showTimer && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="border-t border-border/30 pt-3">
                  {!timerActive ? (
                    <div className="flex gap-2" dir={language === "ar" ? "rtl" : "ltr"}>
                      {TIMER_PRESETS.map((m) => (
                        <motion.button
                          key={m}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => startTimer(m)}
                          className="flex-1 rounded-xl bg-muted px-2 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                        >
                          {language === "en" ? `${m}${t("minutes_abbr")}` : `${toArabicNumerals(m)}${t("minutes_abbr")}`}
                        </motion.button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between" dir={language === "ar" ? "rtl" : "ltr"}>
                      <div className="flex items-center gap-2">
                        <Timer className="h-4 w-4 text-primary" />
                        <span className="font-arabic text-base font-bold tabular-nums text-foreground">
                          {formatTime(timerRemaining, language)}
                        </span>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={stopTimer}
                        className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted"
                      >
                        <X className="h-4 w-4" />
                      </motion.button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="px-4 pb-2">
          <p className="text-center text-[0.5625rem] text-muted-foreground/70" dir={language === "ar" ? "rtl" : "ltr"}>
            {t("audio_disclaimer")}
          </p>
        </div>
      </div>
    </div>
  );
}
