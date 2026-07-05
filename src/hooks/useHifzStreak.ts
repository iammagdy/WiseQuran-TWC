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

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function daysBetween(d1: string, d2: string): number {
  if (!d1) return 999;
  return Math.floor((new Date(d2).getTime() - new Date(d1).getTime()) / (1000 * 60 * 60 * 24));
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
