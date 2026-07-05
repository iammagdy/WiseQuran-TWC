import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Check, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDailyWird, type WirdPlan } from "@/hooks/useDailyWird";
import { cn, toArabicNumerals } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";

const PLAN_OPTIONS: {plan: WirdPlan; days: number; labelAr: string; labelEn: string;}[] = [
{ plan: 30, days: 30, labelAr: "٣٠ يوم (جزء/يوم)", labelEn: "30 days (1 Juz/day)" },
{ plan: 60, days: 60, labelAr: "٦٠ يوم", labelEn: "60 days" },
{ plan: 90, days: 90, labelAr: "٩٠ يوم", labelEn: "90 days" },
{ plan: 180, days: 180, labelAr: "١٨٠ يوم", labelEn: "180 days" }];


export function DailyWird() {
  const navigate = useNavigate();
  const { state, startPlan, resetPlan, markTodayDone, getTodayPortion, progress } = useDailyWird();
  const [showSetup, setShowSetup] = useState(false);
  const portion = getTodayPortion();
  const { t, language, isRTL } = useLanguage();

  if (!state) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-card p-4 shadow-elevated border-border/50 mb-[10px] pt-[5px] pb-px border-2"
        dir={language === "en" ? "ltr" : "rtl"}>

        <div className="items-center justify-between flex flex-row mb-[5px]">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold">{t("daily_wird")}</span>
          </div>
          <button onClick={() => setShowSetup(!showSetup)} className="text-xs text-primary font-medium">
            {t("start_khatm_plan")}
          </button>
        </div>
        <AnimatePresence>
          {showSetup &&
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="grid grid-cols-2 gap-2 pt-2">
                {PLAN_OPTIONS.map((opt) =>
              <button
                key={opt.plan}
                onClick={() => startPlan(opt.plan)}
                className="rounded-xl bg-primary/10 p-3 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors">

                    {language === "en" ? opt.labelEn : opt.labelAr}
                  </button>
              )}
              </div>
            </motion.div>
          }
        </AnimatePresence>
      </motion.div>);

  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-5 rounded-2xl bg-card p-4 shadow-elevated border border-primary/10"
      dir={language === "en" ? "ltr" : "rtl"}>

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold">{t("daily_wird")}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">
            {language === "en" ? `${progress}${t("percent_of_khatm")}` : `${toArabicNumerals(progress)}${t("percent_of_khatm")}`}
          </span>
          <button onClick={resetPlan} className="rounded-lg p-1.5 hover:bg-muted transition-colors text-muted-foreground" title={t("restart")}>
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <Progress value={progress} variant="gradient" size="sm" className="mb-3" />

      {portion &&
      <div className="flex items-center justify-between">
          <button
          onClick={() => {
            if (!portion.isDone) markTodayDone();
            navigate(`/surah/${portion.startSurah}?ayah=${portion.startAyah}`);
          }}
          className={cn(
            `flex-1 rounded-xl p-3 ${isRTL ? "text-end" : "text-start"} transition-all`,
            portion.isDone ?
            "bg-primary/10 border border-primary/20" :
            "bg-muted/50 hover:bg-muted"
          )}>

            <div className="flex items-center gap-2 mb-1">
              {portion.isDone && <Check className="h-4 w-4 text-primary" />}
              <span className="text-xs text-muted-foreground">
                {t("day")} {language === "en" ? portion.dayIndex : toArabicNumerals(portion.dayIndex)} / {language === "en" ? portion.totalDays : toArabicNumerals(portion.totalDays)}
              </span>
            </div>
            <p className="text-sm font-bold">
              {language === "en" ? portion.startSurahNameEn : portion.startSurahName} {t("ayah")} {language === "en" ? portion.startAyah : toArabicNumerals(portion.startAyah)} → {language === "en" ? portion.endSurahNameEn : portion.endSurahName} {t("ayah")} {language === "en" ? portion.endAyah : toArabicNumerals(portion.endAyah)}
            </p>
          </button>
        </div>
      }
    </motion.div>);

}
