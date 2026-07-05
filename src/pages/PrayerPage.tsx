import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useStreak } from "@/hooks/useStreak";
import { Progress } from "@/components/ui/progress";
import { cn, getDayName, getHijriDateLocalized, getGregorianDateLocalized, toArabicNumerals } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Compass, MapPin, ChevronLeft, Flame, History, Search } from "lucide-react";
import PrayerGuideCard from "@/components/prayer/PrayerGuideCard";
import PrayerHistorySheet from "@/components/prayer/PrayerHistorySheet";
import CitySearchModal from "@/components/prayer/CitySearchModal";
import {
  calculatePrayerTimes,
  formatLocalizedTime,
  getNextPrayer,
  getSecondsUntilPrayer,
  type PrayerTimes,
  type CalculationMethod } from
"@/lib/prayer-times";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import type { City } from "@/data/cities";
import { useLocation } from "@/hooks/useLocation";

const PRAYERS = [
{ id: "fajr", icon: "🌅", timeOfDay: "dawn" },
{ id: "dhuhr", icon: "☀️", timeOfDay: "noon" },
{ id: "asr", icon: "🌤", timeOfDay: "afternoon" },
{ id: "maghrib", icon: "🌇", timeOfDay: "sunset" },
{ id: "isha", icon: "🌙", timeOfDay: "night" }];


function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

interface DayData {
  date: string;
  completed: string[];
}

function formatHMS(totalSeconds: number): {h: string;m: string;s: string;} {
  const abs = Math.max(0, totalSeconds);
  const h = Math.floor(abs / 3600);
  const m = Math.floor(abs % 3600 / 60);
  const s = abs % 60;
  return {
    h: h.toString().padStart(2, "0"),
    m: m.toString().padStart(2, "0"),
    s: s.toString().padStart(2, "0")
  };
}

function formatCompactCountdown(totalSeconds: number, language: string): string {
  if (totalSeconds <= 0) return "";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor(totalSeconds % 3600 / 60);
  if (language === "en") {
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}`;
    return `${m}m`;
  }
  if (h > 0) return toArabicNumerals(`${h}:${m.toString().padStart(2, "0")}`);
  return `${toArabicNumerals(String(m))} د`;
}

export default function PrayerPage() {
  const { t, language, isRTL } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refresh: refreshGPS } = useLocation();
  const [data, setData] = useLocalStorage<DayData>("wise-prayer-today", {
    date: getTodayKey(),
    completed: []
  });
  const [calcMethod] = useLocalStorage<CalculationMethod>("wise-prayer-method", "egyptian");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [citySearchOpen, setCitySearchOpen] = useState(false);

  const cachedLocation = useMemo(() => {
    try {
      const manual = localStorage.getItem("wise-manual-location");
      if (manual) return JSON.parse(manual) as {latitude: number;longitude: number;city?: string;};
      const cached = localStorage.getItem("wise-user-location");
      if (cached) return JSON.parse(cached) as {latitude: number;longitude: number;city?: string;};
    } catch (error) {
      console.error("Error parsing cached location for prayer times:", error);
    }
    return null;
  }, []);

  const handleSelectCity = useCallback((city: City) => {
    const loc = { latitude: city.lat, longitude: city.lng, city: language === "ar" ? city.nameAr : city.name, timestamp: Date.now() };
    localStorage.setItem("wise-manual-location", JSON.stringify(loc));
    window.location.reload();
  }, [language]);

  const handleUseGPS = useCallback(() => {
    localStorage.removeItem("wise-manual-location");
    refreshGPS();
    window.location.reload();
  }, [refreshGPS]);

  const { streak } = useStreak();

  const [now, setNow] = useState(() => new Date());
  const prayerTimes = useMemo(() => calculatePrayerTimes(now, {
    latitude: cachedLocation?.latitude,
    longitude: cachedLocation?.longitude,
    method: calcMethod
  }), [now, cachedLocation?.latitude, cachedLocation?.longitude, calcMethod]);
  const nextPrayer = useMemo(() => getNextPrayer(prayerTimes, now), [prayerTimes, now]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const todayData = useMemo(() => {
    const today = getTodayKey();
    if (data.date !== today) {
      const fresh = { date: today, completed: [] };
      setData(fresh);
      return fresh;
    }
    return data;
  }, [data, setData]);

  const togglePrayer = useCallback((prayerId: string) => {
    const isCompleting = !todayData.completed.includes(prayerId);
    const newCompleted = isCompleting
      ? [...todayData.completed, prayerId]
      : todayData.completed.filter((p) => p !== prayerId);
    setData({ ...todayData, completed: newCompleted });

    if (user) {
      const today = getTodayKey();
      supabase.from("user_prayer_history").upsert({
        user_id: user.id,
        date: today,
        prayer_name: prayerId,
        completed: isCompleting,
        completed_at: isCompleting ? new Date().toISOString() : null,
      }, { onConflict: "user_id,date,prayer_name" }).then(() => {});
    }
  }, [todayData, setData, user]);

  const progress = todayData.completed.length / PRAYERS.length * 100;

  const heroTime = nextPrayer ? formatHMS(nextPrayer.secondsLeft) : null;
  const heroPrayer = nextPrayer ? PRAYERS.find((p) => p.id === nextPrayer.id) : null;

  const allDone = todayData.completed.length === PRAYERS.length;

  return (
    <div className="px-4 pt-5 pb-5" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold heading-decorated shrink-0">{t("prayers_title")}</h1>
        <div className="flex items-center gap-2">
          {cachedLocation?.city && (
            <button
              onClick={() => setCitySearchOpen(true)}
              className="flex items-center gap-1 text-xs text-muted-foreground bg-card rounded-full px-2.5 py-1 border border-border/40 shadow-soft hover:border-primary/30 transition-colors"
            >
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-[80px]">{cachedLocation.city}</span>
            </button>
          )}
          {!cachedLocation?.city && (
            <button
              onClick={() => setCitySearchOpen(true)}
              className="flex items-center gap-1 text-xs text-muted-foreground bg-card rounded-full px-2.5 py-1 border border-border/40 shadow-soft hover:border-primary/30 transition-colors"
            >
              <Search className="h-3 w-3 shrink-0" />
            </button>
          )}
          <button
            onClick={() => setHistoryOpen(true)}
            className="flex items-center gap-1 text-xs text-muted-foreground bg-card rounded-full px-2.5 py-1 border border-border/40 shadow-soft hover:border-primary/30 transition-colors"
          >
            <History className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Date + Hijri Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-3 rounded-2xl gradient-hero border border-primary/12 p-4 shadow-elevated text-center relative overflow-hidden">
        <div className="absolute inset-0 pattern-islamic pointer-events-none" />
        <div className="relative z-10">
          <p className="text-base font-bold text-foreground">{getDayName(new Date().getDay(), language)}</p>
          <p className="text-lg font-bold text-primary font-arabic mt-0.5">{getHijriDateLocalized(new Date(), language)}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{getGregorianDateLocalized(new Date(), language)}</p>
        </div>
      </motion.div>

      {/* Hero Countdown Widget */}
      {nextPrayer && heroPrayer && heroTime && !allDone && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl bg-card border border-primary/15 shadow-elevated p-5 mb-3 relative overflow-hidden">

          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{t("next_prayer")}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xl">{heroPrayer.icon}</span>
                <span className="text-lg font-bold text-foreground">{t(heroPrayer.id as any)}</span>
              </div>
            </div>
            {streak > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-accent/15 border border-accent/25 px-3 py-1.5">
                <Flame className="h-3.5 w-3.5 text-accent streak-glow" />
                <span className="text-xs font-bold text-accent">
                  {language === "ar" ? toArabicNumerals(String(streak)) : streak}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-2">
            <CountdownUnit value={heroTime.h} label={t("hour")} />
            <span className="text-2xl font-bold text-primary/60 mb-5">:</span>
            <CountdownUnit value={heroTime.m} label={t("minute")} animate={heroTime.s === "00"} />
            <span className="text-2xl font-bold text-primary/60 mb-5">:</span>
            <CountdownUnit value={heroTime.s} label={t("second")} animate />
          </div>
        </motion.div>
      )}

      {allDone && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl bg-primary/10 border border-primary/20 shadow-elevated p-4 mb-3 text-center">
          <Flame className="h-6 w-6 text-accent mx-auto mb-1" />
          <p className="font-bold text-primary text-base">{t("prayers_complete")}</p>
        </motion.div>
      )}

      {/* Progress Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="rounded-2xl bg-card border border-border/40 shadow-soft px-4 py-3 mb-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-medium">
            {language === "ar"
              ? toArabicNumerals(`${todayData.completed.length}/${PRAYERS.length}`)
              : `${todayData.completed.length}/${PRAYERS.length}`}
            {" "}{t("complete_prayers")}
          </span>
          <span className="text-xs font-bold text-primary">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} variant="gradient" size="default" />
      </motion.div>

      {/* Qibla Banner */}
      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate("/qibla")}
        className={cn(
          "w-full rounded-2xl bg-card border border-gold/25 shadow-soft flex items-center gap-3 px-4 py-3 mb-4 gradient-gold-card hover-lift",
          isRTL ? "text-right" : "text-left"
        )}>
        <div className="rounded-xl bg-gold/15 border border-gold/20 p-2.5 shrink-0">
          <Compass className="h-5 w-5 text-gold" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">{t("qibla_banner")}</p>
          <p className="text-xs text-muted-foreground">{t("qibla_subtitle")}</p>
        </div>
        <ChevronLeft className={cn("h-4 w-4 text-muted-foreground shrink-0", !isRTL && "rotate-180")} />
      </motion.button>

      {/* Prayer List */}
      <div className="space-y-2 mb-6">
        {PRAYERS.map((prayer, i) => {
          const done = todayData.completed.includes(prayer.id);
          const isNext = nextPrayer?.id === prayer.id && !done;
          const time = prayerTimes[prayer.id as keyof PrayerTimes];
          const secsLeft = getSecondsUntilPrayer(time, now);
          const isPassed = secsLeft <= 0;

          return (
            <motion.button
              key={prayer.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + i * 0.05 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => togglePrayer(prayer.id)}
              className={cn(
                "flex w-full items-center gap-3.5 rounded-2xl px-4 py-3.5 transition-all border relative overflow-hidden",
                done
                  ? "bg-primary/8 border-primary/20 shadow-soft"
                  : isNext
                  ? "bg-card border-primary/30 shadow-elevated ring-1 ring-primary/20"
                  : "bg-card border-border/40 shadow-soft"
              )}>
              {isNext && !done && (
                <motion.div
                  className="absolute inset-0 rounded-2xl pointer-events-none"
                  animate={{ opacity: [0, 0.06, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  style={{ background: "hsl(var(--primary))" }}
                />
              )}

              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 transition-all",
                done ? "bg-primary/15" : isNext ? "bg-primary/10" : "bg-muted/60"
              )}>
                {done
                  ? <span className="text-primary text-lg font-bold">✓</span>
                  : <span>{prayer.icon}</span>
                }
              </div>

              <div className={cn("flex-1 min-w-0", isRTL ? "text-right" : "text-left")}>
                <p className={cn(
                  "font-bold text-sm",
                  done ? "line-through text-muted-foreground" : isNext ? "text-primary" : "text-foreground"
                )}>
                  {t(prayer.id as any)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatLocalizedTime(time, language)}
                </p>
              </div>

              {!done && !isPassed && (
                <span className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-bold tabular-nums shrink-0",
                  isNext ? "badge-gradient" : "bg-muted text-muted-foreground"
                )}>
                  {formatCompactCountdown(secsLeft, language)}
                </span>
              )}

              {done && (
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <span className="text-primary-foreground text-[10px] font-bold">✓</span>
                </div>
              )}

            </motion.button>
          );
        })}
      </div>

      {/* Prayer Guide */}
      <PrayerGuideCard />

      <PrayerHistorySheet open={historyOpen} onClose={() => setHistoryOpen(false)} />
      <CitySearchModal
        open={citySearchOpen}
        onClose={() => setCitySearchOpen(false)}
        onSelectCity={handleSelectCity}
        onUseGPS={handleUseGPS}
      />
    </div>
  );
}

function CountdownUnit({ value, label, animate: shouldAnimate = false }: {value: string;label: string; animate?: boolean}) {
  const { language } = useLanguage();
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="rounded-xl bg-primary/8 border border-primary/15 px-3.5 py-2 min-w-[52px] text-center relative overflow-hidden">
        {shouldAnimate ? (
          <motion.span
            key={value}
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="text-2xl font-bold text-primary tabular-nums block"
          >
            {language === "ar" ? toArabicNumerals(value) : value}
          </motion.span>
        ) : (
          <span className="text-2xl font-bold text-primary tabular-nums block">
            {language === "ar" ? toArabicNumerals(value) : value}
          </span>
        )}
      </div>
      <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
    </div>
  );
}
