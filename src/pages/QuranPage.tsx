import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Headphones, GraduationCap, Mic, Flame, ChartBar as BarChart3, ArrowLeft, ArrowRight, ChevronRight, Bookmark, Star } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { fetchSurahList, type SurahMeta } from "@/lib/quran-api";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useDailyReading } from "@/hooks/useDailyReading";
import { useStreak } from "@/hooks/useStreak";
import { cn, toArabicNumerals } from "@/lib/utils";
import ChangelogModal from "@/components/ChangelogModal";
import { usePostUpdateChangelog } from "@/hooks/usePostUpdateChangelog";
import { useLanguage } from "@/contexts/LanguageContext";

type HomeView = "home" | "surahs" | "surahs_listening";

interface ModeCard {
  key: string;
  titleKey: "mode_reading" | "mode_listening" | "mode_hifz" | "mode_recitation";
  subtitleKey: "mode_reading_subtitle" | "mode_listening_subtitle" | "mode_hifz_subtitle" | "mode_recitation_subtitle";
  icon: React.ReactNode;
  accentColor: string;
  bgGradient: string;
  borderColor: string;
  view?: HomeView;
  route?: string;
}

export default function QuranPage() {
  const [view, setView] = useState<HomeView>("home");
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [loadingSurahs, setLoadingSurahs] = useState(false);
  const [lastRead] = useLocalStorage<{ surah: number; ayah: number } | null>("wise-last-read", null);
  const [bookmarks] = useLocalStorage<{ surah: number; ayah: number }[]>("wise-bookmarks", []);
  const [favorites] = useLocalStorage<number[]>("wise-favorite-surahs", []);
  const navigate = useNavigate();
  const { goal, todayCount } = useDailyReading();
  const { streak } = useStreak();
  const { showChangelog, newEntries, dismissChangelog } = usePostUpdateChangelog();
  const { t, language, isRTL } = useLanguage();

  const progress = Math.min((todayCount / goal) * 100, 100);

  useEffect(() => {
    if ((view === "surahs" || view === "surahs_listening") && surahs.length === 0) {
      setLoadingSurahs(true);
      fetchSurahList().then((data) => {
        setSurahs(data);
        setLoadingSurahs(false);
      });
    }
  }, [view, surahs.length]);

  const bookmarkedSurahs = [...new Set(bookmarks.map((b) => b.surah))];

  const getRevelationType = (type: string) =>
    type === "Meccan" ? t("revelation_meccan") : t("revelation_medinan");

  const getSurahName = (num: number) => {
    const s = surahs.find((s) => s.number === num);
    if (!s) return String(num);
    return language === "ar" ? s.name : s.englishName;
  };

  const modeCards: ModeCard[] = [
    {
      key: "reading",
      titleKey: "mode_reading",
      subtitleKey: "mode_reading_subtitle",
      icon: <BookOpen className="h-7 w-7" />,
      accentColor: "text-primary",
      bgGradient: "from-primary/18 to-primary/6",
      borderColor: "border-primary/20",
      view: "surahs",
    },
    {
      key: "listening",
      titleKey: "mode_listening",
      subtitleKey: "mode_listening_subtitle",
      icon: <Headphones className="h-7 w-7" />,
      accentColor: "text-amber-700 dark:text-amber-400",
      bgGradient: "from-amber-500/18 to-amber-500/6",
      borderColor: "border-amber-500/20",
      view: "surahs_listening",
    },
    {
      key: "hifz",
      titleKey: "mode_hifz",
      subtitleKey: "mode_hifz_subtitle",
      icon: <GraduationCap className="h-7 w-7" />,
      accentColor: "text-emerald-700 dark:text-emerald-400",
      bgGradient: "from-emerald-600/18 to-emerald-600/6",
      borderColor: "border-emerald-600/20",
      route: "/hifz",
    },
    {
      key: "recitation",
      titleKey: "mode_recitation",
      subtitleKey: "mode_recitation_subtitle",
      icon: <Mic className="h-7 w-7" />,
      accentColor: "text-rose-600 dark:text-rose-400",
      bgGradient: "from-rose-500/18 to-rose-500/6",
      borderColor: "border-rose-500/20",
      route: "/hifz/test",
    },
  ];

  const handleModeCard = (card: ModeCard) => {
    if (card.route) {
      navigate(card.route);
    } else if (card.view) {
      setView(card.view);
    }
  };

  const handleSurahSelect = (surahNumber: number) => {
    if (view === "surahs_listening") {
      navigate(`/surah/${surahNumber}?mode=listening`);
    } else {
      navigate(`/surah/${surahNumber}`);
    }
  };

  const surahListTitle =
    view === "surahs_listening" ? t("mode_listening") : t("mode_reading");

  return (
    <div className="px-4 pt-6 pb-6" dir={isRTL ? "rtl" : "ltr"}>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          {view !== "home" && (
            <motion.button
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setView("home")}
              className="rounded-xl p-2.5 bg-card text-muted-foreground hover:bg-muted min-h-[40px] min-w-[40px] flex items-center justify-center shadow-soft border border-border/40"
              dir={isRTL ? "rtl" : "ltr"}>
              {isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
            </motion.button>
          )}
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold heading-decorated">
              {view !== "home" ? surahListTitle : t("quran_title")}
            </h1>
            {(view === "surahs" || view === "surahs_listening") && surahs.length > 0 && (
              <span className="text-xs font-semibold text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                {language === "ar" ? toArabicNumerals(surahs.length) : surahs.length}
              </span>
            )}
          </div>
        </div>
        {view === "home" && (
          <div className="flex items-center gap-1.5">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate("/stats")}
              aria-label={t("statistics")}
              className="rounded-xl p-2.5 shadow-soft min-h-[40px] min-w-[40px] flex items-center justify-center bg-card text-muted-foreground hover:bg-muted border border-border/40">
              <BarChart3 className="h-5 w-5" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate("/hifz")}
              aria-label={t("memorization")}
              className="rounded-xl p-2.5 shadow-soft min-h-[40px] min-w-[40px] flex items-center justify-center bg-card text-muted-foreground hover:bg-muted border border-border/40">
              <GraduationCap className="h-5 w-5" />
            </motion.button>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">

        {/* ── HOME VIEW ── */}
        {view === "home" && (
          <motion.div
            key="home"
            initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
            transition={{ duration: 0.22 }}>

            {/* Daily Goal + Streak Banner */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl gradient-hero border border-primary/12 shadow-elevated p-4 mb-3 relative overflow-hidden"
              dir={isRTL ? "rtl" : "ltr"}>

              <div className="absolute inset-0 pattern-islamic opacity-70 pointer-events-none" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-sm text-foreground/70 font-medium">
                    {t("today")}{" "}
                    <span className="text-foreground font-bold">
                      {language === "en" ? todayCount : toArabicNumerals(todayCount)}
                    </span>
                    {" / "}
                    {language === "en" ? goal : toArabicNumerals(goal)}{" "}
                    {t("ayah")}
                  </span>
                  {streak > 0 && (
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className="flex items-center gap-1.5 rounded-full bg-accent/20 border border-accent/30 px-2.5 py-1">
                      <Flame className="h-3.5 w-3.5 text-accent streak-glow" />
                      <span className="text-xs font-bold text-accent">
                        {language === "en" ? streak : toArabicNumerals(streak)}
                      </span>
                      <span className="text-[10px] text-accent/80 font-medium">{t("days")}</span>
                    </motion.div>
                  )}
                </div>
                <Progress value={progress} variant="gradient" size="sm" />
                {progress >= 100 && (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-primary font-semibold mt-2 text-center">
                    ✨ {t("goal_complete")}
                  </motion.p>
                )}
              </div>
            </motion.div>

            {/* Continue Reading */}
            {lastRead && (
              <motion.button
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => navigate(`/surah/${lastRead.surah}`)}
                className={cn(
                  "flex w-full items-center rounded-2xl bg-card py-3.5 px-4 shadow-elevated border border-gold/25 hover-lift gap-3 mb-3 gradient-gold-card",
                  isRTL ? "text-right" : "text-left"
                )}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/15 border border-gold/20">
                  <BookOpen className="h-5 w-5 text-gold" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{t("continue_reading")}</p>
                  <p className="text-sm font-bold truncate text-foreground">
                    {t("surah")} {getSurahName(lastRead.surah)}{" "}
                    <span className="text-muted-foreground font-normal">·</span>{" "}
                    {t("ayah")} {language === "en" ? lastRead.ayah : toArabicNumerals(lastRead.ayah)}
                  </p>
                </div>
                <div className="shrink-0 w-7 h-7 rounded-full bg-gold/15 flex items-center justify-center">
                  {isRTL
                    ? <ArrowLeft className="h-3.5 w-3.5 text-gold" />
                    : <ChevronRight className="h-3.5 w-3.5 text-gold" />
                  }
                </div>
              </motion.button>
            )}

            {/* Mode Selection Cards — 2×2 Grid */}
            <div className="grid grid-cols-2 gap-2.5 mt-1" dir={isRTL ? "rtl" : "ltr"}>
              {modeCards.map((card, i) => (
                <motion.button
                  key={card.key}
                  initial={{ opacity: 0, y: 20, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.06 + i * 0.07, duration: 0.3, ease: "easeOut" }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleModeCard(card)}
                  className={cn(
                    "flex flex-col items-start gap-2.5 rounded-2xl bg-card px-4 py-4 shadow-elevated border transition-all relative overflow-hidden",
                    card.borderColor
                  )}>

                  <div className={cn("absolute inset-0 bg-gradient-to-br opacity-100 pointer-events-none", card.bgGradient)} />

                  <div className={cn("relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-soft border border-border/20", card.accentColor)}
                    style={{ background: `hsl(var(--card) / 0.7)` }}>
                    {card.icon}
                  </div>

                  <div className={cn("relative z-10 text-start")}>
                    <p className={cn("text-sm font-bold leading-tight mb-0.5", card.accentColor)}>
                      {t(card.titleKey)}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      {t(card.subtitleKey)}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>

          </motion.div>
        )}

        {/* ── SURAH LIST VIEW (Reading / Listening) ── */}
        {(view === "surahs" || view === "surahs_listening") && (
          <motion.div
            key="surahs"
            initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isRTL ? -20 : 20 }}
            transition={{ duration: 0.22 }}
            className="space-y-1.5 mt-1">

            {loadingSurahs
              ? Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="h-[68px] rounded-xl shimmer" />
                ))
              : surahs.map((surah, i) => (
                  <motion.button
                    key={surah.number}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.012, 0.35) }}
                    onClick={() => handleSurahSelect(surah.number)}
                    className="flex w-full items-center gap-3.5 rounded-xl bg-card px-4 py-3 shadow-soft hover:shadow-elevated transition-all active:scale-[0.99] group border border-border/30 hover:border-primary/20">

                    <div className="number-badge h-10 w-10 text-[13px] shrink-0 rounded-xl">
                      {language === "en" ? surah.number : toArabicNumerals(surah.number)}
                    </div>

                    <div className={cn("flex-1 min-w-0", isRTL ? "text-right" : "text-left")}>
                      <p className="font-arabic text-base font-bold group-hover:text-primary transition-colors leading-tight">
                        {language === "ar" ? surah.name : surah.englishName}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {language === "en" ? surah.numberOfAyahs : toArabicNumerals(surah.numberOfAyahs)}{" "}
                        {t("ayahs")} · {getRevelationType(surah.revelationType)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {favorites.includes(surah.number) && (
                        <Star className="h-3.5 w-3.5 fill-gold text-gold" />
                      )}
                      {bookmarkedSurahs.includes(surah.number) && (
                        <Bookmark className="h-3.5 w-3.5 text-primary fill-primary/20" />
                      )}
                    </div>
                  </motion.button>
                ))}
          </motion.div>
        )}

      </AnimatePresence>

      <div className="h-4" />

      <ChangelogModal
        open={showChangelog}
        newEntries={newEntries}
        onDismiss={dismissChangelog}
      />
    </div>
  );
}
