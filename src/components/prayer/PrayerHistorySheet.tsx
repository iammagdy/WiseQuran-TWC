import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, History } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { cn, toArabicNumerals } from "@/lib/utils";
import { Flame } from "lucide-react";

import { loadPrayerLog, getPrayerStreak, type PrayerId } from "@/lib/prayer-log";

const PRAYERS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
const PRAYER_NAMES_AR = { fajr: "ف", dhuhr: "ظ", asr: "ع", maghrib: "م", isha: "ع" };
const PRAYER_NAMES_EN = { fajr: "F", dhuhr: "D", asr: "A", maghrib: "M", isha: "I" };
const PRAYER_FULL_AR: Record<PrayerId, string> = {
  fajr: "الفجر", dhuhr: "الظهر", asr: "العصر", maghrib: "المغرب", isha: "العشاء",
};
const PRAYER_FULL_EN: Record<PrayerId, string> = {
  fajr: "Fajr", dhuhr: "Dhuhr", asr: "Asr", maghrib: "Maghrib", isha: "Isha",
};

type DayHistory = Record<string, boolean>;

function getDateRange(days: number): string[] {
  const result: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    result.push(d.toISOString().slice(0, 10));
  }
  return result;
}

function loadLocalHistory(): Record<string, DayHistory> {
  const result: Record<string, DayHistory> = {};
  const log = loadPrayerLog();
  for (const [date, day] of Object.entries(log)) {
    result[date] = {};
    for (const p of PRAYERS) {
      if (day[p]) result[date][p] = true;
    }
  }
  return result;
}

interface PrayerHistorySheetProps {
  open: boolean;
  onClose: () => void;
}

export default function PrayerHistorySheet({ open, onClose }: PrayerHistorySheetProps) {
  const { isRTL, language } = useLanguage();
  const { user } = useAuth();
  const [history, setHistory] = useState<Record<string, DayHistory>>({});
  const [loading, setLoading] = useState(false);

  const dateRange = useMemo(() => getDateRange(30), []);

  useEffect(() => {
    if (!open) return;

    if (user) {
      setLoading(true);
      const since = dateRange[0];
      supabase
        .from("user_prayer_history")
        .select("date, prayer_name, completed")
        .eq("user_id", user.id)
        .gte("date", since)
        .then(({ data }) => {
          const map: Record<string, DayHistory> = {};
          if (data) {
            for (const row of data) {
              if (!map[row.date]) map[row.date] = {};
              map[row.date][row.prayer_name] = row.completed;
            }
          }
          setHistory(map);
          setLoading(false);
        });
    } else {
      setHistory(loadLocalHistory());
    }
  }, [open, user, dateRange]);

  const perPrayerStreaks = useMemo(() => {
    // For signed-in users, derive streaks from the same `history` rows the
    // grid below renders (cloud-backed). For signed-out users, the `history`
    // is built from the local log already, so this stays consistent.
    const out: Record<PrayerId, number> = { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 };
    if (user) {
      const asLog: Record<string, Partial<Record<PrayerId, boolean>>> = {};
      for (const [date, day] of Object.entries(history)) {
        asLog[date] = {};
        for (const p of PRAYERS) if (day[p]) asLog[date]![p] = true;
      }
      for (const p of PRAYERS) out[p] = getPrayerStreak(asLog, p);
    } else {
      const log = loadPrayerLog();
      for (const p of PRAYERS) out[p] = getPrayerStreak(log, p);
    }
    return out;
  }, [history, user]);

  const FULL_NAMES = language === "ar" ? PRAYER_FULL_AR : PRAYER_FULL_EN;

  const completionRate = useMemo(() => {
    let total = 0;
    let done = 0;
    for (const date of dateRange) {
      const day = history[date];
      if (!day) continue;
      for (const p of PRAYERS) {
        total++;
        if (day[p]) done++;
      }
    }
    if (total === 0) return 0;
    return Math.round((done / total) * 100);
  }, [history, dateRange]);

  const NAMES = language === "ar" ? PRAYER_NAMES_AR : PRAYER_NAMES_EN;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="fixed bottom-0 start-0 end-0 z-50 rounded-t-3xl bg-card border-t border-border shadow-2xl max-h-[80vh] flex flex-col"
            dir={isRTL ? "rtl" : "ltr"}
          >
            <div className="w-10 h-1 bg-border rounded-full mx-auto mt-3 mb-1 shrink-0" />

            <div className="px-5 pt-2 pb-4 shrink-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-bold text-foreground">
                    {isRTL ? "سجل الصلوات" : "Prayer History"}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-full p-2 bg-muted hover:bg-muted/80 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="rounded-xl bg-primary/8 border border-primary/15 px-4 py-3 mb-2">
                <p className="text-xs text-muted-foreground mb-0.5">
                  {isRTL ? "معدل الإنجاز (30 يوم)" : "Completion rate (30 days)"}
                </p>
                <p className="text-2xl font-bold text-primary">
                  {language === "ar" ? toArabicNumerals(String(completionRate)) : completionRate}%
                </p>
              </div>

              <div className="grid grid-cols-5 gap-1.5 mb-1">
                {PRAYERS.map((p) => {
                  const v = perPrayerStreaks[p];
                  return (
                    <div
                      key={p}
                      className={cn(
                        "rounded-lg border px-1 py-1.5 text-center",
                        v > 0 ? "bg-accent/10 border-accent/25" : "bg-muted/40 border-border/40"
                      )}
                    >
                      <p className="text-[9px] text-muted-foreground font-medium truncate">{FULL_NAMES[p]}</p>
                      <div className="flex items-center justify-center gap-0.5 mt-0.5">
                        {v > 0 && <Flame className="h-2.5 w-2.5 text-accent" />}
                        <span className={cn("text-xs font-bold tabular-nums", v > 0 ? "text-accent" : "text-muted-foreground")}>
                          {language === "ar" ? toArabicNumerals(String(v)) : v}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {!user && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  {isRTL ? "سجّل الدخول لحفظ سجل الصلوات عبر الأجهزة" : "Sign in to sync prayer history across devices"}
                </p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-6">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <span className="h-6 w-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                </div>
              ) : (
                <>
                  <div className={`grid gap-1 mb-2 text-[10px] text-muted-foreground font-medium ${isRTL ? "text-end" : "text-start"}`}
                    style={{ gridTemplateColumns: "auto repeat(5, 1fr)" }}
                  >
                    <span />
                    {PRAYERS.map((p) => (
                      <span key={p} className="text-center">{NAMES[p]}</span>
                    ))}
                  </div>
                  <div className="space-y-1">
                    {dateRange.map((date) => {
                      const day = history[date] ?? {};
                      const d = new Date(date + "T00:00:00");
                      const label = d.toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", {
                        month: "short",
                        day: "numeric",
                      });
                      return (
                        <div
                          key={date}
                          className="grid gap-1 items-center"
                          style={{ gridTemplateColumns: "auto repeat(5, 1fr)" }}
                        >
                          <span className="text-[10px] text-muted-foreground w-14 shrink-0">{label}</span>
                          {PRAYERS.map((p) => {
                            const done = day[p];
                            return (
                              <div
                                key={p}
                                className={cn(
                                  "h-7 rounded-md flex items-center justify-center text-[9px] font-bold transition-colors",
                                  done
                                    ? "bg-primary/20 text-primary border border-primary/20"
                                    : Object.keys(day).length > 0
                                    ? "bg-destructive/10 text-destructive/50 border border-destructive/10"
                                    : "bg-muted/60 text-muted-foreground/40 border border-border/30"
                                )}
                              >
                                {done ? "✓" : ""}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-3 mt-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-primary/20 border border-primary/20 inline-block" />
                      {isRTL ? "أُديت" : "Done"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-destructive/10 border border-destructive/10 inline-block" />
                      {isRTL ? "فائتة" : "Missed"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-muted/60 border border-border/30 inline-block" />
                      {isRTL ? "بيانات غير متوفرة" : "No data"}
                    </span>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
