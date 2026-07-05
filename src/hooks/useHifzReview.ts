import { useLocalStorage } from "./useLocalStorage";
import { SURAH_META } from "@/data/surah-meta";

export interface HifzReviewItem {
  surahNumber: number;
  lastReviewed: string; // YYYY-MM-DD
  nextReview: string;   // YYYY-MM-DD
  interval: number;     // days
  level: number;        // 0-6 (review strength)
  totalReviews: number;
}

export interface HifzReviewState {
  items: Record<number, HifzReviewItem>;
  reviewedToday: number[]; // surah numbers reviewed today
  lastReviewDate: string;  // YYYY-MM-DD
}

const DEFAULT_STATE: HifzReviewState = {
  items: {},
  reviewedToday: [],
  lastReviewDate: "",
};

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function daysBetween(dateStr1: string, dateStr2: string): number {
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

const INTERVALS = [1, 2, 4, 8, 16, 32, 64];

export function useHifzReview() {
  const [state, setState] = useLocalStorage<HifzReviewState>("wise-hifz-review", DEFAULT_STATE);

  // Reset reviewedToday if it's a new day
  const today = getToday();
  const reviewedToday = state.lastReviewDate === today ? state.reviewedToday : [];

  const addToReview = (surahNumber: number) => {
    if (state.items[surahNumber]) return;
    setState((prev) => ({
      ...prev,
      items: {
        ...prev.items,
        [surahNumber]: {
          surahNumber,
          lastReviewed: today,
          nextReview: today, // due immediately for first review
          interval: 1,
          level: 0,
          totalReviews: 0,
        },
      },
    }));
  };

  const removeFromReview = (surahNumber: number) => {
    setState((prev) => {
      const { [surahNumber]: _, ...rest } = prev.items;
      return { ...prev, items: rest };
    });
  };

  const getTodayQueue = (): (HifzReviewItem & { surahName: string; overdueDays: number })[] => {
    return Object.values(state.items)
      .filter((item) => item.nextReview <= today && !reviewedToday.includes(item.surahNumber))
      .map((item) => {
        // ⚡ Bolt: O(1) direct indexing
        const meta = SURAH_META[item.surahNumber - 1];
        return {
          ...item,
          surahName: meta?.name || "",
          overdueDays: daysBetween(item.nextReview, today),
        };
      })
      .sort((a, b) => a.nextReview.localeCompare(b.nextReview)); // oldest first
  };

  const markReviewed = (surahNumber: number, quality: "good" | "hard") => {
    setState((prev) => {
      const item = prev.items[surahNumber];
      if (!item) return prev;

      let newLevel: number;
      let newInterval: number;

      if (quality === "good") {
        newLevel = Math.min(item.level + 1, 6);
        newInterval = INTERVALS[newLevel] || 64;
      } else {
        // hard: reset to level 0
        newLevel = 0;
        newInterval = 1;
      }

      const currentReviewedToday = prev.lastReviewDate === today ? prev.reviewedToday : [];

      return {
        ...prev,
        items: {
          ...prev.items,
          [surahNumber]: {
            ...item,
            lastReviewed: today,
            nextReview: addDays(today, newInterval),
            interval: newInterval,
            level: newLevel,
            totalReviews: item.totalReviews + 1,
          },
        },
        reviewedToday: [...currentReviewedToday, surahNumber],
        lastReviewDate: today,
      };
    });
  };

  const isInReview = (surahNumber: number): boolean => !!state.items[surahNumber];

  const getReviewItem = (surahNumber: number) => state.items[surahNumber] || null;

  const stats = {
    totalInReview: Object.keys(state.items).length,
    dueToday: getTodayQueue().length,
    reviewedToday: reviewedToday.length,
    totalReviewsDone: Object.values(state.items).reduce((sum, i) => sum + i.totalReviews, 0),
  };

  return {
    addToReview,
    removeFromReview,
    getTodayQueue,
    markReviewed,
    isInReview,
    getReviewItem,
    stats,
    state,
  };
}
