import { useLocalStorage } from "./useLocalStorage";
import { SURAH_META } from "@/data/surah-meta";
import { useDeviceId } from "./useDeviceId";
import { enqueuedSupabaseWrite } from "@/lib/syncQueue";
import { isSupabaseConfigured } from "@/lib/supabase";

export type HifzStatus = "none" | "reading" | "memorized";

export interface HifzState {
  [surahNumber: number]: HifzStatus;
}

const TOTAL_AYAHS = SURAH_META.reduce((sum, s) => sum + s.numberOfAyahs, 0);

export function useHifz() {
  const [state, setState] = useLocalStorage<HifzState>("wise-hifz", {});
  const deviceId = useDeviceId();

  const getStatus = (surahNumber: number): HifzStatus => state[surahNumber] || "none";

  const syncStatus = (surahNumber: number, status: HifzStatus) => {
    if (!isSupabaseConfigured) return;
    enqueuedSupabaseWrite(
      "device_hifz",
      "upsert",
      { device_id: deviceId, surah_number: surahNumber, status, updated_at: new Date().toISOString() },
      { onConflict: "device_id,surah_number" }
    );
  };

  const cycleStatus = (surahNumber: number) => {
    const current = getStatus(surahNumber);
    const next: HifzStatus = current === "none" ? "reading" : current === "reading" ? "memorized" : "none";
    setState({ ...state, [surahNumber]: next });
    syncStatus(surahNumber, next);
  };

  const setStatus = (surahNumber: number, status: HifzStatus) => {
    setState({ ...state, [surahNumber]: status });
    syncStatus(surahNumber, status);
  };

  const stats = {
    memorized: SURAH_META.filter((s) => getStatus(s.number) === "memorized").length,
    inProgress: SURAH_META.filter((s) => getStatus(s.number) === "reading").length,
    notStarted: SURAH_META.filter((s) => getStatus(s.number) === "none").length,
    memorizedAyahs: SURAH_META.filter((s) => getStatus(s.number) === "memorized").reduce((sum, s) => sum + s.numberOfAyahs, 0),
    totalAyahs: TOTAL_AYAHS,
    percentage: Math.round(
      (SURAH_META.filter((s) => getStatus(s.number) === "memorized").reduce((sum, s) => sum + s.numberOfAyahs, 0) / TOTAL_AYAHS) * 100
    ),
  };

  return { state, getStatus, cycleStatus, setStatus, stats };
}
