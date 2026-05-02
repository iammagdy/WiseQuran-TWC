import { useLocalStorage } from "./useLocalStorage";
import { SURAH_META } from "@/data/surah-meta";
import { useDeviceId } from "./useDeviceId";
import { enqueuedSupabaseWrite } from "@/lib/syncQueue";
import { isSupabaseConfigured } from "@/lib/supabase";

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
  const deviceId = useDeviceId();

  const syncWird = (wirdState: WirdState) => {
    if (!isSupabaseConfigured) return;
    enqueuedSupabaseWrite(
      "device_daily_wird",
      "upsert",
      {
        device_id: deviceId,
        plan: wirdState.plan,
        start_date: wirdState.startDate,
        completed_days: wirdState.completedDays,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "device_id" }
    );
  };

  const startPlan = (plan: WirdPlan) => {
    const newState: WirdState = { plan, startDate: getTodayKey(), completedDays: [] };
    setState(newState);
    syncWird(newState);
  };

  const resetPlan = () => setState(null);

  const markTodayDone = () => {
    if (!state) return;
    const today = getTodayKey();
    if (state.completedDays.includes(today)) return;
    const newState: WirdState = { ...state, completedDays: [...state.completedDays, today] };
    setState(newState);
    syncWird(newState);
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
            // ⚡ Bolt: O(1) direct indexing for performance
            startSurahName: SURAH_META[startSurah - 1]?.name || "",
            startSurahNameEn: SURAH_META[startSurah - 1]?.englishName || "",
            endSurahName: SURAH_META[endSurah - 1]?.name || "",
            endSurahNameEn: SURAH_META[endSurah - 1]?.englishName || "",
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
