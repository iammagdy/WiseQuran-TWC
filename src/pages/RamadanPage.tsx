import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Check, BookOpen, CircleAlert as AlertCircle, RefreshCw } from "lucide-react";
import { useRamadan, getRamadanDay } from "@/hooks/useRamadan";
import { DAILY_CHECKLIST, RAMADAN_ACTIVITIES } from "@/lib/ramadan-data";
import { juzData } from "@/data/juz-hizb-data";
import { toArabicNumerals } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import DailyDuaCard from "@/components/ramadan/DailyDuaCard";
import IftarCountdown from "@/components/ramadan/IftarCountdown";
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function RamadanPage() {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { t, language, isRTL } = useLanguage();

  const ramadanData = useRamadan();

  const {
    toggleJuz = () => {},
    toggleChecklistItem = () => {},
    isJuzCompleted = () => false,
    isChecklistDone = () => false,
    khatmahProgress = 0,
    todayJuz = 1,
    ramadanDay = 1,
    checklistProgress = 0
  } = ramadanData || {};

  useEffect(() => {
    try {
      if (!DAILY_CHECKLIST || DAILY_CHECKLIST.length === 0) {
        throw new Error("DAILY_CHECKLIST is empty");
      }
      if (!juzData || juzData.length === 0) {
        throw new Error("juzData is empty");
      }
      setIsLoading(false);
    } catch (error) {
      console.error("Error loading Ramadan data:", error);
      setHasError(true);
      setIsLoading(false);
    }
  }, []);

  const checklistTotal = DAILY_CHECKLIST?.length || 8;

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" dir={isRTL ? "rtl" : "ltr"}>
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto" />
            <h2 className="text-xl font-bold text-foreground">{t("error_title")}</h2>
            <p className="text-muted-foreground">
              {t("ramadan_error_msg")}
            </p>
            <Button onClick={() => window.location.reload()} variant="default" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              {t("error_retry")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir={isRTL ? "rtl" : "ltr"}>
        <div className="text-center space-y-3">
          <div className="text-4xl animate-pulse">🌙</div>
          <p className="text-muted-foreground">{t("loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" dir={isRTL ? "rtl" : "ltr"}>
      {/* Ramadan Vibes Header */}
      <div className="relative overflow-hidden bg-gradient-to-b from-amber-600/20 via-amber-500/10 to-transparent px-4 pb-[10px] pt-[25px]">
        {/* Decorative elements */}
        <div className="absolute inset-0 pointer-events-none select-none">
          <span className="absolute top-4 right-6 text-3xl animate-float opacity-60">🏮</span>
          <span className="absolute top-8 left-8 text-2xl animate-float opacity-50" style={{ animationDelay: "1s" }}>✨</span>
          <span className="absolute top-3 left-1/2 text-4xl animate-float opacity-40" style={{ animationDelay: "0.5s" }}>🌙</span>
          <span className="absolute top-16 right-1/3 text-xl animate-float opacity-30" style={{ animationDelay: "1.5s" }}>🏮</span>
        </div>

        <div className="relative text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">{t("ramadan_title")}</h1>
          <p className="text-lg text-muted-foreground">
            {t("ramadan_day")} {language === "en" ? ramadanDay : toArabicNumerals(ramadanDay)} {t("ramadan_of")}
          </p>
        </div>
      </div>

      <div className="px-4 space-y-6 -mt-2 pb-[20px]">
        {/* Iftar Countdown */}
        <IftarCountdown />

        {/* Daily Dua */}
        <DailyDuaCard ramadanDay={ramadanDay} />

        {/* Daily Checklist */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">{t("daily_checklist")}</h2>
            <span className="text-sm text-muted-foreground">
              {language === "en" ? checklistProgress : toArabicNumerals(checklistProgress)}/{language === "en" ? checklistTotal : toArabicNumerals(checklistTotal)}
            </span>
          </div>
          <Progress
            value={checklistProgress / checklistTotal * 100}
            variant="gradient"
            size="sm"
            className="bg-amber-100 dark:bg-amber-900/30" />

          <div className="grid gap-2">
            <AnimatePresence>
              {DAILY_CHECKLIST.map((item) => {
                const done = isChecklistDone(item.id);
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}>

                    <button
                      onClick={() => toggleChecklistItem(item.id)}
                      className={cn("w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 pb-[5px] pt-[5px]", isRTL ? "text-right" : "text-left",

                      done ?
                      "bg-primary/10 border-primary/30" :
                      "bg-card border-border hover:border-amber-300/50"
                      )}>

                      <div
                        className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all",
                          done ?
                          "bg-primary text-primary-foreground" :
                          "bg-muted"
                        )}>

                        {done && <Check className="h-4 w-4" />}
                      </div>
                      <span className="text-lg">{item.emoji}</span>
                      <span
                        className={cn(
                          "text-sm font-medium flex-1",
                          done ? "line-through text-muted-foreground" : "text-foreground"
                        )}>

                        {language === "ar" ? item.labelAr : item.labelEn}
                      </span>
                    </button>
                  </motion.div>);

              })}
            </AnimatePresence>
          </div>
        </section>

        {/* Khatmah Plan */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">{t("khatmah_plan")}</h2>
            <span className="text-sm text-muted-foreground">
              {language === "en" ? khatmahProgress : toArabicNumerals(khatmahProgress)}/30 {t("juz_parts")}
            </span>
          </div>
          <Progress
            value={khatmahProgress / 30 * 100}
            variant="gradient"
            size="sm"
            className="bg-amber-100 dark:bg-amber-900/30" />


          {/* Today's Juz highlight */}
          <Card variant="gradient" className="border-amber-300/40 dark:border-amber-600/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t("today_juz")}</p>
                <p className="font-bold text-foreground">
                  {language === "ar"
                    ? (juzData[todayJuz - 1]?.name || `الجزء ${toArabicNumerals(todayJuz)}`)
                    : (juzData[todayJuz - 1]?.nameEn || `Juz ${todayJuz}`)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={isJuzCompleted(todayJuz) ? "secondary" : "default"}
                  onClick={() => toggleJuz(todayJuz)}
                  className="gap-1">

                  {isJuzCompleted(todayJuz) ?
                  <>
                      <Check className="h-4 w-4" /> {t("done")}
                    </> :

                  t("complete")
                  }
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/surah/${juzData[todayJuz - 1]?.startSurah || 1}`)}>

                  <BookOpen className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Juz grid */}
          <div className="grid grid-cols-6 gap-2">
            {Array.from({ length: 30 }, (_, i) => i + 1).map((juz) => {
              const done = isJuzCompleted(juz);
              const isCurrent = juz === todayJuz;
              return (
                <button
                  key={juz}
                  onClick={() => toggleJuz(juz)}
                  className={cn(
                    "aspect-square rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-200 border",
                    done ?
                    "bg-primary text-primary-foreground border-primary/50" :
                    isCurrent ?
                    "bg-amber-100 dark:bg-amber-900/40 border-amber-400/50 text-amber-700 dark:text-amber-300" :
                    "bg-card border-border text-muted-foreground hover:border-amber-300/50"
                  )}>

                  {done ? <Check className="h-4 w-4" /> : (language === "en" ? juz : toArabicNumerals(juz))}
                </button>);

            })}
          </div>
        </section>

        {/* Suggested Activities */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-foreground">{t("activities_title")}</h2>
          <ScrollArea className="w-full" dir={isRTL ? "rtl" : "ltr"}>
            <div className="flex gap-3 pb-3">
              {RAMADAN_ACTIVITIES.map((activity, i) =>
              <Card
                key={i}
                className="min-w-[220px] max-w-[260px] shrink-0 border-amber-200/50 dark:border-amber-700/30">

                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{activity.emoji}</span>
                      <h3 className="font-bold text-sm text-foreground">{language === "ar" ? activity.titleAr : activity.titleEn}</h3>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {language === "ar" ? activity.descriptionAr : activity.descriptionEn}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </section>
      </div>
    </div>);

}
