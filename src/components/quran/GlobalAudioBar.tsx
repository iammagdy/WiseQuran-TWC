import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Loader as Loader2, X, SkipBack, SkipForward } from "lucide-react";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { getReciterById } from "@/lib/reciters";
import { toArabicNumerals } from "@/lib/utils";
import NowPlayingScreen from "./NowPlayingScreen";
import { useLanguage } from "@/contexts/LanguageContext";

function WaveformBars({ playing }: { playing: boolean }) {
  const bars = [0.6, 1, 0.75, 1, 0.5];
  return (
    <div className="flex items-center gap-[2px] h-4">
      {bars.map((height, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full bg-primary"
          animate={playing ? {
            scaleY: [height, 1, height * 0.4, 1, height],
          } : { scaleY: 0.3 }}
          transition={playing ? {
            duration: 0.9,
            repeat: Infinity,
            delay: i * 0.12,
            ease: "easeInOut",
          } : { duration: 0.3 }}
          style={{ height: 16, originY: 0.5 }}
        />
      ))}
    </div>
  );
}

export default function GlobalAudioBar() {
  const {
    surahNumber, surahName, playing, loading, playingReciterId,
    togglePlayPause, stop, totalAyahs, currentAyahInSurah,
    currentTime, duration, seek,
    playNextSurah, playPreviousSurah, hasPrev, hasNext,
  } = useAudioPlayer();

  const [showNowPlaying, setShowNowPlaying] = useState(false);
  const { t, language } = useLanguage();

  if (!surahNumber) return null;

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    const base = `${m}:${sec.toString().padStart(2, "0")}`;
    return language === "ar" ? toArabicNumerals(base) : base;
  };

  const reciter = getReciterById(playingReciterId);
  const reciterName = language === "en" && reciter.nameEn ? reciter.nameEn : reciter.name;

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className="fixed inset-x-0 z-[51] px-3 pb-3 pointer-events-none"
      style={{ bottom: 'calc(var(--nav-height) + env(safe-area-inset-bottom, 0px) + 0.5rem)' }}
    >
      <div
        className="rounded-2xl pointer-events-auto overflow-hidden"
        style={{
          background: 'hsl(var(--card))',
          boxShadow: '0 -4px 32px -4px hsl(var(--primary) / 0.18), 0 8px 32px -8px hsl(0 0% 0% / 0.25)',
          border: '1px solid hsl(var(--primary) / 0.2)',
        }}
      >
        {/* Interactive progress bar */}
        <div className="relative h-1 w-full bg-muted/60 group cursor-pointer"
          onClick={(e) => {
            if (duration > 0) {
              const rect = e.currentTarget.getBoundingClientRect();
              const pctClick = (e.clientX - rect.left) / rect.width;
              seek(pctClick * duration);
            }
          }}
        >
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${pct}%`,
              background: 'linear-gradient(to right, hsl(var(--primary) / 0.7), hsl(var(--primary)))',
            }}
            transition={{ duration: 0.3 }}
          />
          <input
            type="range"
            min={0}
            max={duration || 1}
            value={currentTime}
            onChange={(e) => seek(Number(e.target.value))}
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>

        <div
          className="px-4 py-3 cursor-pointer active:scale-[0.99] transition-transform"
          onClick={() => setShowNowPlaying(true)}
          dir={language === "ar" ? "rtl" : "ltr"}
        >
          {/* Row 1: waveform + info + close */}
          <div className="flex items-center gap-3 mb-2.5">
            <div className="shrink-0 pointer-events-none">
              <WaveformBars playing={playing} />
            </div>

            <div className="flex-1 min-w-0 pointer-events-none">
              <p className="font-arabic text-sm font-bold text-foreground truncate leading-tight">{surahName}</p>
              <p className="text-[0.625rem] text-muted-foreground truncate mt-0.5">
                {reciterName}
                {currentAyahInSurah !== null && totalAyahs > 0 && (
                  <span className="ms-1.5">
                    · {language === "ar" ? toArabicNumerals(currentAyahInSurah) : currentAyahInSurah}
                    {" / "}
                    {language === "ar" ? toArabicNumerals(totalAyahs) : totalAyahs}
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[0.6rem] text-muted-foreground/70 tabular-nums pointer-events-none">
                {formatTime(currentTime)}
              </span>
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={(e) => { e.stopPropagation(); stop(); }}
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/60 transition-colors z-10"
              >
                <X className="h-3.5 w-3.5" />
              </motion.button>
            </div>
          </div>

          {/* Row 2: controls */}
          <div className="flex items-center justify-between">
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={(e) => { e.stopPropagation(); playPreviousSurah(); }}
              disabled={!hasPrev}
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/60 transition-colors disabled:opacity-30 z-10"
            >
              <SkipBack className="h-4 w-4" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); togglePlayPause(); }}
              disabled={loading}
              className="flex h-11 w-11 items-center justify-center rounded-full text-primary-foreground disabled:opacity-50 z-10 shadow-md"
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

            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={(e) => { e.stopPropagation(); playNextSurah(); }}
              disabled={!hasNext}
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/60 transition-colors disabled:opacity-30 z-10"
            >
              <SkipForward className="h-4 w-4" />
            </motion.button>
          </div>
        </div>
      </div>

      <NowPlayingScreen open={showNowPlaying} onOpenChange={setShowNowPlaying} />
    </motion.div>
  );
}
