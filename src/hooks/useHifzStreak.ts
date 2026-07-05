import { useLocalStorage } from "./useLocalStorage";

interface HifzStreakState {
  currentStreak: number;
  lastActiveDate: string;
  longestStreak: number;
}

interface HifzGoalState {
  surahsPerDay: number;
  ayahsPerDay: number;
  reviewedTodaySurahs: number;
  lastGoalDate: string;
}

const DEFAULT_STREAK: HifzStreakState = {
  currentStreak: 0,
  lastActiveDate: "",
  longestStreak: 0,
};

const DEFAULT_GOAL: HifzGoalState = {
  surahsPerDay: 3,
  ayahsPerDay: 0,
  reviewedTodaySurahs: 0,
  lastGoalDate: "",
};

/**
 * Today's date in the user's local timezone as yyyy-mm-dd. Avoids
 * `toISOString()`, which returns UTC and rolled the date forward for
 * users in positive-UTC timezones after roughly 22:00 local time.
 */
export function getToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Calendar-day difference between two yyyy-mm-dd date strings. Uses
 * `Date.UTC` arithmetic so a 23- or 25-hour DST transition day still
 * counts as one calendar day — the previous implementation floored a
 * millisecond delta and reset streaks twice a year for much of the
 * northern hemisphere.
 */
export function daysBetween(d1: string, d2: string): number {
  if (!d1) return 999;
  const parse = (s: string): number | null => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return null;
    return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  };
  const ms1 = parse(d1);
  const ms2 = parse(d2);
  if (ms1 === null || ms2 === null) return 999;
  return Math.round((ms2 - ms1) / 86_400_000);
}

export function useHifzStreak() {
  const [streak, setStreak] = useLocalStorage<HifzStreakState>("wise-hifz-streak", DEFAULT_STREAK);

  const markActive = () => {
    const today = getToday();
    if (streak.lastActiveDate === today) return;

    const diff = daysBetween(streak.lastActiveDate, today);
    const newStreak = diff === 1 ? streak.currentStreak + 1 : 1;
    const longest = Math.max(streak.longestStreak, newStreak);

    setStreak({
      currentStreak: newStreak,
      lastActiveDate: today,
      longestStreak: longest,
    });
  };

  return {
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    lastActiveDate: streak.lastActiveDate,
    markActive,
  };
}

export function useHifzGoal() {
  const [goal, setGoal] = useLocalStorage<HifzGoalState>("wise-hifz-goal", DEFAULT_GOAL);

  const today = getToday();
  const reviewedToday = goal.lastGoalDate === today ? goal.reviewedTodaySurahs : 0;

  const setSurahsPerDay = (n: number) => {
    setGoal((prev) => ({ ...prev, surahsPerDay: n }));
  };

  const markSurahReviewed = () => {
    const currentReviewed = goal.lastGoalDate === today ? goal.reviewedTodaySurahs : 0;
    setGoal((prev) => ({
      ...prev,
      reviewedTodaySurahs: currentReviewed + 1,
      lastGoalDate: today,
    }));
  };

  const goalProgress =
    goal.surahsPerDay > 0
      ? Math.min(100, Math.round((reviewedToday / goal.surahsPerDay) * 100))
      : 0;

  const isGoalDone = reviewedToday >= goal.surahsPerDay && goal.surahsPerDay > 0;

  return {
    surahsPerDay: goal.surahsPerDay,
    reviewedToday,
    goalProgress,
    isGoalDone,
    setSurahsPerDay,
    markSurahReviewed,
  };
}
