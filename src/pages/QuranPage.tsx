import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Headphones, GraduationCap, Mic, ArrowRight, ChevronRight, Bookmark, Star, Search, X, BedDouble, Clock, GripVertical, Eye, EyeOff, ChevronUp, ChevronDown, Download, Play, Pause } from "lucide-react";
import { fetchSurahList, type SurahMeta } from "@/lib/quran-api";
import SurahOfflineButton from "@/components/quran/SurahOfflineButton";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useDailyReading } from "@/hooks/useDailyReading";
import { useStreak } from "@/hooks/useStreak";
import { cn, toArabicNumerals } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { calculatePrayerTimes } from "@/lib/prayer-times";
import { useLocation } from "@/hooks/useLocation";
import { getAllAudioEntries, getAllDownloadedSurahs, OFFLINE_CHANGED_EVENT } from "@/lib/db";
import {
  hasConfiguredSleepMode,
  loadSleepModePrefs,
  SLEEP_PREFS_CHANGED_EVENT,
  type SleepModePrefs,
} from "@/hooks/useSleepModePlayer";
import { useSleepSession } from "@/lib/sleep-session-store";
import { sleepModePlayer } from "@/lib/sleep-mode-player";
import { getReciterById } from "@/lib/reciters";

const TOTAL_SURAHS = 114;

type HomeView = "home" | "surahs" | "surahs_listening";
type DashboardSectionId = "next-prayer" | "featured-resume" | "quick-resume" | "activity" | "modes" | "tools";

const DEFAULT_DASHBOARD_ORDER: DashboardSectionId[] = [
  "next-prayer",
  "featured-resume",
  "quick-resume",
  "activity",
  "modes",
  "tools",
];



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
  const [surahSearch, setSurahSearch] = useState("");
  const [lastRead] = useLocalStorage<{ surah: number; ayah: number; mode: "reading" | "listening" } | null>("wise-last-read", null);
  const [lastReading] = useLocalStorage<{ surah: number; ayah: number } | null>("wise-last-reading", null);
  const [lastListening] = useLocalStorage<{ surah: number; ayah: number } | null>("wise-last-listening", null);
  const { bookmarks } = useBookmarks();
  const [favorites] = useLocalStorage<number[]>("wise-favorite-surahs", []);
  const [dashboardOrder, setDashboardOrder] = useLocalStorage<DashboardSectionId[]>("wise-home-dashboard-order", DEFAULT_DASHBOARD_ORDER);
  const [hiddenSections, setHiddenSections] = useLocalStorage<DashboardSectionId[]>("wise-home-dashboard-hidden", []);
  const [showDashboardEditor, setShowDashboardEditor] = useState(false);
  const navigate = useNavigate();
  const { goal, todayCount } = useDailyReading();
  const { streak } = useStreak();
  const { t, language, isRTL } = useLanguage();
  const { location } = useLocation();

  // ── Offline library + Sleep Mode summaries for the home tools tiles ────
  // These power the "X / 114 surahs" + "Y audio" badge on the Offline
  // Library tile and the "{timer}m · {reciter}" / "tap to set up" label
  // on the Sleep Mode tile. Counts/prefs refresh reactively when the
  // matching event fires (download finish, sleep prefs save, etc.) so
  // the home stays the canonical source of truth without forcing a
  // navigation into the Offline Center / Sleep Mode page.
  const [offlineSurahCount, setOfflineSurahCount] = useState(0);
  const [offlineAudioCount, setOfflineAudioCount] = useState(0);
  const [sleepPrefs, setSleepPrefs] = useState<SleepModePrefs>(() => loadSleepModePrefs());
  const [sleepConfigured, setSleepConfigured] = useState<boolean>(() => hasConfiguredSleepMode());

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const [surahs, audio] = await Promise.all([
          getAllDownloadedSurahs(),
          getAllAudioEntries(),
        ]);
        if (cancelled) return;
        setOfflineSurahCount(surahs.length);
        setOfflineAudioCount(audio.length);
      } catch {
        // Best-effort — leave counts at last-known good values rather
        // than zeroing them out on a transient IDB error.
      }
    };
    void refresh();
    const onOfflineChange = () => { void refresh(); };
    window.addEventListener(OFFLINE_CHANGED_EVENT, onOfflineChange);
    return () => {
      cancelled = true;
      window.removeEventListener(OFFLINE_CHANGED_EVENT, onOfflineChange);
    };
  }, []);

  useEffect(() => {
    const onPrefsChange = () => {
      setSleepPrefs(loadSleepModePrefs());
      setSleepConfigured(hasConfiguredSleepMode());
    };
    window.addEventListener(SLEEP_PREFS_CHANGED_EVENT, onPrefsChange);
    return () => window.removeEventListener(SLEEP_PREFS_CHANGED_EVENT, onPrefsChange);
  }, []);

  const sleepReciterName = (() => {
    const reciter = getReciterById(sleepPrefs.reciterId);
    return language === "ar" ? reciter.name : reciter.nameEn;
  })();

  // Live session state from the module-level Sleep Mode player. When a
  // session is active the tile reflects "playing · Nm left" /
  // "paused · Nm left" instead of the static saved-prefs label, so the
  // home stays a true status surface.
  const sleepSession = useSleepSession();
  const sleepIsActive = sleepSession.status !== "idle";

  const sleepTileLabel = (() => {
    if (sleepIsActive) {
      // Round-up minutes so a session ending in the next 30s still
      // surfaces "1m left" instead of "0m left" right before it stops.
      const minutesLeft = Math.max(0, Math.ceil(sleepSession.remainingSeconds / 60));
      const secondsLeft = Math.max(0, sleepSession.remainingSeconds);
      const isPlaying = sleepSession.status === "playing";
      if (language === "ar") {
        const statusWord = isPlaying ? "تشغيل" : "إيقاف مؤقت";
        const remainingWord =
          minutesLeft > 0
            ? `متبقي ${toArabicNumerals(minutesLeft)} د`
            : `متبقي ${toArabicNumerals(secondsLeft)} ث`;
        return `${statusWord} · ${remainingWord}`;
      }
      const statusWord = isPlaying ? "playing" : "paused";
      const remainingPart = minutesLeft > 0 ? `${minutesLeft}m left` : `${secondsLeft}s left`;
      return `${statusWord} · ${remainingPart}`;
    }
    if (sleepConfigured) {
      return language === "ar"
        ? `${toArabicNumerals(sleepPrefs.timerMinutes)} د · ${sleepReciterName}`
        : `${sleepPrefs.timerMinutes}m · ${sleepReciterName}`;
    }
    return language === "ar" ? "اضغط للإعداد" : "Tap to set up";
  })();

  const offlineTileLabel = (() => {
    if (offlineSurahCount === 0 && offlineAudioCount === 0) {
      return language === "ar" ? "لم يتم التنزيل بعد" : "Nothing downloaded yet";
    }
    if (language === "ar") {
      const surahsPart = `${toArabicNumerals(offlineSurahCount)} / ${toArabicNumerals(TOTAL_SURAHS)} سورة`;
      const audioPart = offlineAudioCount > 0 ? ` · ${toArabicNumerals(offlineAudioCount)} صوت` : "";
      return `${surahsPart}${audioPart}`;
    }
    const surahsPart = `${offlineSurahCount} / ${TOTAL_SURAHS} surahs`;
    const audioPart = offlineAudioCount > 0 ? ` · ${offlineAudioCount} audio` : "";
    return `${surahsPart}${audioPart}`;
  })();

  const sectionLabels: Record<DashboardSectionId, string> = {
    "next-prayer": language === "ar" ? "موعد الصلاة القادمة" : "Next prayer",
    "featured-resume": language === "ar" ? "متابعة سريعة" : "Featured resume",
    "quick-resume": language === "ar" ? "بطاقات المتابعة" : "Quick resume cards",
    activity: language === "ar" ? "ملخص النشاط" : "Activity summary",
    modes: language === "ar" ? "أوضاع القرآن" : "Quran modes",
    tools: language === "ar" ? "أدوات إضافية" : "Quick tools",
  };

  // Dynamic greeting logic
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return language === "ar" ? "صباح الخير" : "Good Morning";
    return language === "ar" ? "مساء الخير" : "Good Evening";
  };

  // Prayer time logic (Next Prayer)
  const [nextPrayer, setNextPrayer] = useState<{name: string, time: string} | null>(null);
  useEffect(() => {
    const options = location ? { latitude: location.latitude, longitude: location.longitude } : {};
    const times = calculatePrayerTimes(new Date(), options);
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    
    const prayerOrder = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
    let next = null;
    
    for (const p of prayerOrder) {
      const [h, m] = times[p as keyof typeof times].split(":").map(Number);
      const pMinutes = h * 60 + m;
      if (pMinutes > nowMinutes) {
        next = { name: t(p as Parameters<typeof t>[0]), time: times[p as keyof typeof times] };
        break;
      }
    }
    
    if (!next) {
      next = { name: t("fajr"), time: times.fajr }; // Next day's Fajr
    }
    setNextPrayer(next);
  }, [location, t]);

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

  const quickResumeCards = [
    lastReading && {
      key: "reading",
      label: t("continue_reading"),
      surah: lastReading.surah,
      ayah: lastReading.ayah,
      icon: <BookOpen className="h-5 w-5 text-primary" />,
      onClick: () => navigate(`/surah/${lastReading.surah}?ayah=${lastReading.ayah}`),
    },
    lastListening && {
      key: "listening",
      label: t("continue_listening"),
      surah: lastListening.surah,
      ayah: lastListening.ayah,
      icon: <Headphones className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
      onClick: () => navigate(`/surah/${lastListening.surah}?mode=listening&ayah=${lastListening.ayah}`),
    },
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    surah: number;
    ayah: number;
    icon: React.ReactNode;
    onClick: () => void;
  }>;

  // Migrate persisted dashboard order: keep the user's chosen positions
  // for sections they've reordered, drop any unknown IDs (defensive
  // against stale localStorage from old builds), and append every
  // DEFAULT section that's missing — this is what surfaces newly
  // shipped sections (e.g. "tools") to existing installs without
  // forcing the user to manually reset their order.
  const normalizedDashboardOrder = (() => {
    const known = new Set<DashboardSectionId>(DEFAULT_DASHBOARD_ORDER);
    const seen = new Set<DashboardSectionId>();
    const result: DashboardSectionId[] = [];
    for (const id of dashboardOrder) {
      if (known.has(id) && !seen.has(id)) {
        result.push(id);
        seen.add(id);
      }
    }
    for (const id of DEFAULT_DASHBOARD_ORDER) {
      if (!seen.has(id)) {
        result.push(id);
        seen.add(id);
      }
    }
    return result;
  })();

  const moveDashboardSection = (sectionId: DashboardSectionId, direction: "up" | "down") => {
    setDashboardOrder((prev) => {
      const order = prev.length > 0 ? [...prev] : [...DEFAULT_DASHBOARD_ORDER];
      const index = order.indexOf(sectionId);
      if (index === -1) return order;
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= order.length) return order;
      [order[index], order[target]] = [order[target], order[index]];
      return order;
    });
  };

  const toggleSectionVisibility = (sectionId: DashboardSectionId) => {
    setHiddenSections((prev) => prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId]);
  };

  const activitySummary = (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 rounded-3xl glass-card p-4 shadow-soft border border-white/10" data-testid="quran-home-activity-summary">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-foreground">{language === "ar" ? "ملخص اليوم" : "Today at a glance"}</p>
        <span className="text-xs text-primary font-semibold">{language === "ar" ? `${toArabicNumerals(todayCount)} / ${toArabicNumerals(goal)}` : `${todayCount} / ${goal}`}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-primary/5 p-3 text-center">
          {todayCount > 0 ? (
            <>
              <p className="text-lg font-bold text-primary">{language === "ar" ? toArabicNumerals(todayCount) : todayCount}</p>
              <p className="text-[11px] text-muted-foreground">{language === "ar" ? "ورد اليوم" : "Today’s wird"}</p>
            </>
          ) : (
            <>
              <p className="text-base font-bold text-primary leading-tight">{t("home_empty_wird_cta")}</p>
              <p className="text-[11px] text-muted-foreground">{language === "ar" ? "ورد اليوم" : "Today’s wird"}</p>
            </>
          )}
        </div>
        <div className="rounded-2xl bg-card p-3 text-center border border-border/50">
          {streak > 0 ? (
            <>
              <p className="text-lg font-bold text-foreground">{language === "ar" ? toArabicNumerals(streak) : streak}</p>
              <p className="text-[11px] text-muted-foreground">{language === "ar" ? "أيام متتالية" : "Streak days"}</p>
            </>
          ) : (
            <>
              <p className="text-base font-bold text-foreground leading-tight">{t("home_empty_streak_cta")}</p>
              <p className="text-[11px] text-muted-foreground">{language === "ar" ? "أيام متتالية" : "Streak days"}</p>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => navigate("/bookmarks")}
          data-testid="quran-home-bookmarks-stat"
          className="rounded-2xl bg-card p-3 text-center border border-border/50 hover:border-primary/30 hover:bg-muted/40 transition-colors"
        >
          {bookmarks.length > 0 ? (
            <>
              <p className="text-lg font-bold text-foreground">{language === "ar" ? toArabicNumerals(bookmarks.length) : bookmarks.length}</p>
              <p className="text-[11px] text-muted-foreground">{language === "ar" ? "آيات محفوظة" : "Bookmarked ayat"}</p>
            </>
          ) : (
            <>
              <p className="text-base font-bold text-foreground leading-tight">{t("home_empty_bookmarks_cta")}</p>
              <p className="text-[11px] text-muted-foreground">{language === "ar" ? "آيات محفوظة" : "Bookmarked ayat"}</p>
            </>
          )}
        </button>
      </div>
    </motion.div>
  );

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
      setSurahSearch("");
      setView(card.view);
    }
  };

  const dashboardSections: Record<DashboardSectionId, React.ReactNode | null> = {
    "next-prayer": nextPrayer ? (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center gap-2 text-[11px] text-muted-foreground bg-primary/5 py-1.5 px-3 rounded-full border border-primary/10 w-fit" data-testid="quran-home-next-prayer-chip">
        <Clock className="h-3 w-3 text-primary" />
        <span>{t("next_prayer")}: <span className="font-bold text-foreground">{nextPrayer.name}</span></span>
        <span className="opacity-50">•</span>
        <span className="font-bold text-primary">{language === "ar" ? toArabicNumerals(nextPrayer.time) : nextPrayer.time}</span>
      </motion.div>
    ) : null,
    "featured-resume": lastRead ? (
      <motion.button
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => {
          const params = new URLSearchParams();
          if (lastRead.mode === "listening") params.set("mode", "listening");
          params.set("ayah", String(lastRead.ayah));
          navigate(`/surah/${lastRead.surah}?${params.toString()}`);
        }}
        data-testid="quran-home-featured-resume-card"
        className={cn(
          "flex w-full items-center rounded-[2rem] glass-card py-5 px-6 shadow-2xl border border-white/10 hover-lift gap-4 mb-4 relative overflow-hidden group",
          isRTL ? "text-end" : "text-start"
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 shadow-inner">
          {lastRead.mode === "listening" ? <Headphones className="h-6 w-6 text-primary" /> : <BookOpen className="h-6 w-6 text-primary" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest mb-1">{lastRead.mode === "listening" ? t("continue_listening") : t("continue_reading")}</p>
          <h3 className="text-base font-serif font-bold text-foreground truncate">{t("surah")} {getSurahName(lastRead.surah)}</h3>
          <p className="text-[11px] text-muted-foreground/80 mt-0.5">{t("ayah")} {language === "en" ? lastRead.ayah : toArabicNumerals(lastRead.ayah)}</p>
        </div>
        <div className="shrink-0 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
          {isRTL ? <ArrowRight className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-primary" />}
        </div>
      </motion.button>
    ) : null,
    "quick-resume": quickResumeCards.length > 0 ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4" data-testid="quran-home-quick-resume-grid">
        {quickResumeCards.map((card) => (
          <motion.button
            key={card.key}
            whileTap={{ scale: 0.98 }}
            onClick={card.onClick}
            data-testid={`quran-home-quick-resume-${card.key}`}
            className="rounded-2xl border border-border/50 bg-card p-4 shadow-soft text-start hover:border-primary/30 transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-xl bg-primary/10 p-2">{card.icon}</div>
              <p className="text-sm font-semibold text-foreground">{card.label}</p>
            </div>
            <p className="font-arabic text-base font-bold text-foreground truncate">{getSurahName(card.surah)}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("ayah")} {language === "en" ? card.ayah : toArabicNumerals(card.ayah)}</p>
          </motion.button>
        ))}
      </div>
    ) : null,
    activity: activitySummary,
    tools: (
      <div className="mt-4 mb-2" dir={isRTL ? "rtl" : "ltr"} data-testid="quran-home-tools-grid">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-3">
          {language === "ar" ? "أدوات سريعة" : "Quick tools"}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {/*
            Sleep Mode tile. Rendered as a div+role="button" (rather than a
            real <button>) because we host an inline play/pause control
            inside it when a session is active — nesting a real <button>
            inside another <button> is invalid HTML and breaks
            accessibility tooling. The outer click still navigates to
            the full Sleep page; the inner control toggles
            pause/resume in place via stopPropagation, so the user can
            silence playback without leaving the home screen.
          */}
          <motion.div
            whileTap={{ scale: 0.97 }}
            role="button"
            tabIndex={0}
            onClick={() => navigate("/sleep")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate("/sleep");
              }
            }}
            aria-label={language === "ar" ? "وضع النوم" : "Sleep Mode"}
            data-testid="quran-home-tool-sleep"
            data-sleep-active={sleepIsActive ? "true" : "false"}
            className={cn(
              "flex items-center gap-3 rounded-2xl glass-card p-4 shadow-soft border text-start transition-colors cursor-pointer",
              sleepIsActive
                ? "border-indigo-400/50 hover:border-indigo-400/70"
                : "border-white/10 hover:border-primary/30",
            )}
          >
            <div
              className={cn(
                "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-colors",
                sleepIsActive
                  ? "bg-indigo-500/20 border-indigo-400/50 text-indigo-500 dark:text-indigo-200"
                  : "bg-indigo-500/10 border-indigo-500/20 text-indigo-500 dark:text-indigo-300",
              )}
            >
              <BedDouble className="h-5 w-5" />
              {sleepIsActive && sleepSession.status === "playing" && (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-2xl border border-indigo-400/40 animate-ping"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground truncate">{language === "ar" ? "وضع النوم" : "Sleep Mode"}</p>
              <p
                className={cn(
                  "text-[11px] truncate",
                  sleepIsActive
                    ? "text-indigo-500 dark:text-indigo-300 font-medium"
                    : "text-muted-foreground",
                )}
                data-testid="quran-home-tool-sleep-status"
              >
                {sleepTileLabel}
              </p>
            </div>
            {sleepIsActive && (
              <button
                type="button"
                onClick={(e) => {
                  // Keep the tap local — the parent tile would otherwise
                  // navigate the user away to the Sleep page.
                  e.stopPropagation();
                  void sleepModePlayer.togglePlay();
                }}
                onKeyDown={(e) => {
                  // Stop the parent's Enter/Space navigation handler
                  // from also firing when the user activates this
                  // inner control with the keyboard.
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                  }
                }}
                aria-label={
                  sleepSession.status === "playing"
                    ? (language === "ar" ? "إيقاف مؤقت" : "Pause Sleep Mode")
                    : (language === "ar" ? "استئناف" : "Resume Sleep Mode")
                }
                data-testid="quran-home-tool-sleep-toggle"
                data-sleep-toggle-state={sleepSession.status}
                className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/15 border border-indigo-400/30 text-indigo-500 dark:text-indigo-200 hover:bg-indigo-500/25 active:scale-95 transition"
              >
                {sleepSession.status === "playing" ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </button>
            )}
          </motion.div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/offline")}
            data-testid="quran-home-tool-offline"
            className="flex items-center gap-3 rounded-2xl glass-card p-4 shadow-soft border border-white/10 text-start hover:border-primary/30 transition-colors"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-300">
              <Download className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground truncate">{language === "ar" ? "المكتبة بدون إنترنت" : "Offline Library"}</p>
              <p
                className="text-[11px] text-muted-foreground truncate"
                data-testid="quran-home-tool-offline-status"
              >
                {offlineTileLabel}
              </p>
            </div>
          </motion.button>
        </div>
      </div>
    ),
    modes: (
      <div className="grid grid-cols-2 gap-4 mt-2" dir={isRTL ? "rtl" : "ltr"} data-testid="quran-home-mode-grid">
        {modeCards.map((card, i) => (
          <motion.button
            key={card.key}
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.06 + i * 0.1, duration: 0.5, ease: "easeOut" }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleModeCard(card)}
            className="flex flex-col items-center justify-center text-center gap-4 rounded-[2rem] glass-card px-4 py-8 shadow-2xl border border-white/10 hover:border-primary/30 transition-all relative overflow-hidden group"
          >
            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-5 group-hover:opacity-10 transition-opacity", card.bgGradient)} />
            <div className={cn("relative z-10 flex h-16 w-16 items-center justify-center rounded-[1.5rem] shadow-inner border border-white/10 bg-white/5", card.accentColor)}>
              <div className="absolute inset-0 bg-current opacity-5 rounded-[1.5rem]" />
              {card.icon}
            </div>
            <div className="relative z-10">
              <h3 className="text-lg font-serif font-bold text-foreground mb-1">{t(card.titleKey)}</h3>
              <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-bold leading-tight">{t(card.subtitleKey)}</p>
            </div>
            <div className={cn(
              "absolute bottom-4 opacity-60 group-hover:opacity-100 transition-opacity",
              isRTL ? "left-4" : "right-4"
            )}>
              {isRTL ? <ArrowRight className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-primary" />}
            </div>
          </motion.button>
        ))}
      </div>
    ),
  };

  const handleSurahSelect = (surahNumber: number) => {
    if (view === "surahs_listening") {
      navigate(`/surah/${surahNumber}?mode=listening`);
    } else {
      navigate(`/surah/${surahNumber}`);
    }
  };

  const filteredSurahs = surahSearch.trim()
    ? surahs.filter((s) => {
        const q = surahSearch.toLowerCase().trim();
        return (
          s.englishName.toLowerCase().includes(q) ||
          s.name.includes(q) ||
          String(s.number).includes(q)
        );
      })
    : surahs;

  return (
    <div className="px-4 pt-6 pb-6" dir={isRTL ? "rtl" : "ltr"}>

      {/* Dynamic Header & Greeting */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-0.5">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              {getGreeting()}
            </h1>
          </div>
          <div className="flex items-center gap-1.5">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowDashboardEditor((prev) => !prev)}
              data-testid="quran-home-dashboard-editor-button"
              className="rounded-xl p-2.5 glass-card text-muted-foreground shadow-soft hover:bg-muted/50 transition-colors"
            >
              <GripVertical className="h-5 w-5" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate("/sleep")}
              className="rounded-xl p-2.5 glass-card text-muted-foreground shadow-soft hover:bg-muted/50 transition-colors">
              <BedDouble className="h-5 w-5" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate("/settings")}
              className="rounded-xl p-2.5 glass-card text-muted-foreground shadow-soft hover:bg-muted/50 transition-colors">
              <Star className="h-5 w-5" />
            </motion.button>
          </div>
        </div>

        {showDashboardEditor && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-3xl glass-card border border-border/40 p-4 shadow-soft"
            data-testid="quran-home-dashboard-editor-panel"
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{language === "ar" ? "تخصيص الصفحة الرئيسية" : "Customize Home"}</p>
                <p className="text-xs text-muted-foreground">{language === "ar" ? "أخفِ البطاقات أو غيّر ترتيبها كما تحب." : "Show, hide, and reorder dashboard sections."}</p>
              </div>
              <button onClick={() => { setDashboardOrder(DEFAULT_DASHBOARD_ORDER); setHiddenSections([]); }} className="text-xs text-primary font-semibold" data-testid="quran-home-dashboard-reset-button">
                {language === "ar" ? "إعادة ضبط" : "Reset"}
              </button>
            </div>
            <div className="space-y-2">
              {normalizedDashboardOrder.map((sectionId, index) => {
                const hidden = hiddenSections.includes(sectionId);
                return (
                  <div key={sectionId} className="flex items-center gap-2 rounded-2xl border border-border/40 bg-card/70 px-3 py-2" data-testid={`quran-home-dashboard-item-${sectionId}`}>
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{sectionLabels[sectionId]}</p>
                    </div>
                    <button onClick={() => toggleSectionVisibility(sectionId)} className="rounded-lg p-2 hover:bg-muted transition-colors" data-testid={`quran-home-dashboard-toggle-${sectionId}`}>
                      {hidden ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-primary" />}
                    </button>
                    <button onClick={() => moveDashboardSection(sectionId, "up")} disabled={index === 0} className="rounded-lg p-2 hover:bg-muted transition-colors disabled:opacity-30" data-testid={`quran-home-dashboard-up-${sectionId}`}>
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button onClick={() => moveDashboardSection(sectionId, "down")} disabled={index === normalizedDashboardOrder.length - 1} className="rounded-lg p-2 hover:bg-muted transition-colors disabled:opacity-30" data-testid={`quran-home-dashboard-down-${sectionId}`}>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>

      {/* Search bar — visible only when surah list is shown */}
      <AnimatePresence>
        {(view === "surahs" || view === "surahs_listening") && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="relative mb-3"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" style={isRTL ? { left: "auto", right: "0.75rem" } : {}} />
            <input
              type="text"
              value={surahSearch}
              onChange={(e) => setSurahSearch(e.target.value)}
              placeholder={language === "ar" ? "ابحث عن سورة..." : "Search surah..."}
              dir={isRTL ? "rtl" : "ltr"}
              className="w-full rounded-xl glass-card py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all shadow-soft"
              style={isRTL ? { paddingRight: "2.5rem", paddingLeft: surahSearch ? "2.5rem" : "1rem" } : { paddingLeft: "2.5rem", paddingRight: surahSearch ? "2.5rem" : "1rem" }}
            />
            {surahSearch && (
              <button
                onClick={() => setSurahSearch("")}
                className="absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                style={isRTL ? { left: "0.75rem" } : { right: "0.75rem" }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">

        {/* ── HOME VIEW ── */}
        {view === "home" && (
          <motion.div
            key="home"
            initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
            transition={{ duration: 0.22 }}>


            {normalizedDashboardOrder
              .filter((sectionId) => !hiddenSections.includes(sectionId))
              .map((sectionId) => (
                <div key={sectionId}>{dashboardSections[sectionId]}</div>
              ))}

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
              : filteredSurahs.map((surah, i) => (
                  // Refactored from `<motion.button>` to a div+role="button"
                  // so we can host the nested SurahOfflineButton (a real
                  // <button>) inside the card without violating HTML's
                  // "no nested interactive elements" rule.
                  <motion.div
                    key={surah.number}
                    role="button"
                    tabIndex={0}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.012, 0.35) }}
                    onClick={() => handleSurahSelect(surah.number)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSurahSelect(surah.number);
                      }
                    }}
                    className="flex w-full cursor-pointer items-center gap-4 rounded-2xl glass-card px-5 py-4 shadow-sm hover:shadow-xl transition-all active:scale-[0.99] group border border-white/5 hover:border-primary/20 relative overflow-hidden">

                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/10 group-hover:bg-primary/10 group-hover:border-primary/20 transition-all shadow-inner font-serif font-bold text-foreground/80 group-hover:text-primary">
                      {language === "en" ? surah.number : toArabicNumerals(surah.number)}
                    </div>

                    <div className={cn("relative z-10 flex-1 min-w-0", isRTL ? "text-end" : "text-start")}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-arabic text-lg font-bold group-hover:text-primary transition-colors leading-tight">
                          {language === "ar" ? surah.name : surah.englishName}
                        </p>
                        <div className="flex items-center gap-1 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
                          {favorites.includes(surah.number) && (
                            <Star className="h-3 w-3 fill-primary text-primary" />
                          )}
                          {bookmarkedSurahs.includes(surah.number) && (
                            <Bookmark className="h-3 w-3 text-primary fill-primary/20" />
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest leading-none">
                        {language === "en" ? surah.numberOfAyahs : toArabicNumerals(surah.numberOfAyahs)}{" "}
                        {t("ayahs")} · <span className="opacity-70">{getRevelationType(surah.revelationType)}</span>
                      </p>
                    </div>

                    <SurahOfflineButton surahNumber={surah.number} />

                    <div className="relative z-10 shrink-0 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                      <ChevronRight className="h-5 w-5 text-primary/40" />
                    </div>
                  </motion.div>
                ))}
          </motion.div>
        )}

      </AnimatePresence>

      <div className="h-4" />

    </div>
  );
}
