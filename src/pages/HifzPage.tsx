import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, BookOpen, CircleCheck as CheckCircle2, Circle, Loader as Loader2,
  RotateCcw, Check, Clock, Sparkles, Flame, Target, ChevronDown, ChevronUp,
  Headphones, BookOpenCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SURAH_META } from "@/data/surah-meta";
import { useHifz, type HifzStatus } from "@/hooks/useHifz";
import { useHifzReview } from "@/hooks/useHifzReview";
import { useHifzStreak, useHifzGoal } from "@/hooks/useHifzStreak";
import { cn, toArabicNumerals } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

type FilterMode = "all" | "memorized" | "reading" | "none";

const PENDING_REVIEW_KEY = "hifz-pending-review";

const STATUS_CONFIG: Record<HifzStatus, { color: string; bg: string; icon: typeof CheckCircle2 }> = {
  memorized: { color: "text-primary", bg: "bg-primary/15 border-primary/30", icon: CheckCircle2 },
  reading: { color: "text-accent", bg: "bg-accent/15 border-accent/30", icon: Loader2 },
  none: { color: "text-muted-foreground", bg: "bg-card border-border/50", icon: Circle },
};

function getStrengthColor(level: number): string {
  if (level <= 1) return "bg-destructive";
  if (level <= 3) return "bg-accent";
  return "bg-primary";
}

export default function HifzPage() {
  const { t, language, isRTL } = useLanguage();
  const navigate = useNavigate();
  const { getStatus, cycleStatus, setStatus, stats } = useHifz();
  const review = useHifzReview();
  const streak = useHifzStreak();
  const goal = useHifzGoal();
  const [filter, setFilter] = useState<FilterMode>("all");
  const [showGoalEditor, setShowGoalEditor] = useState(false);
  const [expandedSurah, setExpandedSurah] = useState<number | null>(null);
  const [pendingReviewSurah, setPendingReviewSurah] = useState<number | null>(null);

  const filtered = SURAH_META.filter((s) => filter === "all" || getStatus(s.number) === filter);
  const todayQueue = review.getTodayQueue();

  useEffect(() => {
    const stored = localStorage.getItem(PENDING_REVIEW_KEY);
    if (stored) {
      const num = parseInt(stored, 10);
      if (!isNaN(num)) {
        const stillInQueue = todayQueue.some((item) => item.surahNumber === num);
        if (stillInQueue) {
          setPendingReviewSurah(num);
        }
      }
      localStorage.removeItem(PENDING_REVIEW_KEY);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getStrengthLabel = (level: number): string => {
    if (level <= 1) return t("weak");
    if (level <= 3) return t("medium");
    return t("strong");
  };

  const handleCycleStatus = (surahNumber: number) => {
    const current = getStatus(surahNumber);
    cycleStatus(surahNumber);
    if (current === "reading") {
      review.addToReview(surahNumber);
    }
    if (current === "memorized") {
      review.removeFromReview(surahNumber);
    }
  };

  const handleSetStatus = (surahNumber: number, newStatus: HifzStatus) => {
    const current = getStatus(surahNumber);
    setStatus(surahNumber, newStatus);
    if (newStatus === "memorized" && current !== "memorized") {
      review.addToReview(surahNumber);
    }
    if (current === "memorized" && newStatus !== "memorized") {
      review.removeFromReview(surahNumber);
    }
    setExpandedSurah(null);
  };

  const handleMarkReviewed = (surahNumber: number, quality: "good" | "hard") => {
    const meta = SURAH_META.find((s) => s.number === surahNumber);
    review.markReviewed(surahNumber, quality);
    streak.markActive();
    if (pendingReviewSurah === surahNumber) setPendingReviewSurah(null);
    if (quality === "good") {
      goal.markSurahReviewed();
      const surahName = language === "en" ? (meta?.englishName || "") : (meta?.name || "");
      toast({
        title: t("hifz_toast_well_done"),
        description: `${t("hifz_toast_reviewed_surah")} ${surahName}`,
      });
    } else {
      const surahName = language === "en" ? (meta?.englishName || "") : (meta?.name || "");
      toast({
        title: t("hifz_toast_keep_going"),
        description: t("hifz_toast_will_appear").replace("{name}", surahName),
      });
    }
  };

  const handleOpenSurahForReview = (surahNumber: number, mode: "read" | "listen") => {
    localStorage.setItem(PENDING_REVIEW_KEY, String(surahNumber));
    if (mode === "listen") {
      navigate(`/surah/${surahNumber}?mode=listening`);
    } else {
      navigate(`/surah/${surahNumber}`);
    }
  };

  const handleSurahCardTap = (surahNumber: number) => {
    setExpandedSurah((prev) => (prev === surahNumber ? null : surahNumber));
  };

  const getSurahName = (surahNumber: number) => {
    const meta = SURAH_META.find((s) => s.number === surahNumber);
    return language === "en" ? (meta?.englishName || "") : (meta?.name || "");
  };

  return (
    <div className="px-4 pt-6 pb-24" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} className="rounded-xl p-2.5 bg-card border border-border/40 shadow-soft hover:bg-muted transition-colors">
          {isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
        </motion.button>
        <div>
          <h1 className="text-2xl font-bold heading-decorated">{t("hifz_title")}</h1>
          <p className="text-sm text-muted-foreground">{t("hifz_subtitle")}</p>
        </div>
      </div>

      {/* Progress Summary */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-5 rounded-2xl bg-card p-5 shadow-elevated border border-border/50">
        <div className="grid grid-cols-3 gap-2 mb-4 text-center" dir={isRTL ? "rtl" : "ltr"}>
          <div>
            <p className="text-xl font-bold text-primary">{language === "ar" ? toArabicNumerals(stats.memorized) : stats.memorized}</p>
            <p className="text-xs text-muted-foreground">{t("memorized")}</p>
          </div>
          <div>
            <p className="text-xl font-bold text-accent">{language === "ar" ? toArabicNumerals(stats.inProgress) : stats.inProgress}</p>
            <p className="text-xs text-muted-foreground">{t("in_progress")}</p>
          </div>
          <div>
            <p className="text-xl font-bold text-muted-foreground">{language === "ar" ? toArabicNumerals(stats.notStarted) : stats.notStarted}</p>
            <p className="text-xs text-muted-foreground">{t("not_started")}</p>
          </div>
        </div>
        <div dir={isRTL ? "rtl" : "ltr"}>
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-muted-foreground">{language === "ar" ? toArabicNumerals(stats.memorizedAyahs) : stats.memorizedAyahs} / {language === "ar" ? toArabicNumerals(stats.totalAyahs) : stats.totalAyahs} {t("ayah")}</span>
            <span className="font-bold text-primary">{language === "ar" ? toArabicNumerals(stats.percentage) : stats.percentage}%</span>
          </div>
          <Progress value={stats.percentage} variant="gradient" size="sm" />
        </div>
      </motion.div>

      {/* Streak + Goal Row */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }} className="mb-5 grid grid-cols-2 gap-3" dir={isRTL ? "rtl" : "ltr"}>
        <div className="rounded-2xl bg-card border border-border/50 shadow-soft p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
            <Flame className="h-5 w-5 text-accent" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground tabular-nums">
              {language === "ar" ? toArabicNumerals(streak.currentStreak) : streak.currentStreak}
            </p>
            <p className="text-[0.625rem] text-muted-foreground leading-tight">{t("hifz_streak_days")}</p>
          </div>
        </div>

        <button
          onClick={() => setShowGoalEditor((p) => !p)}
          className="rounded-2xl bg-card border border-border/50 shadow-soft p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors text-start"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{t("daily_hifz_goal")}</p>
            <p className="text-[0.625rem] text-muted-foreground">
              {language === "ar"
                ? `${toArabicNumerals(goal.reviewedToday)} / ${toArabicNumerals(goal.surahsPerDay)} ${t("goal_surahs_per_day")}`
                : `${goal.reviewedToday} / ${goal.surahsPerDay} ${t("goal_surahs_per_day")}`}
            </p>
          </div>
          {showGoalEditor ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
        </button>
      </motion.div>

      {/* Goal progress bar */}
      <AnimatePresence>
        {goal.surahsPerDay > 0 && !showGoalEditor && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-5 rounded-2xl bg-card border border-border/50 shadow-soft p-4 overflow-hidden"
            dir={isRTL ? "rtl" : "ltr"}
          >
            <div className="flex items-center justify-between mb-2 text-xs">
              <span className="font-semibold text-muted-foreground">{t("todays_goal_progress")}</span>
              <span className="font-bold text-primary">
                {language === "ar" ? toArabicNumerals(goal.goalProgress) : goal.goalProgress}%
              </span>
            </div>
            <Progress value={goal.goalProgress} variant="gradient" size="sm" />
            {goal.isGoalDone && (
              <p className="text-xs text-primary font-semibold text-center mt-2">{t("hifz_goal_done")}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Goal Editor */}
      <AnimatePresence>
        {showGoalEditor && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-5 rounded-2xl bg-card border border-border/50 shadow-soft p-4 overflow-hidden"
            dir={isRTL ? "rtl" : "ltr"}
          >
            <p className="text-sm font-semibold mb-3">{t("set_goal")}</p>
            <p className="text-xs text-muted-foreground mb-2">{t("goal_surahs_per_day")}</p>
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3, 5, 7, 10].map((n) => (
                <button
                  key={n}
                  onClick={() => { goal.setSurahsPerDay(n); setShowGoalEditor(false); }}
                  className={cn(
                    "rounded-xl px-4 py-2.5 text-sm font-bold transition-all",
                    goal.surahsPerDay === n
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  )}
                >
                  {language === "ar" ? toArabicNumerals(n) : n}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Start Today's Review Card */}
      {todayQueue.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.07 }}
          className="mb-5 rounded-2xl border border-primary/30 bg-primary/5 p-4 shadow-soft"
          dir={isRTL ? "rtl" : "ltr"}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">
                {(todayQueue.length === 1
                  ? t("hifz_review_card_title_singular")
                  : t("hifz_review_card_title_plural")
                ).replace("{count}", language === "ar" ? toArabicNumerals(todayQueue.length) : String(todayQueue.length))}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("hifz_review_card_subtitle")}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Today's Review Section */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-5" dir={isRTL ? "rtl" : "ltr"}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="section-heading">
              <Clock className="h-4 w-4 text-primary" />
              {t("today_review")}
            </h2>
          </div>
          {review.stats.reviewedToday > 0 && (
            <span className="text-xs font-semibold text-primary bg-primary/10 rounded-full px-2.5 py-1">
              {t("hifz_review_count").replace("{count}", language === "ar" ? toArabicNumerals(review.stats.reviewedToday) : String(review.stats.reviewedToday))}
            </span>
          )}
        </div>

        {todayQueue.length === 0 ? (
          <div className="rounded-2xl bg-primary/5 border border-primary/20 p-6 text-center">
            <Sparkles className="h-8 w-8 text-primary/50 mx-auto mb-2" />
            <p className="text-sm font-semibold text-foreground">{t("no_reviews_today")}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {review.stats.totalInReview > 0 ? t("all_reviews_done") : t("add_memorized_hint")}
            </p>
            {review.stats.totalInReview === 0 && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setFilter("none")}
                className="mt-3 rounded-xl bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 hover:opacity-90 transition-opacity"
              >
                {t("start_hifz")}
              </motion.button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            <AnimatePresence mode="popLayout">
              {todayQueue.map((item) => {
                const isPending = pendingReviewSurah === item.surahNumber;
                return (
                  <motion.div
                    key={item.surahNumber}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    className={cn(
                      "rounded-2xl bg-card p-4 border shadow-soft",
                      isPending ? "border-primary/50 ring-1 ring-primary/20" :
                      item.overdueDays > 2 ? "border-destructive/30" : "border-border/50"
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-arabic text-base font-bold">{item.surahName}</span>
                        {item.overdueDays > 0 && (
                          <span className="text-[0.625rem] text-destructive font-semibold bg-destructive/10 rounded-full px-2 py-0.5">
                            {language === "en"
                              ? `${item.overdueDays} ${t("days")} ${t("overdue")}`
                              : `${t("overdue")} ${toArabicNumerals(item.overdueDays)} ${t("days")}`}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[0.625rem] text-muted-foreground">{getStrengthLabel(item.level)}</span>
                        <div className="flex gap-0.5">
                          {Array.from({ length: 7 }).map((_, i) => (
                            <div
                              key={i}
                              className={cn(
                                "h-1.5 w-1.5 rounded-full transition-colors",
                                i <= item.level ? getStrengthColor(item.level) : "bg-muted"
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="h-1 w-full rounded-full bg-muted mb-3 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", getStrengthColor(item.level))}
                        style={{ width: `${((item.level + 1) / 7) * 100}%` }}
                      />
                    </div>

                    {/* Pending review prompt — shown when returning from surah reader */}
                    {isPending && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mb-3 rounded-xl bg-primary/8 border border-primary/20 px-3 py-2"
                      >
                        <p className="text-xs font-semibold text-primary">
                          {t("hifz_did_you_review").replace("{name}", getSurahName(item.surahNumber))}
                        </p>
                      </motion.div>
                    )}

                    {/* Review quality buttons - primary actions */}
                    <div className="flex gap-2 mb-2">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleMarkReviewed(item.surahNumber, "good")}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-primary/10 text-primary py-3 text-sm font-semibold hover:bg-primary/20 transition-colors min-h-[44px]"
                      >
                        <Check className="h-4 w-4" />
                        {t("mastered")}
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleMarkReviewed(item.surahNumber, "hard")}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-muted text-muted-foreground py-3 text-sm font-semibold hover:bg-muted/80 transition-colors min-h-[44px]"
                      >
                        <RotateCcw className="h-4 w-4" />
                        {t("needs_review")}
                      </motion.button>
                    </div>

                    {/* Open surah — tertiary links */}
                    <div className="flex gap-3 justify-center pt-0.5">
                      <button
                        onClick={() => handleOpenSurahForReview(item.surahNumber, "read")}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                      >
                        <BookOpenCheck className="h-3 w-3" />
                        {t("hifz_open_surah_read")}
                      </button>
                      <span className="text-border text-xs">·</span>
                      <button
                        onClick={() => handleOpenSurahForReview(item.surahNumber, "listen")}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Headphones className="h-3 w-3" />
                        {t("hifz_open_surah_listen")}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Review Stats */}
        {review.stats.totalInReview > 0 && (
          <div className="mt-3 flex gap-3 text-center">
            <div className="flex-1 rounded-xl bg-muted/50 p-3">
              <p className="text-lg font-bold text-foreground">{language === "ar" ? toArabicNumerals(review.stats.totalInReview) : review.stats.totalInReview}</p>
              <p className="text-[0.625rem] text-muted-foreground">{t("in_review")}</p>
            </div>
            <div className="flex-1 rounded-xl bg-muted/50 p-3">
              <p className="text-lg font-bold text-foreground">{language === "ar" ? toArabicNumerals(review.stats.dueToday) : review.stats.dueToday}</p>
              <p className="text-[0.625rem] text-muted-foreground">{t("due_today")}</p>
            </div>
            <div className="flex-1 rounded-xl bg-muted/50 p-3">
              <p className="text-lg font-bold text-foreground">{language === "ar" ? toArabicNumerals(review.stats.totalReviewsDone) : review.stats.totalReviewsDone}</p>
              <p className="text-[0.625rem] text-muted-foreground">{t("total_reviews")}</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Filter Tabs */}
      <div className="mb-5 flex gap-1.5 p-1 rounded-2xl bg-muted/50" dir={isRTL ? "rtl" : "ltr"}>
        {([
          { key: "all" as FilterMode, label: t("filter_all") },
          { key: "memorized" as FilterMode, label: t("memorized") },
          { key: "reading" as FilterMode, label: t("in_progress") },
          { key: "none" as FilterMode, label: t("not_started") },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              "flex-1 rounded-xl py-2 text-xs font-semibold transition-all",
              filter === tab.key ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Onboarding card for new users */}
      {stats.memorized === 0 && stats.inProgress === 0 && filter === "all" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 rounded-2xl border border-primary/25 bg-primary/5 p-5"
          dir={isRTL ? "rtl" : "ltr"}
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{t("hifz_welcome_title")}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t("hifz_welcome_subtitle")}</p>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/surah/1")}
            className="w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            {t("hifz_start_with_fatiha")}
          </motion.button>
        </motion.div>
      )}

      {/* Surah Grid */}
      <div className="space-y-1.5">
        {(() => {
          const rows: React.ReactNode[] = [];
          let i = 0;
          while (i < filtered.length) {
            const rowSurahs = filtered.slice(i, i + 2);
            const rowIndex = i;
            rows.push(
              <div key={`row-${rowIndex}`} className="grid grid-cols-2 gap-2.5">
                {rowSurahs.map((surah, colIdx) => {
                  const status = getStatus(surah.number);
                  const config = STATUS_CONFIG[status];
                  const Icon = config.icon;
                  const reviewItem = review.getReviewItem(surah.number);
                  const isExpanded = expandedSurah === surah.number;
                  return (
                    <motion.button
                      key={surah.number}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: Math.min((rowIndex + colIdx) * 0.01, 0.3) }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSurahCardTap(surah.number)}
                      className={cn(
                        "relative flex flex-col items-start gap-2 rounded-xl px-3.5 py-3.5 border transition-all w-full",
                        config.bg,
                        isExpanded && "ring-2 ring-primary/40"
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <Icon className={cn("h-4 w-4", config.color)} />
                        <span className="text-[0.625rem] text-muted-foreground tabular-nums">
                          {language === "ar" ? toArabicNumerals(surah.number) : surah.number}
                        </span>
                      </div>
                      <div>
                        <span className="font-arabic text-sm font-bold leading-tight block">
                          {language === "ar" ? surah.name : surah.englishName}
                        </span>
                        <span className="text-[0.625rem] text-muted-foreground mt-0.5 block">
                          {language === "ar" ? toArabicNumerals(surah.numberOfAyahs) : surah.numberOfAyahs} {t("ayah")}
                        </span>
                      </div>
                      {reviewItem && (
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, j) => (
                            <div
                              key={j}
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                j <= reviewItem.level ? getStrengthColor(reviewItem.level) : "bg-muted"
                              )}
                            />
                          ))}
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            );

            // After each row, check if any surah in this row is expanded
            const expandedInRow = rowSurahs.find((s) => s.number === expandedSurah);
            if (expandedInRow) {
              const status = getStatus(expandedInRow.number);
              rows.push(
                <AnimatePresence key={`expansion-${expandedInRow.number}`}>
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-2xl bg-card border border-primary/20 shadow-soft p-4" dir={isRTL ? "rtl" : "ltr"}>
                      <p className="text-xs font-semibold text-muted-foreground mb-3">
                        {language === "ar" ? expandedInRow.name : expandedInRow.englishName}
                      </p>

                      {/* Navigation buttons */}
                      <div className="flex gap-2 mb-3">
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setExpandedSurah(null);
                            navigate(`/surah/${expandedInRow.number}`);
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-primary/10 text-primary py-2.5 text-xs font-semibold hover:bg-primary/20 transition-colors min-h-[40px]"
                        >
                          <BookOpenCheck className="h-3.5 w-3.5" />
                          {status === "memorized" ? t("hifz_action_read_to_review") : status === "reading" ? t("hifz_action_continue_reading") : t("hifz_action_start_reading")}
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setExpandedSurah(null);
                            navigate(`/surah/${expandedInRow.number}?mode=listening`);
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-muted text-muted-foreground py-2.5 text-xs font-semibold hover:bg-muted/70 transition-colors min-h-[40px]"
                        >
                          <Headphones className="h-3.5 w-3.5" />
                          {status === "memorized" ? t("hifz_action_listen_to_review") : t("hifz_action_listen")}
                        </motion.button>
                      </div>

                      {/* Status change buttons */}
                      <div className="flex gap-2">
                        {status !== "reading" && (
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleSetStatus(expandedInRow.number, "reading")}
                            className="flex-1 rounded-xl bg-accent/10 text-accent py-2 text-xs font-semibold hover:bg-accent/20 transition-colors"
                          >
                            {t("hifz_action_mark_in_progress")}
                          </motion.button>
                        )}
                        {status !== "memorized" && (
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleSetStatus(expandedInRow.number, "memorized")}
                            className="flex-1 rounded-xl bg-primary/10 text-primary py-2 text-xs font-semibold hover:bg-primary/20 transition-colors"
                          >
                            {t("hifz_action_mark_memorized")}
                          </motion.button>
                        )}
                        {status !== "none" && (
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleSetStatus(expandedInRow.number, "none")}
                            className="flex-1 rounded-xl bg-muted text-muted-foreground py-2 text-xs font-semibold hover:bg-muted/70 transition-colors"
                          >
                            {t("hifz_action_mark_not_started")}
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              );
            }

            i += 2;
          }
          return rows;
        })()}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl bg-muted/30 p-8 text-center mt-4">
          <BookOpen className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{t("no_surahs_in_filter")}</p>
        </div>
      )}

      <div className="h-4" />
    </div>
  );
}
