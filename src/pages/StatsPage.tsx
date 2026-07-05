import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, BookOpen, Clock, Flame, Trophy } from "lucide-react";
import { useReadingStats } from "@/hooks/useReadingStats";
import { useDailyReading } from "@/hooks/useDailyReading";
import { useStreak } from "@/hooks/useStreak";
import { StatCard } from "@/components/stats/StatCard";
import { WeeklyChart } from "@/components/stats/WeeklyChart";
import { StreakCalendar } from "@/components/stats/StreakCalendar";
import { AchievementsSheet } from "@/components/AchievementsSheet";
import { Progress } from "@/components/ui/progress";
import { toArabicNumerals } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFadeInView } from "@/hooks/useFadeInView";

export default function StatsPage() {
  const navigate = useNavigate();
  const { weeklyData, monthlyData, totals, weeklyTotal, monthlyTotal } = useReadingStats();
  const { goal, todayCount } = useDailyReading();
  const { streak } = useStreak();
  const { t, language, isRTL } = useLanguage();

  const progress = Math.min((todayCount / goal) * 100, 100);

  const chart = useFadeInView(0);
  const calendar = useFadeInView(0.05);

  return (
    <div className="px-4 pt-6 pb-24" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(-1)}
          className="rounded-xl bg-card p-2.5 shadow-soft border border-border/40"
        >
          {isRTL ? <ArrowRight className="h-5 w-5 text-foreground" /> : <ArrowLeft className="h-5 w-5 text-foreground" />}
        </motion.button>
        <h1 className="text-2xl font-bold heading-decorated flex-1">{t("statistics")}</h1>
        <AchievementsSheet />
      </div>

      {/* Today's Goal */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-card p-5 shadow-soft border border-border/50 mb-5"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-muted-foreground">{t("today_goal")}</span>
          <span className="text-sm font-bold text-foreground">
            {language === "en" ? todayCount : toArabicNumerals(todayCount)} / {language === "en" ? goal : toArabicNumerals(goal)} {t("ayah")}
          </span>
        </div>
        <Progress value={progress} variant="gradient" size="sm" />
        {progress >= 100 && (
          <p className="text-xs text-primary font-medium mt-2 text-center">🎉 {t("goal_complete")}</p>
        )}
      </motion.div>

      {/* Hero Stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatCard icon={BookOpen} value={totals.totalAyahs} label={t("total_ayahs")} delay={0.05} accent />
        <StatCard icon={Clock} value={totals.totalMinutes} label={t("reading_minutes")} delay={0.1} />
        <StatCard icon={Flame} value={streak} label={t("streak_days")} delay={0.15} accent />
        <StatCard icon={Trophy} value={totals.maxStreak} label={t("longest_streak")} delay={0.2} />
      </div>

      {/* Summary Row */}
      <div className="flex gap-3 mb-5">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="flex-1 rounded-2xl bg-primary/10 p-4 text-center"
        >
          <p className="text-xl font-bold text-primary">{language === "en" ? weeklyTotal : toArabicNumerals(weeklyTotal)}</p>
          <p className="text-xs text-muted-foreground">{t("this_week")}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex-1 rounded-2xl bg-accent/10 p-4 text-center"
        >
          <p className="text-xl font-bold text-accent">{language === "en" ? monthlyTotal : toArabicNumerals(monthlyTotal)}</p>
          <p className="text-xs text-muted-foreground">{t("this_month")}</p>
        </motion.div>
      </div>

      {/* Weekly Chart */}
      <div className="mb-5" ref={chart.ref} style={chart.style}>
        <WeeklyChart data={weeklyData} />
      </div>

      {/* Streak Calendar */}
      <div ref={calendar.ref} style={calendar.style}>
        <StreakCalendar data={monthlyData} />
      </div>

      <div className="h-4" />
    </div>
  );
}
