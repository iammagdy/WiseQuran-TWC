import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Target, Sparkles, ChevronDown, ArrowLeft, ArrowRight } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { toArabicNumerals } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

const DHIKR_OPTIONS = [
  { value: "سبحان الله",      labelAr: "سبحان الله",      labelEn: "SubhanAllah" },
  { value: "الحمد لله",       labelAr: "الحمد لله",       labelEn: "Alhamdulillah" },
  { value: "الله أكبر",       labelAr: "الله أكبر",       labelEn: "Allahu Akbar" },
  { value: "لا إله إلا الله", labelAr: "لا إله إلا الله", labelEn: "La ilaha illa Allah" },
  { value: "أستغفر الله",     labelAr: "أستغفر الله",     labelEn: "Astaghfirullah" },
];

const TARGET_OPTIONS = [33, 99, 100, 500, 1000];

function getTodayKey() {
  // Use the UTC date segment so the daily Tasbeeh counter rolls over at
  // the same wall-clock moment everywhere (matches how Supabase stores
  // `date` columns). Earlier revisions compared `Date` objects through
  // `toISOString().slice(0, 10)` which worked fine, but the explicit
  // helper documents the UTC contract and makes test-date overrides easy.
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `wise-tasbeeh-total-${y}-${m}-${d}`;
}

function BeadRing({ progress, isComplete }: {
  progress: number;
  isComplete: boolean;
}) {
  const BEADS = 33;
  const filledBeads = Math.round(progress * BEADS);
  const radius = 108;
  const cx = 128;
  const cy = 128;

  return (
    <svg width="256" height="256" viewBox="0 0 256 256" className="block">
      <circle
        cx={cx}
        cy={cy}
        r={72}
        className="fill-card stroke-border"
        strokeWidth={1}
      />
      {Array.from({ length: BEADS }).map((_, i) => {
        const angle = (i / BEADS) * 2 * Math.PI - Math.PI / 2;
        const bx = cx + radius * Math.cos(angle);
        const by = cy + radius * Math.sin(angle);
        const filled = i < filledBeads;

        return (
          <circle
            key={i}
            cx={bx}
            cy={by}
            r={filled ? 5.5 : 4}
            className={
              filled
                ? isComplete
                  ? "fill-amber-500"
                  : "fill-primary"
                : "fill-muted"
            }
            opacity={filled ? 1 : 0.6}
          />
        );
      })}
    </svg>
  );
}

function CounterDisplay({ count, target, isComplete }: {
  count: number;
  target: number;
  isComplete: boolean;
}) {
  const { language } = useLanguage();
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
      <motion.span
        key={count}
        initial={{ scale: 1.15, opacity: 0.7 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.15 }}
        className={`text-[44px] font-bold leading-none tabular-nums ${isComplete ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}
      >
        {language === "ar" ? toArabicNumerals(count) : count}
      </motion.span>
      <span className="text-sm text-muted-foreground mt-1">
        / {language === "ar" ? toArabicNumerals(target) : target}
      </span>
      <AnimatePresence>
        {isComplete && (
          <motion.span
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 3 }}
            className="text-[10px] font-bold mt-1 text-amber-600 dark:text-amber-400"
          >
            {language === "ar" ? "ما شاء الله" : "Masha'Allah"}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TasbeehPage() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const isRTL = language === "ar";
  const [target, setTarget] = useLocalStorage("wise-tasbeeh-target", 33);
  const [count, setCount] = useLocalStorage("wise-tasbeeh-count", 0);
  const [dhikr, setDhikr] = useLocalStorage("wise-tasbeeh-dhikr", DHIKR_OPTIONS[0].value);
  const [todayTotal, setTodayTotal] = useLocalStorage(getTodayKey(), 0);
  const [showTargetPicker, setShowTargetPicker] = useState(false);
  const [showDhikrPicker, setShowDhikrPicker] = useState(false);
  const [showSparkle, setShowSparkle] = useState(false);

  const progress = useMemo(() => Math.min(count / target, 1), [count, target]);
  const isComplete = count >= target;

  const currentDhikr = DHIKR_OPTIONS.find(d => d.value === dhikr) ?? DHIKR_OPTIONS[0];

  const handleTap = useCallback(() => {
    if (navigator.vibrate) navigator.vibrate(10);
    setCount((c) => c + 1);
    setTodayTotal((t) => t + 1);
    if ((count + 1) % 33 === 0) {
      setShowSparkle(true);
      setTimeout(() => setShowSparkle(false), 1200);
    }
  }, [setCount, setTodayTotal, count]);

  const handleReset = useCallback(() => {
    setCount(0);
    setShowTargetPicker(false);
  }, [setCount]);

  const anyPickerOpen = showTargetPicker || showDhikrPicker;

  return (
    <div
      className="flex flex-col px-4 pt-5 min-h-[calc(100dvh-4rem)] pb-5 relative overflow-hidden"
      dir={language === "en" ? "ltr" : "rtl"}
      onClick={anyPickerOpen ? () => { setShowTargetPicker(false); setShowDhikrPicker(false); } : undefined}
    >
      {/* Subtle arabesque background */}
      <div className="absolute inset-0 pattern-islamic pointer-events-none opacity-60" />
      <div className="absolute inset-0 gradient-spiritual pointer-events-none" />

      <div className="relative z-10 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            className="rounded-xl p-2 hover:bg-muted/60 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            {isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
          </motion.button>
          <h1 className="flex-1 text-2xl font-bold text-foreground heading-decorated text-center pe-9">{t("tasbeeh_title")}</h1>
        </div>

        {/* Today total badge */}
        <div className="flex justify-center mb-3">
          <div className="flex items-center gap-2 glass-card rounded-full px-4 py-1.5 shadow-soft">
            <span className="text-xs text-muted-foreground">{t("today_total")}:</span>
            <span className="font-bold text-primary text-sm">
              {language === "ar" ? toArabicNumerals(todayTotal) : todayTotal}
            </span>
          </div>
        </div>

        {/* Dhikr selector */}
        <div className="flex justify-center mb-4">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => { setShowDhikrPicker(!showDhikrPicker); setShowTargetPicker(false); }}
            className="flex items-center gap-2 glass-card rounded-2xl px-5 py-2.5 shadow-soft min-w-[200px] justify-between"
          >
            <span className="font-bold text-base font-arabic text-foreground">
              {language === "ar" ? currentDhikr.labelAr : currentDhikr.labelEn}
            </span>
            <motion.div animate={{ rotate: showDhikrPicker ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </motion.div>
          </motion.button>
        </div>

        <AnimatePresence>
          {showDhikrPicker && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className="mx-auto w-full max-w-[280px] mb-4 glass-card rounded-2xl shadow-elevated overflow-hidden"
            >
              {DHIKR_OPTIONS.map((d, i) => (
                <motion.button
                  key={d.value}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setDhikr(d.value);
                    setCount(0);
                    setShowDhikrPicker(false);
                  }}
                  className={`w-full px-4 py-3 text-center font-arabic font-semibold text-sm transition-colors ${
                    d.value === dhikr
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted/50"
                  } ${i > 0 ? "border-t border-border/30" : ""}`}
                >
                  {language === "ar" ? d.labelAr : d.labelEn}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bead Ring Counter */}
        <div className="flex items-center justify-center relative mb-4">
          {showSparkle && (
            <motion.div
              initial={{ scale: 0.5, opacity: 1 }}
              animate={{ scale: 2.2, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <Sparkles className="h-12 w-12 text-gold" />
            </motion.div>
          )}

          {isComplete && (
            <motion.div
              className="absolute inset-0 rounded-full pointer-events-none"
              animate={{ opacity: [0.3, 0.1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                background: "radial-gradient(circle, hsl(var(--gold) / 0.15) 0%, transparent 70%)"
              }}
            />
          )}

          <motion.button
            className="relative block select-none outline-none focus:outline-none"
            whileTap={{ scale: 0.96 }}
            onTap={handleTap}
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <BeadRing
              progress={progress}
              isComplete={isComplete}
            />
            <CounterDisplay
              count={count}
              target={target}
              isComplete={isComplete}
            />
          </motion.button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2.5 justify-center mb-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleReset}
            className="flex items-center gap-2 glass-card rounded-xl px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted shadow-soft transition-all"
          >
            <RotateCcw className="h-4 w-4" />
            {t("reset")}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => { setShowTargetPicker(!showTargetPicker); setShowDhikrPicker(false); }}
            className={`flex items-center gap-2 border rounded-xl px-4 py-2.5 text-sm font-semibold transition-all shadow-soft ${
              showTargetPicker
                ? "bg-primary/10 border-primary/30 text-primary"
                : "glass-card text-muted-foreground hover:bg-muted"
            }`}
          >
            <Target className="h-4 w-4" />
            {t("target")}: {language === "ar" ? toArabicNumerals(target) : target}
          </motion.button>
        </div>

        {/* Target picker */}
        <AnimatePresence>
          {showTargetPicker && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex flex-wrap gap-2 justify-center mb-2"
            >
              {TARGET_OPTIONS.map((opt) => (
                <motion.button
                  key={opt}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => { setTarget(opt); setCount(0); setShowTargetPicker(false); }}
                  className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all border min-h-[44px] flex items-center justify-center ${
                    target === opt
                      ? "bg-primary text-primary-foreground border-primary shadow-glow"
                      : "bg-card border-border/40 text-foreground hover:bg-muted"
                  }`}
                >
                  {language === "ar" ? toArabicNumerals(opt) : opt}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
