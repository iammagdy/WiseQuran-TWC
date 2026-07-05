import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, BookOpen, Clock, Flame, Trophy } from "lucide-react";
import { useReadingStats } from "@/hooks/useReadingStats";
import { useDailyReading } from "@/hooks/useDailyReading";
import { useStreak } from "@/hooks/useStreak";
import { useHifz } from "@/hooks/useHifz";
import { useHifzReview } from "@/hooks/useHifzReview";
import { useHifzGoal } from "@/hooks/useHifzStreak";
import { useRecitationHistory } from "@/hooks/useRecitationHistory";
import { StatCard } from "@/components/stats/StatCard";
// Lazy boundary keeps Recharts out of the home/Quran/Sleep critical
// path — see src/components/stats/WeeklyChartLazy.tsx for the wrapper.
import { WeeklyChart } from "@/components/stats/WeeklyChartLazy";
import { StreakCalendar } from "@/components/stats/StreakCalendar";
import { AchievementsSheet } from "@/components/AchievementsSheet";
import { Progress } from "@/components/ui/progress";
import { toArabicNumerals } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFadeInView } from "@/hooks/useFadeInView";
import { useEffect } from "react";
import { SURAH_META } from "@/data/surah-meta";

export default function StatsPage() {
  const navigate = useNavigate();
  const { weeklyData, monthlyData, totals, weeklyTotal, monthlyTotal } = useReadingStats();
  const { goal, todayCount } = useDailyReading();
  const { streak } = useStreak();
  const { stats: hifzStats } = useHifz();
  const review = useHifzReview();
  const memorizationGoal = useHifzGoal();
  const recitationHistory = useRecitationHistory();
  const { t, language, isRTL } = useLanguage();

  const progress = Math.min((todayCount / goal) * 100, 100);
  const weeklyGoalProgress = Math.min((weeklyTotal / (goal * 7 || 1)) * 100, 100);

  useEffect(() => {
    void recitationHistory.fetchHistory();
  }, [recitationHistory]);

  const heatmapItems = Object.values(
    recitationHistory.history.reduce<Record<number, { surahNumber: number; attempts: number; avgScore: number }>>((acc, record) => {
      const current = acc[record.surah_number] ?? { surahNumber: record.surah_number, attempts: 0, avgScore: 0 };
      current.avgScore = ((current.avgScore * current.attempts) + record.score) / (current.attempts + 1);
      current.attempts += 1;
      acc[record.surah_number] = current;
      return acc;
    }, {})
  ).sort((a, b) => (a.avgScore - b.avgScore) || (b.attempts - a.attempts)).slice(0, 6);

  const chart = useFadeInView(0);
  const calendar = useFadeInView(0.05);

  return (
    <div className="px-4 pt-6 pb-24" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(-1)}
          className="rounded-xl glass-card p-2.5 shadow-soft"
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
        className="rounded-2xl glass-card p-5 shadow-soft border-border/50 mb-5"
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

      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatCard icon={BookOpen} value={hifzStats.memorized} label={language === "ar" ? "سور محفوظة" : "Memorized Surahs"} delay={0.22} accent />
        <StatCard icon={Trophy} value={review.stats.dueToday} label={language === "ar" ? "مراجعات اليوم" : "Due Reviews"} delay={0.26} />
      </div>

      {/* Summary Row */}
      <div className="flex gap-3 mb-5">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="flex-1 rounded-2xl glass-card bg-primary/10 p-4 text-center"
        >
          <p className="text-xl font-bold text-primary">{language === "en" ? weeklyTotal : toArabicNumerals(weeklyTotal)}</p>
          <p className="text-xs text-muted-foreground">{t("this_week")}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex-1 rounded-2xl glass-card bg-accent/10 p-4 text-center"
        >
          <p className="text-xl font-bold text-accent">{language === "en" ? monthlyTotal : toArabicNumerals(monthlyTotal)}</p>
          <p className="text-xs text-muted-foreground">{t("this_month")}</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-3 mb-5">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.34 }}
          className="rounded-2xl glass-card p-4 border border-border/50"
          data-testid="stats-weekly-goal-card"
        >
          <div className="flex items-center justify-between mb-2 gap-3">
            <p className="text-sm font-semibold text-foreground">{language === "ar" ? "هدف الأسبوع" : "Weekly Goal"}</p>
            <span className="text-xs text-muted-foreground">
              {language === "ar"
                ? `${toArabicNumerals(weeklyTotal)} / ${toArabicNumerals(goal * 7)} آية`
                : `${weeklyTotal} / ${goal * 7} ayahs`}
            </span>
          </div>
          <Progress value={weeklyGoalProgress} variant="gradient" size="sm" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38 }}
          className="rounded-2xl glass-card p-4 border border-border/50"
          data-testid="stats-memorization-snapshot-card"
        >
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="text-sm font-semibold text-foreground">{language === "ar" ? "ملخص الحفظ" : "Memorization Snapshot"}</p>
            <span className="text-xs text-primary font-semibold">{language === "ar" ? `${toArabicNumerals(hifzStats.percentage)}%` : `${hifzStats.percentage}%`}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-primary/5 p-3">
              <p className="text-lg font-bold text-primary">{language === "ar" ? toArabicNumerals(hifzStats.memorizedAyahs) : hifzStats.memorizedAyahs}</p>
              <p className="text-[11px] text-muted-foreground">{language === "ar" ? "آيات محفوظة" : "Ayahs memorized"}</p>
            </div>
            <div className="rounded-xl bg-card p-3 border border-border/50">
              <p className="text-lg font-bold text-foreground">{language === "ar" ? toArabicNumerals(review.stats.totalInReview) : review.stats.totalInReview}</p>
              <p className="text-[11px] text-muted-foreground">{language === "ar" ? "قيد المراجعة" : "In review"}</p>
            </div>
            <div className="rounded-xl bg-card p-3 border border-border/50">
              <p className="text-lg font-bold text-foreground">{language === "ar" ? toArabicNumerals(memorizationGoal.reviewedToday) : memorizationGoal.reviewedToday}</p>
              <p className="text-[11px] text-muted-foreground">{language === "ar" ? "مراجع اليوم" : "Reviewed today"}</p>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.42 }}
        className="rounded-2xl glass-card p-4 border border-border/50 mb-5"
        data-testid="stats-recitation-heatmap-card"
      >
        <div className="flex items-center justify-between gap-3 mb-3">
          <p className="text-sm font-semibold text-foreground">{language === "ar" ? "خريطة التعثر في التسميع" : "Recitation Mistake Heatmap"}</p>
          <span className="text-xs text-muted-foreground">{language === "ar" ? "أضعف السور مؤخرًا" : "Recent weak surahs"}</span>
        </div>

        {heatmapItems.length === 0 ? (
          <div className="rounded-xl bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
            {language === "ar" ? "لا توجد بيانات كافية بعد — جرّب التسميع لتظهر الخريطة." : "Not enough recitation data yet — complete a recitation test to see the heatmap."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {heatmapItems.map((item) => {
              const meta = SURAH_META[item.surahNumber - 1];
              const intensity = item.avgScore >= 85 ? "bg-primary/10 border-primary/30" : item.avgScore >= 60 ? "bg-accent/10 border-accent/30" : "bg-destructive/10 border-destructive/30";
              return (
                <div key={item.surahNumber} className={`rounded-2xl border p-3 ${intensity}`} data-testid={`stats-heatmap-surah-${item.surahNumber}`}>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="font-arabic text-base font-bold text-foreground truncate">{language === "ar" ? meta?.name : meta?.englishName}</p>
                    <span className="text-xs font-semibold text-muted-foreground">{language === "ar" ? `${toArabicNumerals(item.attempts)} محاولة` : `${item.attempts} tries`}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <Progress value={item.avgScore} variant="gradient" size="sm" className="flex-1" />
                    <span className="text-xs font-bold text-foreground">{language === "ar" ? toArabicNumerals(Math.round(item.avgScore)) : Math.round(item.avgScore)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

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
