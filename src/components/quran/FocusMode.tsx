import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Timer } from "lucide-react";
import { type Ayah } from "@/lib/quran-api";
import { cn, toArabicNumerals, stripBismillah, formatTime } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface FocusModeProps {
  ayahs: Ayah[];
  fontSize: number;
  lineHeight: number;
  readerToneClass: string;
  focusPreset: "standard" | "calm";
  surahNumber: number;
  surahName: string;
  playingAyah: number | null;
  onSeekToAyah: (n: number) => void;
  onClose: () => void;
}


export default function FocusMode({
  ayahs,
  fontSize,
  lineHeight,
  readerToneClass,
  focusPreset,
  surahNumber,
  surahName,
  playingAyah,
  onSeekToAyah,
  onClose,
}: FocusModeProps) {
  const [elapsed, setElapsed] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimeout = useRef<ReturnType<typeof setTimeout>>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t, language } = useLanguage();

  // Timer
  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Auto-hide controls after 4s
  useEffect(() => {
    resetControlsTimeout();
    return () => clearTimeout(hideTimeout.current);
  }, []);

  function resetControlsTimeout() {
    setControlsVisible(true);
    clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => setControlsVisible(false), 4000);
  }

  // Auto-scroll to playing ayah
  useEffect(() => {
    if (!playingAyah || !scrollRef.current) return;
    const el = scrollRef.current.querySelector(`[data-focus-ayah="${playingAyah}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [playingAyah]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[60] flex flex-col"
      style={{
        background: focusPreset === "calm"
          ? "linear-gradient(180deg, hsl(var(--background)) 0%, rgba(16,185,129,0.12) 45%, hsl(var(--background)) 100%)"
          : "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--muted)) 50%, hsl(var(--background)) 100%)",
      }}
      onClick={resetControlsTimeout}
    >
      {/* Always-visible close hint — stays visible even when controls auto-hide */}
      <button
        onClick={onClose}
        className="absolute top-4 start-4 z-20 rounded-full bg-foreground/10 backdrop-blur-sm p-2 opacity-40 hover:opacity-100 transition-opacity min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label={t("close_focus")}
      >
        <X className="h-4 w-4 text-foreground" />
      </button>

      {/* Minimal header — auto-hides */}
      <AnimatePresence>
        {controlsVisible && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-5 pt-safe-top py-4"
          >
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="rounded-full bg-muted/80 backdrop-blur-sm p-2.5 shadow-soft border border-border/30 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="h-5 w-5 text-foreground" />
            </motion.button>

            <div className="text-center">
              <p className="text-xs font-semibold text-foreground/70">{surahName}</p>
            </div>

            <div className="flex items-center gap-1.5 rounded-full bg-muted/80 backdrop-blur-sm px-3 py-1.5 shadow-soft border border-border/30">
              <Timer className="h-3.5 w-3.5 text-primary" />
              <span className="text-sm font-bold text-foreground tabular-nums" dir="ltr">
                {formatTime(elapsed, language)}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrollable ayah text */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 pt-20 pb-12 scroll-smooth"
        dir="rtl"
      >
        {/* Bismillah */}
        {surahNumber !== 1 && surahNumber !== 9 && (
          <div className="mb-10 text-center">
            <p
              className="font-arabic text-muted-foreground/80 inline-block"
              style={{ fontSize: fontSize * 0.85 }}
            >
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </p>
          </div>
        )}

        <div className="max-w-2xl mx-auto">
          <p
            className={cn("font-arabic text-justify", readerToneClass)}
            style={{ fontSize: fontSize + 2, lineHeight }}
          >
            {ayahs.map((ayah) => (
              <span
                key={ayah.numberInSurah}
                data-focus-ayah={ayah.numberInSurah}
                className={cn(
                  "transition-all duration-300",
                  playingAyah === ayah.numberInSurah && "text-primary font-bold"
                )}
              >
                {stripBismillah(ayah.text, surahNumber, ayah.numberInSurah)}{" "}
                <button
                  onClick={() => onSeekToAyah(ayah.numberInSurah)}
                  className="inline-flex items-center justify-center text-primary/50 hover:text-primary transition-colors min-h-[44px] min-w-[44px] rounded-md"
                  style={{ fontSize: (fontSize + 2) * 0.6 }}
                >
                  ﴿{toArabicNumerals(ayah.numberInSurah)}﴾
                </button>{" "}
              </span>
            ))}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
