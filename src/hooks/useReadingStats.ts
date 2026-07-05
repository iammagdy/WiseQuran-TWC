import { useLocalStorage } from "./useLocalStorage";
import { useCallback, useMemo } from "react";

export interface DailyLog {
  date: string; // YYYY-MM-DD
  ayahCount: number;
  timeSpentMinutes: number;
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function useReadingStats() {
  const [logs, setLogs] = useLocalStorage<DailyLog[]>("wise-reading-logs", []);

  const logReading = useCallback(
    (ayahCount: number, timeSpentMinutes: number = 0) => {
      setLogs((prev) => {
        const today = getTodayKey();
        const existing = prev.find((l) => l.date === today);
        let updated: DailyLog[];
        if (existing) {
          updated = prev.map((l) =>
            l.date === today
              ? { ...l, ayahCount: l.ayahCount + ayahCount, timeSpentMinutes: l.timeSpentMinutes + timeSpentMinutes }
              : l
          );
        } else {
          updated = [...prev, { date: today, ayahCount, timeSpentMinutes }];
        }
        // Keep last 90 days
        const cutoff = getDaysAgo(90);
        return updated.filter((l) => l.date >= cutoff);
      });
    },
    [setLogs]
  );

  const weeklyData = useMemo(() => {
    const days: { date: string; ayahCount: number; timeSpentMinutes: number; dayName: string }[] = [];
    const arabicDays = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
    for (let i = 6; i >= 0; i--) {
      const date = getDaysAgo(i);
      const log = logs.find((l) => l.date === date);
      const d = new Date(date + "T00:00:00");
      days.push({
        date,
        ayahCount: log?.ayahCount || 0,
        timeSpentMinutes: log?.timeSpentMinutes || 0,
        dayName: arabicDays[d.getDay()],
      });
    }
    return days;
  }, [logs]);

  const monthlyData = useMemo(() => {
    const days: { date: string; ayahCount: number }[] = [];
    for (let i = 27; i >= 0; i--) {
      const date = getDaysAgo(i);
      const log = logs.find((l) => l.date === date);
      days.push({ date, ayahCount: log?.ayahCount || 0 });
    }
    return days;
  }, [logs]);

  const totals = useMemo(() => {
    let totalAyahs = 0;
    let totalMinutes = 0;
    let maxStreak = 0;
    let currentStreak = 0;

    // Sort logs by date
    const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));

    for (let i = 0; i < sorted.length; i++) {
      totalAyahs += sorted[i].ayahCount;
      totalMinutes += sorted[i].timeSpentMinutes;

      if (i === 0) {
        currentStreak = 1;
      } else {
        const prev = new Date(sorted[i - 1].date + "T00:00:00");
        const curr = new Date(sorted[i].date + "T00:00:00");
        const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
        if (diff === 1) {
          currentStreak++;
        } else if (diff > 1) {
          currentStreak = 1;
        }
      }
      maxStreak = Math.max(maxStreak, currentStreak);
    }

    // Check if current streak is still active (includes today or yesterday)
    const today = getTodayKey();
    const yesterday = getDaysAgo(1);
    const lastLog = sorted[sorted.length - 1];
    const activeStreak = lastLog && (lastLog.date === today || lastLog.date === yesterday) ? currentStreak : 0;

    return { totalAyahs, totalMinutes, maxStreak, activeStreak };
  }, [logs]);

  const weeklyTotal = useMemo(() => {
    return weeklyData.reduce((sum, d) => sum + d.ayahCount, 0);
  }, [weeklyData]);

  const monthlyTotal = useMemo(() => {
    return monthlyData.reduce((sum, d) => sum + d.ayahCount, 0);
  }, [monthlyData]);

  return { logs, logReading, weeklyData, monthlyData, totals, weeklyTotal, monthlyTotal };
}
