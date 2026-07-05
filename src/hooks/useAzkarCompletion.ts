import { useLocalStorage } from "./useLocalStorage";

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

interface AzkarCompletionData {
  date: string;
  completed: string[]; // category IDs
}

export function useAzkarCompletion() {
  const [data, setData] = useLocalStorage<AzkarCompletionData>("wise-azkar-completion", {
    date: getTodayKey(),
    completed: [],
  });

  const today = getTodayKey();
  const todayData = data.date === today ? data : { date: today, completed: [] };

  const isCategoryDone = (categoryId: string) => todayData.completed.includes(categoryId);

  const markCategoryDone = (categoryId: string) => {
    if (!todayData.completed.includes(categoryId)) {
      setData({ date: today, completed: [...todayData.completed, categoryId] });
    }
  };

  const toggleCategory = (categoryId: string) => {
    if (isCategoryDone(categoryId)) {
      setData({ date: today, completed: todayData.completed.filter((c) => c !== categoryId) });
    } else {
      setData({ date: today, completed: [...todayData.completed, categoryId] });
    }
  };

  const completedCount = todayData.completed.length;

  return { isCategoryDone, markCategoryDone, toggleCategory, completedCount, todayData };
}
