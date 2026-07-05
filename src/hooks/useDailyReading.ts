import { useLocalStorage } from "./useLocalStorage";
import { useCallback } from "react";

interface DailyReadingData {
  date: string;
  count: number;
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function useDailyReading() {
  const [goal, setGoal] = useLocalStorage<number>("wise-daily-goal", 10);
  const [data, setData] = useLocalStorage<DailyReadingData>("wise-daily-reading", {
    date: getTodayKey(),
    count: 0,
  });

  const today = getTodayKey();
  const todayCount = data.date === today ? data.count : 0;

  const increment = useCallback(
    (n: number) => {
      setData((prev) => {
        const currentDate = getTodayKey();
        if (prev.date !== currentDate) {
          return { date: currentDate, count: n };
        }
        return { date: currentDate, count: prev.count + n };
      });
    },
    [setData]
  );

  return { goal, setGoal, todayCount, increment };
}
