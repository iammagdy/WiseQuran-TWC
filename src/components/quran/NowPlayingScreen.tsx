import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Copy, Loader2, Pause, Play, SkipBack, SkipForward, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAudioPlayerState, useAudioPlayerTime } from "@/hooks/useAudioPlayer";
import { getReciterById } from "@/lib/reciters";
import { toArabicNumerals, cn } from "@/lib/utils";
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
      className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition-all"
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
    togglePlayPause,
    seekToAyah,
    seek,
    setPlaybackRate,
    playNextSurah,
    playPreviousSurah,
    hasPrev,
    hasNext,
  } = useAudioPlayerState();
  const { currentTime, duration, currentAyahInSurah } = useAudioPlayerTime();

  const { t, language, isRTL } = useLanguage();

  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [loadingAyahs, setLoadingAyahs] = useState(false);
  const [speed, setSpeed] = useState(1);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
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
    if (currentAyahInSurah === null || loadingAyahs) return;
    
    const scroll = () => {
      const el = ayahRefs.current.get(currentAyahInSurah);
      if (el) {
        // Use auto behavior for the first scroll after loading to be instant,
        // then smooth for subsequent ayah changes.
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };
    
    // Always call scroll when dependencies change
    scroll();
    
    // If we just finished loading or opened, give layout sub-system time to calculate positions
    const timeoutId = setTimeout(scroll, 500);
    return () => clearTimeout(timeoutId);
  }, [currentAyahInSurah, open, loadingAyahs]);

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
    if (isRTL) {
      return `${toArabicNumerals(mins)}:${toArabicNumerals(secs.toString().padStart(2, "0"))}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full h-[100dvh] w-full p-0 border-0 bg-background rounded-none data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100 [&>button:last-child]:hidden overflow-hidden">
        <DialogTitle className="sr-only">{surahName}</DialogTitle>
        <DialogDescription className="sr-only">
          {language === "ar"
            ? `مشغل التلاوة لسورة ${surahName} بصوت ${language === "en" && reciter.nameEn ? reciter.nameEn : reciter.name}`
            : `Recitation player for ${surahName} by ${reciter.nameEn ?? reciter.name}`}
        </DialogDescription>
        <div 
          className="flex flex-col h-full relative overflow-hidden"
          dir={isRTL ? "rtl" : "ltr"}
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 pattern-islamic opacity-[0.03] pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />

          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4 border-b border-white/5 relative z-10 glass-card"
          >
            <button
              onClick={() => onOpenChange(false)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95 shadow-inner"
              aria-label={t("close")}
            >
              <X className="h-5 w-5 text-foreground/80" strokeWidth={2} />
            </button>
            <div className="flex-1 text-center px-4">
              <h2 className="font-serif text-2xl font-bold text-foreground tracking-tight leading-none mb-1">{surahName}</h2>
              <p className="text-[10px] text-muted-foreground/60 uppercase tracking-[0.2em] font-bold">
                {language === "en" && reciter.nameEn ? reciter.nameEn : reciter.name}
              </p>
            </div>
            <div className="w-10 shrink-0" />
          </div>

          {/* Ayah list */}
          <ScrollArea className="flex-1 px-4 relative z-0" ref={scrollAreaRef}>
            {loadingAyahs ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary/40" strokeWidth={1.5} />
                <p className="text-xs text-muted-foreground/40 uppercase tracking-widest font-bold">Loading Verses</p>
              </div>
            ) : (
              <div className="space-y-4 py-8 pb-64">
                {ayahs.map((ayah) => {
                  const isCurrentAyah = currentAyahInSurah === ayah.numberInSurah;
                  return (
                    <motion.div
                      key={ayah.number}
                      ref={(el) => {
                        if (el) ayahRefs.current.set(ayah.numberInSurah, el);
                        else ayahRefs.current.delete(ayah.numberInSurah);
                      }}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => seekToAyah(ayah.numberInSurah)}
                      className={cn(
                        "relative rounded-[2rem] p-6 cursor-pointer transition-all duration-500 active:scale-[0.98] border group overflow-hidden",
                        isCurrentAyah 
                          ? "glass-card border-primary/30 shadow-2xl bg-primary/[0.03]" 
                          : "bg-white/[0.02] border-white/5 hover:border-white/10"
                      )}
                    >
                      {isCurrentAyah && (
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent opacity-50" />
                      )}
                      
                      <div className="flex items-start gap-5 relative z-10">
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition-all shadow-inner border",
                            isCurrentAyah 
                              ? "bg-primary text-primary-foreground border-primary shadow-lg scale-110" 
                              : "bg-white/5 text-muted-foreground border-white/10 group-hover:bg-white/10 group-hover:text-foreground"
                          )}
                        >
                          {language === "ar" ? toArabicNumerals(ayah.numberInSurah) : ayah.numberInSurah}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              "font-arabic leading-[1.8] transition-all text-foreground",
                              isRTL ? "text-end" : "text-start",
                              isCurrentAyah ? "text-2xl font-bold" : "text-xl opacity-80"
                            )}
                          >
                            {ayah.text}
                          </p>
                        </div>
                        <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <CopyAyahButton text={ayah.text} />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Bottom controls - Floating Glass Panel */}
          <div
            className="absolute bottom-0 inset-x-0 z-20 px-4 pb-8 pt-4"
          >
            <div className="glass-card rounded-[2.5rem] border border-white/10 shadow-3xl p-6 sm:p-8 max-w-lg mx-auto overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50 pointer-events-none" />
              
              <div className="relative z-10 space-y-6">
                {/* Interactive progress bar - Liquid style */}
                <div className="space-y-3">
                  <div
                    className="relative h-2 w-full rounded-full cursor-pointer group bg-white/5 overflow-hidden border border-white/5"
                    onClick={(e) => {
                      if (duration > 0) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const pctClick = (e.clientX - rect.left) / rect.width;
                        seek(pctClick * duration);
                      }
                    }}
                  >
                    <motion.div
                      className="absolute inset-y-0 start-0 rounded-full"
                      style={{
                        width: `${progressPercent}%`,
                        background: 'linear-gradient(to right, hsl(var(--primary) / 0.4), hsl(var(--primary)))',
                        boxShadow: '0 0 15px hsl(var(--primary) / 0.3)',
                      }}
                      transition={{ type: "spring", stiffness: 100, damping: 20 }}
                    />
                    <input
                      type="range"
                      min={0}
                      max={duration || 1}
                      value={currentTime}
                      onChange={(e) => seek(Number(e.target.value))}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0 z-10"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest" dir="ltr">
                    <span className="bg-white/5 px-2 py-0.5 rounded-md border border-white/5">{formatTime(currentTime)}</span>
                    <span className="bg-white/5 px-2 py-0.5 rounded-md border border-white/5">{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Controls row */}
                <div className="flex items-center justify-between gap-4">
                  {/* Speed toggle */}
                  <div className="flex h-11 items-center bg-white/5 rounded-2xl p-1 border border-white/5 shrink-0">
                    {SPEED_OPTIONS.map((s) => (
                      <motion.button
                        key={s}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleSpeedChange(s)}
                        className={cn(
                          "px-2.5 h-full rounded-xl text-[10px] font-bold transition-all uppercase tracking-tighter",
                          speed === s 
                            ? "bg-primary text-primary-foreground shadow-lg" 
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {s}x
                      </motion.button>
                    ))}
                  </div>

                  {/* Main Playback Group */}
                  <div className="flex items-center gap-4">
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={playPreviousSurah}
                      disabled={!hasPrev}
                      className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-foreground/70 hover:text-foreground hover:bg-white/10 transition-all disabled:opacity-20 shadow-inner"
                    >
                      <SkipBack className="h-5 w-5" />
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={togglePlayPause}
                      disabled={loading}
                      className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] text-primary-foreground disabled:opacity-50 shadow-2xl relative overflow-hidden group/play"
                      style={{ background: 'hsl(var(--primary))' }}
                    >
                      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/play:opacity-100 transition-opacity" />
                      {loading ? (
                        <Loader2 className="h-7 w-7 animate-spin" strokeWidth={2.5} />
                      ) : playing ? (
                        <Pause className="h-7 w-7" strokeWidth={2.5} />
                      ) : (
                        <Play className="h-7 w-7 translate-x-[2px]" strokeWidth={2.5} />
                      )}
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={playNextSurah}
                      disabled={!hasNext}
                      className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-foreground/70 hover:text-foreground hover:bg-white/10 transition-all disabled:opacity-20 shadow-inner"
                    >
                      <SkipForward className="h-5 w-5" />
                    </motion.button>
                  </div>
                  
                  <div className="w-10 sm:w-16 shrink-0 hidden sm:block" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
