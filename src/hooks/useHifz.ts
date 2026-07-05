import { useLocalStorage } from "./useLocalStorage";
import { SURAH_META } from "@/data/surah-meta";

export type HifzStatus = "none" | "reading" | "memorized";

export interface HifzState {
  [surahNumber: number]: HifzStatus;
}

const TOTAL_AYAHS = SURAH_META.reduce((sum, s) => sum + s.numberOfAyahs, 0);

export function useHifz() {
  const [state, setState] = useLocalStorage<HifzState>("wise-hifz", {});

  const getStatus = (surahNumber: number): HifzStatus => state[surahNumber] || "none";

  const cycleStatus = (surahNumber: number) => {
    const current = getStatus(surahNumber);
    const next: HifzStatus = current === "none" ? "reading" : current === "reading" ? "memorized" : "none";
    setState({ ...state, [surahNumber]: next });
  };

  const setStatus = (surahNumber: number, status: HifzStatus) => {
    setState({ ...state, [surahNumber]: status });
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
