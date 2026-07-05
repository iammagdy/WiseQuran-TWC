import { useEffect, useMemo } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { azkarData } from "@/data/azkar-data";
import { adjustDateByHijriOffset } from "./useRamadan";

function getTodayKey() {
  // Honour the user's Hijri ±2 day adjustment so "today's azkar" roll
  // over at the same moment the user considers the Islamic date to
  // change. With offset=0 this is identical to the prior local-date
  // behavior.
  const d = adjustDateByHijriOffset();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface AzkarCompletionData {
  date: string;
  completed: string[]; // legacy: category IDs (unused now, kept for backward compat)
  dhikrCompleted: string[]; // new: `${categoryId}:${dhikrId}` keys
}

function dhikrKey(categoryId: string, dhikrId: string) {
  return `${categoryId}:${dhikrId}`;
}

export function useAzkarCompletion() {
  const [data, setData] = useLocalStorage<AzkarCompletionData>("wise-azkar-completion", {
    date: getTodayKey(),
    completed: [],
    dhikrCompleted: [],
  });

  const today = getTodayKey();
  const todayData: AzkarCompletionData = useMemo(() => {
    if (data.date !== today) {
      return { date: today, completed: [], dhikrCompleted: [] };
    }
    const legacyCompleted = data.completed ?? [];
    const existingDhikr = data.dhikrCompleted ?? [];
    // One-time migration: expand legacy category-level completion into per-dhikr keys
    if (existingDhikr.length === 0 && legacyCompleted.length > 0) {
      const expanded = new Set<string>();
      for (const catId of legacyCompleted) {
        const cat = azkarData.find((c) => c.id === catId);
        if (!cat) continue;
        for (const item of cat.items) expanded.add(dhikrKey(catId, item.id));
      }
      if (expanded.size > 0) {
        return { date: today, completed: [], dhikrCompleted: Array.from(expanded) };
      }
    }
    return { date: today, completed: legacyCompleted, dhikrCompleted: existingDhikr };
  }, [data.date, data.completed, data.dhikrCompleted, today]);

  // Persist migrated shape once (when computed migration differs from stored data)
  useEffect(() => {
    if (
      data.date !== todayData.date ||
      (data.dhikrCompleted ?? []).length !== todayData.dhikrCompleted.length ||
      (data.completed ?? []).length !== todayData.completed.length
    ) {
      setData(todayData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayData.date, todayData.dhikrCompleted.length, todayData.completed.length]);

  const doneSet = useMemo(() => new Set(todayData.dhikrCompleted), [todayData.dhikrCompleted]);

  const isDhikrDone = (categoryId: string, dhikrId: string) =>
    doneSet.has(dhikrKey(categoryId, dhikrId));

  const markDhikrDone = (categoryId: string, dhikrId: string) => {
    const key = dhikrKey(categoryId, dhikrId);
    if (doneSet.has(key)) return;
    setData({
      date: today,
      completed: todayData.completed,
      dhikrCompleted: [...todayData.dhikrCompleted, key],
    });
  };

  const resetDhikr = (categoryId: string, dhikrId: string) => {
    const key = dhikrKey(categoryId, dhikrId);
    if (!doneSet.has(key)) return;
    setData({
      date: today,
      completed: todayData.completed,
      dhikrCompleted: todayData.dhikrCompleted.filter((k) => k !== key),
    });
  };

  const isCategoryDone = (categoryId: string) => {
    const cat = azkarData.find((c) => c.id === categoryId);
    if (!cat || cat.items.length === 0) return false;
    return cat.items.every((item) => doneSet.has(dhikrKey(categoryId, item.id)));
  };

  const categoryProgress = (categoryId: string): { done: number; total: number } => {
    const cat = azkarData.find((c) => c.id === categoryId);
    if (!cat) return { done: 0, total: 0 };
    const done = cat.items.filter((item) => doneSet.has(dhikrKey(categoryId, item.id))).length;
    return { done, total: cat.items.length };
  };

  const completedCount = todayData.dhikrCompleted.length;

  return {
    isDhikrDone,
    markDhikrDone,
    resetDhikr,
    isCategoryDone,
    categoryProgress,
    completedCount,
    todayData,
  };
}
