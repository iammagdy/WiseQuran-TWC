import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Pause, Loader as Loader2, SkipBack, SkipForward, Check, Copy } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { getReciterById } from "@/lib/reciters";
import { toArabicNumerals } from "@/lib/utils";
import { fetchSurahAyahs, type Ayah } from "@/lib/quran-api";
import { useLanguage } from "@/contexts/LanguageContext";

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5] as const;

interface NowPlayingScreenProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CopyAyahButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <motion.button
      whileTap={{ scale: 0.88 }}
      onClick={handleCopy}
      className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition-all"
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
            <Check className="h-3.5 w-3.5 text-primary" />
          </motion.div>
        ) : (
          <motion.div key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
            <Copy className="h-3.5 w-3.5" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

export default function NowPlayingScreen({ open, onOpenChange }: NowPlayingScreenProps) {
  const {
    surahNumber,
    surahName,
    playing,
    loading,
    playingReciterId,
    currentTime,
    duration,
    currentAyahInSurah,
    togglePlayPause,
    seekToAyah,
    seek,
    setPlaybackRate,
    playNextSurah,
    playPreviousSurah,
    hasPrev,
    hasNext,
  } = useAudioPlayer();

  const { t, language } = useLanguage();

  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [loadingAyahs, setLoadingAyahs] = useState(false);
  const [speed, setSpeed] = useState(1);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const currentAyahRef = useRef<HTMLDivElement>(null);
  const ayahRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (open && surahNumber) {
      setLoadingAyahs(true);
      fetchSurahAyahs(surahNumber)
        .then((data) => {
          setAyahs(data || []);
          setLoadingAyahs(false);
        })
        .catch(() => setLoadingAyahs(false));
    }
  }, [open, surahNumber]);

  useEffect(() => {
    if (currentAyahInSurah === null) return;
    const el = ayahRefs.current.get(currentAyahInSurah);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentAyahInSurah]);

  const handleSpeedChange = useCallback((s: number) => {
    setSpeed(s);
    setPlaybackRate(s);
  }, [setPlaybackRate]);

  if (!surahNumber) return null;

  const reciter = getReciterById(playingReciterId);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (language === "ar") {
      return `${toArabicNumerals(mins)}:${toArabicNumerals(secs.toString().padStart(2, "0"))}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full h-full w-full p-0 border-0 bg-background rounded-none data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100 [&>button:last-child]:hidden">
        <div className="flex flex-col h-full safe-area-bottom">
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-4 border-b border-border/50"
            style={{ background: 'hsl(var(--card))' }}
          >
            <button
              onClick={() => onOpenChange(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/60 hover:bg-muted transition-all active:scale-95"
              aria-label={t("close")}
            >
              <X className="h-5 w-5 text-foreground" strokeWidth={2} />
            </button>
            <div className="flex-1 text-center px-4">
              <h2 className="font-arabic text-xl font-bold text-foreground">{surahName}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {language === "en" && reciter.nameEn ? reciter.nameEn : reciter.name}
              </p>
            </div>
            <div className="w-10" />
          </div>

          {/* Ayah list */}
          <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
            {loadingAyahs ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-2.5 py-5 pb-44">
                {ayahs.map((ayah) => {
                  const isCurrentAyah = currentAyahInSurah === ayah.numberInSurah;
                  return (
                    <motion.div
                      key={ayah.number}
                      ref={(el) => {
                        if (el) ayahRefs.current.set(ayah.numberInSurah, el);
                        else ayahRefs.current.delete(ayah.numberInSurah);
                      }}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      onClick={() => seekToAyah(ayah.numberInSurah)}
                      className="relative rounded-2xl p-5 cursor-pointer transition-all duration-300 active:scale-[0.98]"
                      style={isCurrentAyah ? {
                        background: 'hsl(var(--primary) / 0.1)',
                        border: '1.5px solid hsl(var(--primary) / 0.35)',
                        boxShadow: '0 0 20px -6px hsl(var(--primary) / 0.3)',
                      } : {
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all"
                          style={isCurrentAyah ? {
                            background: 'hsl(var(--primary))',
                            color: 'hsl(var(--primary-foreground))',
                            transform: 'scale(1.1)',
                          } : {
                            background: 'hsl(var(--muted))',
                            color: 'hsl(var(--foreground))',
                          }}
                        >
                          {language === "ar" ? toArabicNumerals(ayah.numberInSurah) : ayah.numberInSurah}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className="font-arabic leading-loose transition-all"
                            style={{
                              fontSize: isCurrentAyah ? 22 : 19,
                              color: 'hsl(var(--foreground))',
                              fontWeight: isCurrentAyah ? 600 : 400,
                            }}
                          >
                            {ayah.text}
                          </p>
                        </div>
                        <CopyAyahButton text={ayah.text} />
                      </div>
                      {isCurrentAyah && (
                        <motion.div
                          layoutId="nowPlayingIndicator"
                          className="absolute -right-0.5 top-4 bottom-4 w-1 rounded-full"
                          style={{ background: 'hsl(var(--primary))' }}
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Bottom controls */}
          <div
            className="border-t border-border/50 px-5 py-5 pb-6 space-y-4"
            style={{ background: 'hsl(var(--card))' }}
          >
            {/* Interactive progress bar */}
            <div className="space-y-2">
              <div
                className="relative h-2 w-full rounded-full cursor-pointer group"
                style={{ background: 'hsl(var(--muted))' }}
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
                    width: `${progressPercent}%`,
                    background: 'linear-gradient(to right, hsl(var(--primary) / 0.6), hsl(var(--primary)))',
                  }}
                  transition={{ duration: 0.3 }}
                />
                {/* Visible thumb */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full shadow-md transition-all"
                  style={{
                    left: `calc(${progressPercent}% - 8px)`,
                    background: 'hsl(var(--primary))',
                    border: '2px solid hsl(var(--card))',
                  }}
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
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls row */}
            <div className="flex items-center justify-between px-2">
              {/* Speed pill */}
              <div className="flex gap-1">
                {SPEED_OPTIONS.map((s) => (
                  <motion.button
                    key={s}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleSpeedChange(s)}
                    className="rounded-lg px-2 py-1 text-[0.625rem] font-bold transition-all"
                    style={speed === s ? {
                      background: 'hsl(var(--primary))',
                      color: 'hsl(var(--primary-foreground))',
                    } : {
                      background: 'hsl(var(--muted))',
                      color: 'hsl(var(--muted-foreground))',
                    }}
                  >
                    {s}x
                  </motion.button>
                ))}
              </div>

              {/* Prev / Play / Next */}
              <div className="flex items-center gap-4">
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={playPreviousSurah}
                  disabled={!hasPrev}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-foreground/70 hover:text-foreground transition-all disabled:opacity-30"
                  style={{ background: 'hsl(var(--muted))' }}
                >
                  <SkipBack className="h-5 w-5" />
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={togglePlayPause}
                  disabled={loading}
                  className="flex h-16 w-16 items-center justify-center rounded-full text-primary-foreground disabled:opacity-50 shadow-lg"
                  style={{ background: 'hsl(var(--primary))' }}
                >
                  {loading ? (
                    <Loader2 className="h-7 w-7 animate-spin" strokeWidth={2.5} />
                  ) : playing ? (
                    <Pause className="h-7 w-7" strokeWidth={2.5} />
                  ) : (
                    <Play className="h-7 w-7 translate-x-[-2px]" strokeWidth={2.5} />
                  )}
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={playNextSurah}
                  disabled={!hasNext}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-foreground/70 hover:text-foreground transition-all disabled:opacity-30"
                  style={{ background: 'hsl(var(--muted))' }}
                >
                  <SkipForward className="h-5 w-5" />
                </motion.button>
              </div>

              <div className="w-20" />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
