import { motion } from "framer-motion";
import { CircleCheck as CheckCircle2, Circle as XCircle, RotateCcw, Trophy, CircleAlert as AlertCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn, toArabicNumerals } from "@/lib/utils";
import type { StrictnessLevel } from "@/lib/ayah-match";

interface PerAyahResult {
  numberInSurah: number;
  score: number;
  isCorrect: boolean;
}

interface Props {
  score: number;
  correctAyahs: number;
  totalAyahs: number;
  perAyah: PerAyahResult[];
  surahName: string;
  ayahFrom: number;
  ayahTo: number;
  strictness?: StrictnessLevel;
  onTryAgain: () => void;
}

function getIslamicFeedback(score: number, t: (k: string) => string): { label: string; color: string } {
  if (score >= 85) return { label: t("islamic_feedback_excellent"), color: "text-primary" };
  if (score >= 60) return { label: t("islamic_feedback_good"), color: "text-accent" };
  return { label: t("islamic_feedback_weak"), color: "text-destructive" };
}

function getScoreRingColor(score: number): string {
  if (score >= 85) return "#22c55e";
  if (score >= 60) return "#f59e0b";
  return "#ef4444";
}

function getVerseStatus(score: number): "correct" | "partial" | "incorrect" {
  if (score >= 85) return "correct";
  if (score >= 50) return "partial";
  return "incorrect";
}

export default function RecitationScoreCard({ score, correctAyahs, totalAyahs, perAyah, surahName, ayahFrom, ayahTo, strictness = "normal", onTryAgain }: Props) {
  const { t, language, isRTL } = useLanguage();
  const feedback = getIslamicFeedback(score, t as (k: string) => string);
  const ringColor = getScoreRingColor(score);

  const circumference = 2 * Math.PI * 38;
  const strokeDash = (score / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-4"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Score circle */}
      <div className="rounded-2xl bg-card border border-border/50 shadow-elevated p-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="relative w-24 h-24">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 88 88">
              <circle cx="44" cy="44" r="38" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
              <motion.circle
                cx="44" cy="44" r="38"
                fill="none"
                stroke={ringColor}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: circumference - strokeDash }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold tabular-nums" style={{ color: ringColor }}>
                {language === "ar" ? toArabicNumerals(score) : score}%
              </span>
            </div>
          </div>
        </div>

        <h2 className="text-lg font-bold mb-1">{t("test_result")}</h2>
        <p className={cn("text-sm font-semibold mb-1 leading-relaxed", feedback.color)}>{feedback.label}</p>
        <p className="text-xs text-muted-foreground">
          {language === "ar"
            ? `سورة ${surahName} · آية ${toArabicNumerals(ayahFrom)} – ${toArabicNumerals(ayahTo)}`
            : `${surahName} · Verses ${ayahFrom}–${ayahTo}`}
        </p>
        <div className="mt-2 flex justify-center">
          <span className={cn(
            "text-[0.65rem] font-bold px-2.5 py-0.5 rounded-full",
            strictness === "lenient" ? "bg-primary/10 text-primary" :
            strictness === "normal" ? "bg-accent/10 text-accent" :
            "bg-destructive/10 text-destructive"
          )}>
            {t(`strictness_${strictness}` as Parameters<typeof t>[0])}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-primary/5 border border-primary/10 p-3">
            <p className="text-xl font-bold text-primary">
              {language === "ar" ? toArabicNumerals(correctAyahs) : correctAyahs}
              <span className="text-sm font-normal text-muted-foreground"> / {language === "ar" ? toArabicNumerals(totalAyahs) : totalAyahs}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{t("correct_ayahs")}</p>
          </div>
          <div className="rounded-xl bg-muted/50 p-3">
            <p className="text-xl font-bold text-foreground flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-accent" />
              {language === "ar" ? toArabicNumerals(score) : score}%
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{t("your_score")}</p>
          </div>
        </div>
      </div>

      {/* Per-ayah breakdown with color-coded borders */}
      {perAyah.length > 0 && (
        <div className="rounded-2xl bg-card border border-border/50 shadow-soft overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <h3 className="text-sm font-bold text-foreground">{t("per_ayah_breakdown")}</h3>
          </div>
          <div className="divide-y divide-border/40">
            {perAyah.map((a, idx) => {
              const status = getVerseStatus(a.score);
              const borderClass =
                status === "correct" ? "border-primary/50 bg-primary/5" :
                status === "partial" ? "border-accent/50 bg-accent/5" :
                "border-destructive/50 bg-destructive/5";
              const badgeClass =
                status === "correct" ? "bg-primary/15 text-primary" :
                status === "partial" ? "bg-accent/15 text-accent" :
                "bg-destructive/15 text-destructive";
              const barClass =
                status === "correct" ? "bg-primary" :
                status === "partial" ? "bg-accent" :
                "bg-destructive";
              const iconClass =
                status === "correct" ? "text-primary" :
                status === "partial" ? "text-accent" :
                "text-destructive";
              const Icon =
                status === "correct" ? CheckCircle2 :
                status === "partial" ? AlertCircle :
                XCircle;

              return (
                <motion.div
                  key={a.numberInSurah}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * idx }}
                  className={cn("flex items-center gap-3 px-4 py-3", isRTL ? "border-r-2" : "border-l-2", borderClass)}
                >
                  <span className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0", badgeClass)}>
                    {language === "ar" ? toArabicNumerals(a.numberInSurah) : a.numberInSurah}
                  </span>
                  <div className="flex-1">
                    <p className="text-xs font-semibold mb-1">
                      {status === "correct" ? t("correct") : status === "partial" ? t("partial") : t("incorrect")}
                    </p>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className={cn("h-full rounded-full", barClass)}
                        initial={{ width: 0 }}
                        animate={{ width: `${a.score}%` }}
                        transition={{ duration: 0.5, delay: 0.1 * idx }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-semibold tabular-nums w-9 text-end">
                    {language === "ar" ? toArabicNumerals(a.score) : a.score}%
                  </span>
                  <Icon className={cn("h-4 w-4 flex-shrink-0", iconClass)} />
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Try again */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onTryAgain}
        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-muted py-4 text-sm font-semibold hover:bg-muted/70 transition-colors min-h-[52px]"
      >
        <RotateCcw className="h-4 w-4" />
        {t("try_again")}
      </motion.button>
    </motion.div>
  );
}
