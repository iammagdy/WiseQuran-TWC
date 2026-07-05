import { useLocalStorage } from "./useLocalStorage";
import { juzData } from "@/data/juz-hizb-data";
import { SURAH_META } from "@/data/surah-meta";

export type WirdPlan = 30 | 60 | 90 | 180;

interface WirdState {
  plan: WirdPlan;
  startDate: string; // YYYY-MM-DD
  completedDays: string[]; // array of YYYY-MM-DD
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string) {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export function useDailyWird() {
  const [state, setState] = useLocalStorage<WirdState | null>("wise-daily-wird", null);

  const startPlan = (plan: WirdPlan) => {
    setState({ plan, startDate: getTodayKey(), completedDays: [] });
  };

  const resetPlan = () => setState(null);

  const markTodayDone = () => {
    if (!state) return;
    const today = getTodayKey();
    if (!state.completedDays.includes(today)) {
      setState({ ...state, completedDays: [...state.completedDays, today] });
    }
  };

  const getTodayPortion = () => {
    if (!state) return null;
    const today = getTodayKey();
    const dayIndex = daysBetween(state.startDate, today) % state.plan;
    
    // Total ayahs in Quran = 6236
    const totalAyahs = 6236;
    const portionSize = Math.ceil(totalAyahs / state.plan);
    const startAyahGlobal = dayIndex * portionSize + 1;
    const endAyahGlobal = Math.min((dayIndex + 1) * portionSize, totalAyahs);

    // Convert global ayah index to surah/ayah
    let count = 0;
    let startSurah = 1, startAyah = 1, endSurah = 1, endAyah = 1;
    let foundStart = false;

    for (const s of SURAH_META) {
      for (let a = 1; a <= s.numberOfAyahs; a++) {
        count++;
        if (count === startAyahGlobal) {
          startSurah = s.number;
          startAyah = a;
          foundStart = true;
        }
        if (count === endAyahGlobal) {
          endSurah = s.number;
          endAyah = a;
          return {
            dayIndex: dayIndex + 1,
            totalDays: state.plan,
            startSurah,
            startAyah,
            endSurah,
            endAyah,
            startSurahName: SURAH_META.find((ss) => ss.number === startSurah)?.name || "",
            startSurahNameEn: SURAH_META.find((ss) => ss.number === startSurah)?.englishName || "",
            endSurahName: SURAH_META.find((ss) => ss.number === endSurah)?.name || "",
            endSurahNameEn: SURAH_META.find((ss) => ss.number === endSurah)?.englishName || "",
            isDone: state.completedDays.includes(today),
          };
        }
      }
    }
    return null;
  };

  const progress = state
    ? Math.round((state.completedDays.length / state.plan) * 100)
    : 0;

  return { state, startPlan, resetPlan, markTodayDone, getTodayPortion, progress };
}
