import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, RotateCcw, SkipForward, Trophy, XCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn, toArabicNumerals } from "@/lib/utils";
import type { StrictnessLevel, PerAyahScoreResult, WordDiff } from "@/lib/ayah-match";
import type { Ayah } from "@/lib/quran-api";

interface Props {
  score: number;
  correctAyahs: number;
  totalAyahs: number;
  perAyah: PerAyahScoreResult[];
  ayahsData: Ayah[];
  surahName: string;
  ayahFrom: number;
  ayahTo: number;
  strictness?: StrictnessLevel;
  pauseToleranceMs?: number;
  onTryAgain: () => void;
  onPracticeMistakes?: () => void;
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

function getVerseStatus(score: number, isSkipped?: boolean): "correct" | "partial" | "incorrect" | "skipped" {
  if (isSkipped) return "skipped";
  if (score >= 85) return "correct";
  if (score >= 50) return "partial";
  return "incorrect";
}

function WordHighlight({ diffs, originalText, language }: { diffs: WordDiff[]; originalText: string; language: string }) {
  if (!diffs || diffs.length === 0) {
    return (
      <p className="font-arabic text-sm leading-loose text-muted-foreground/60 text-center" dir="rtl">
        {originalText}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5 justify-center" dir="rtl">
        {diffs.map((diff, i) => {
          const isCorrect = diff.matchScore >= 85;
          const isPartial = diff.matchScore >= 50 && diff.matchScore < 85;
          const isMissing = diff.spoken === null;

          return (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <span
                className={cn(
                  "font-arabic text-sm px-1 py-0.5 rounded leading-loose",
                  isCorrect && "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10",
                  isPartial && "text-amber-700 dark:text-amber-400 bg-amber-500/10",
                  isMissing && "text-destructive bg-destructive/10 line-through decoration-destructive/70"
                )}
              >
                {diff.expected}
              </span>
              {!isCorrect && diff.spoken && (
                <span className="text-[0.6rem] text-muted-foreground font-arabic leading-none px-1">
                  {diff.spoken}
                </span>
              )}
              {isMissing && (
                <span className="text-[0.6rem] text-destructive/70 leading-none">
                  {language === "ar" ? "محذوف" : "missed"}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-4 text-[0.65rem] text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          {language === "ar" ? "صحيح" : "Correct"}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
          {language === "ar" ? "جزئي" : "Partial"}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-destructive inline-block" />
          {language === "ar" ? "مفقود/خطأ" : "Missing/Wrong"}
        </span>
      </div>
    </div>
  );
}

function AyahBreakdownRow({
  ayahResult,
  ayahText,
  index,
  language,
  isRTL,
  t,
}: {
  ayahResult: PerAyahScoreResult;
  ayahText: string;
  index: number;
  language: string;
  isRTL: boolean;
  t: (k: string) => string;
}) {
  const [expanded, setExpanded] = useState(!ayahResult.isCorrect);

  const status = getVerseStatus(ayahResult.score, !ayahResult.isCorrect && ayahResult.wordDiffs.length === 0 && ayahResult.score === 0);
  const borderClass =
    status === "correct" ? "border-primary/50 bg-primary/5" :
    status === "partial" ? "border-accent/50 bg-accent/5" :
    status === "skipped" ? "border-border/40 bg-muted/20" :
    "border-destructive/50 bg-destructive/5";
  const badgeClass =
    status === "correct" ? "bg-primary/15 text-primary" :
    status === "partial" ? "bg-accent/15 text-accent" :
    status === "skipped" ? "bg-muted text-muted-foreground" :
    "bg-destructive/15 text-destructive";
  const barClass =
    status === "correct" ? "bg-primary" :
    status === "partial" ? "bg-accent" :
    status === "skipped" ? "bg-muted-foreground/30" :
    "bg-destructive";
  const Icon =
    status === "correct" ? CheckCircle2 :
    status === "partial" ? AlertCircle :
    status === "skipped" ? SkipForward :
    XCircle;
  const iconClass =
    status === "correct" ? "text-primary" :
    status === "partial" ? "text-accent" :
    status === "skipped" ? "text-muted-foreground" :
    "text-destructive";

  const missedWords = ayahResult.wordDiffs.filter(d => d.spoken === null).length;
  const wrongWords = ayahResult.wordDiffs.filter(d => d.spoken !== null && d.matchScore < 85).length;
  const totalWords = ayahResult.wordDiffs.length;
  const correctWords = ayahResult.wordDiffs.filter(d => d.matchScore >= 85).length;

  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 * index }}
      className={cn("border-b border-border/30 last:border-0", isRTL ? "border-r-2" : "border-l-2", borderClass)}
    >
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <span className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0", badgeClass)}>
          {language === "ar" ? toArabicNumerals(ayahResult.numberInSurah) : ayahResult.numberInSurah}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-semibold">
              {status === "correct" ? t("correct") :
               status === "partial" ? t("partial") :
               status === "skipped" ? (language === "ar" ? "تم التخطي" : "Skipped") :
               t("incorrect")}
            </p>
            {totalWords > 0 && status !== "skipped" && (
              <span className="text-[0.6rem] text-muted-foreground">
                {language === "ar"
                  ? `${toArabicNumerals(correctWords)}/${toArabicNumerals(totalWords)} كلمة`
                  : `${correctWords}/${totalWords} words`}
              </span>
            )}
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              className={cn("h-full rounded-full", barClass)}
              initial={{ width: 0 }}
              animate={{ width: `${ayahResult.score}%` }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
            />
          </div>
          {!ayahResult.isCorrect && (missedWords > 0 || wrongWords > 0) && status !== "skipped" && (
            <p className="text-[0.6rem] text-muted-foreground mt-1">
              {language === "ar"
                ? `${missedWords > 0 ? `${toArabicNumerals(missedWords)} مفقودة` : ""}${missedWords > 0 && wrongWords > 0 ? " · " : ""}${wrongWords > 0 ? `${toArabicNumerals(wrongWords)} خطأ` : ""}`
                : `${missedWords > 0 ? `${missedWords} missed` : ""}${missedWords > 0 && wrongWords > 0 ? " · " : ""}${wrongWords > 0 ? `${wrongWords} wrong` : ""}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-semibold tabular-nums w-9 text-end">
            {status === "skipped" ? "—" : `${language === "ar" ? toArabicNumerals(ayahResult.score) : ayahResult.score}%`}
          </span>
          <Icon className={cn("h-4 w-4", iconClass)} />
          {expanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              <div className="rounded-xl bg-background/60 border border-border/30 p-3">
                <p className="text-[0.65rem] font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                  {language === "ar" ? "نص الآية" : "Verse Text"}
                </p>
                <p className="font-arabic text-sm leading-loose text-center text-foreground/80" dir="rtl">
                  {ayahText}
                </p>
              </div>

              {ayahResult.wordDiffs && ayahResult.wordDiffs.length > 0 && status !== "skipped" && (
                <div className="rounded-xl bg-background/60 border border-border/30 p-3">
                  <p className="text-[0.65rem] font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                    {language === "ar" ? "تحليل الكلمات" : "Word Analysis"}
                  </p>
                  <WordHighlight
                    diffs={ayahResult.wordDiffs}
                    originalText={ayahText}
                    language={language}
                  />
                </div>
              )}

              {status === "skipped" && (
                <div className="rounded-xl bg-muted/30 border border-border/20 p-3 text-center">
                  <p className="text-xs text-muted-foreground">
                    {language === "ar" ? "تم تخطي هذه الآية أثناء التلاوة" : "This verse was skipped during recitation"}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function RecitationScoreCard({
  score,
  correctAyahs,
  totalAyahs,
  perAyah,
  ayahsData,
  surahName,
  ayahFrom,
  ayahTo,
  strictness = "normal",
  pauseToleranceMs = 3200,
  onTryAgain,
  onPracticeMistakes,
}: Props) {
  const { t, language, isRTL } = useLanguage();
  const feedback = getIslamicFeedback(score, t as (k: string) => string);
  const ringColor = getScoreRingColor(score);

  const circumference = 2 * Math.PI * 38;
  const strokeDash = (score / 100) * circumference;

  const totalMissedWords = perAyah.reduce((sum, a) => sum + a.wordDiffs.filter(d => d.spoken === null).length, 0);
  const totalWrongWords = perAyah.reduce((sum, a) => sum + a.wordDiffs.filter(d => d.spoken !== null && d.matchScore < 85).length, 0);
  const incorrectAyahs = totalAyahs - correctAyahs;
  const practiceableAyahs = perAyah.filter((ayah) => !ayah.isCorrect).length;
  const strongestAyah = perAyah.reduce((best, current) => current.score > best.score ? current : best, perAyah[0]);
  const weakestAyah = perAyah.reduce((worst, current) => current.score < worst.score ? current : worst, perAyah[0]);
  const wordScores = perAyah.flatMap((ayah) => ayah.wordDiffs.map((diff) => diff.matchScore));
  const averageWordConfidence = wordScores.length > 0 ? Math.round(wordScores.reduce((sum, score) => sum + score, 0) / wordScores.length) : score;
  const commonMistakes = Object.entries(
    perAyah.flatMap((ayah) => ayah.wordDiffs)
      .filter((diff) => diff.matchScore < 85)
      .reduce<Record<string, number>>((acc, diff) => {
        acc[diff.expected] = (acc[diff.expected] ?? 0) + 1;
        return acc;
      }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const ayahTextMap = new Map(ayahsData.map(a => [a.numberInSurah, a.text]));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-4"
      dir={isRTL ? "rtl" : "ltr"}
    >
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
        <p className="mt-2 text-[0.7rem] text-muted-foreground">
          {language === "ar"
            ? `مهلة التوقف الحالية ${toArabicNumerals((pauseToleranceMs / 1000).toFixed(1))} ثانية`
            : `Current pause tolerance ${(pauseToleranceMs / 1000).toFixed(1)}s`}
        </p>

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

        {(totalMissedWords > 0 || totalWrongWords > 0 || incorrectAyahs > 0) && (
          <div className="mt-4 rounded-xl bg-destructive/5 border border-destructive/15 p-3">
            <p className="text-xs font-semibold text-destructive mb-2">
              {language === "ar" ? "ملخص الأخطاء" : "Mistakes Summary"}
            </p>
            <div className="flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
              {incorrectAyahs > 0 && (
                <span>
                  {language === "ar"
                    ? `${toArabicNumerals(incorrectAyahs)} آية غير صحيحة`
                    : `${incorrectAyahs} verse${incorrectAyahs > 1 ? "s" : ""} incorrect`}
                </span>
              )}
              {totalMissedWords > 0 && (
                <span>
                  {language === "ar"
                    ? `${toArabicNumerals(totalMissedWords)} كلمة مفقودة`
                    : `${totalMissedWords} word${totalMissedWords > 1 ? "s" : ""} missed`}
                </span>
              )}
              {totalWrongWords > 0 && (
                <span>
                  {language === "ar"
                    ? `${toArabicNumerals(totalWrongWords)} كلمة خاطئة`
                    : `${totalWrongWords} word${totalWrongWords > 1 ? "s" : ""} wrong`}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {perAyah.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl bg-card border border-border/50 p-4 shadow-soft" data-testid="recitation-analytics-confidence-card">
            <p className="text-xs text-muted-foreground mb-1">{language === "ar" ? "متوسط الثقة" : "Average confidence"}</p>
            <p className="text-xl font-bold text-foreground">{language === "ar" ? toArabicNumerals(averageWordConfidence) : averageWordConfidence}%</p>
          </div>
          <div className="rounded-2xl bg-card border border-border/50 p-4 shadow-soft" data-testid="recitation-analytics-strongest-card">
            <p className="text-xs text-muted-foreground mb-1">{language === "ar" ? "أفضل آية" : "Strongest ayah"}</p>
            <p className="text-xl font-bold text-primary">{language === "ar" ? toArabicNumerals(strongestAyah?.numberInSurah ?? 0) : strongestAyah?.numberInSurah ?? 0}</p>
          </div>
          <div className="rounded-2xl bg-card border border-border/50 p-4 shadow-soft" data-testid="recitation-analytics-weakest-card">
            <p className="text-xs text-muted-foreground mb-1">{language === "ar" ? "أضعف آية" : "Weakest ayah"}</p>
            <p className="text-xl font-bold text-destructive">{language === "ar" ? toArabicNumerals(weakestAyah?.numberInSurah ?? 0) : weakestAyah?.numberInSurah ?? 0}</p>
          </div>
        </div>
      )}

      {commonMistakes.length > 0 && (
        <div className="rounded-2xl bg-card border border-border/50 shadow-soft overflow-hidden" data-testid="recitation-common-mistakes-card">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">{language === "ar" ? "أكثر الكلمات تعثرًا" : "Most difficult words"}</h3>
            <span className="text-[0.65rem] text-muted-foreground">{language === "ar" ? "تكرار الكلمات الضعيفة" : "Repeated weak words"}</span>
          </div>
          <div className="px-4 pb-4 flex flex-wrap gap-2" dir="rtl">
            {commonMistakes.map(([word, count]) => (
              <div key={word} className="rounded-full border border-destructive/20 bg-destructive/5 px-3 py-1.5 text-sm font-arabic text-foreground">
                {word}
                <span className="ms-2 text-xs text-destructive">× {language === "ar" ? toArabicNumerals(count) : count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {perAyah.length > 0 && (
        <div className="rounded-2xl bg-card border border-border/50 shadow-soft overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">{t("per_ayah_breakdown")}</h3>
            <span className="text-[0.65rem] text-muted-foreground">
              {language === "ar" ? "اضغط لرؤية التفاصيل" : "Tap to see details"}
            </span>
          </div>
          <div>
            {perAyah.map((a, idx) => (
              <AyahBreakdownRow
                key={a.numberInSurah}
                ayahResult={a}
                ayahText={ayahTextMap.get(a.numberInSurah) ?? ""}
                index={idx}
                language={language}
                isRTL={isRTL}
                t={t as (k: string) => string}
              />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {onPracticeMistakes && practiceableAyahs > 0 && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onPracticeMistakes}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors min-h-[52px]"
            data-testid="recitation-practice-mistakes-button"
          >
            <AlertCircle className="h-4 w-4" />
            {language === "ar" ? `أعد الجزء المتعثر (${toArabicNumerals(practiceableAyahs)})` : `Practice missed part (${practiceableAyahs})`}
          </motion.button>
        )}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onTryAgain}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-muted py-4 text-sm font-semibold hover:bg-muted/70 transition-colors min-h-[52px]"
        >
          <RotateCcw className="h-4 w-4" />
          {t("try_again")}
        </motion.button>
      </div>
    </motion.div>
  );
}
