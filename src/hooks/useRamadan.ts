import { useMemo } from "react";
import { useLocalStorage } from "./useLocalStorage";

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

/** Detect if current date is in Ramadan using Hijri calendar */
export function isRamadanNow(): boolean {
  // Allow testing override
  if (typeof window !== "undefined" && localStorage.getItem("wise-ramadan-preview") === "true") {
    return true;
  }
  try {
    const formatter = new Intl.DateTimeFormat("en-u-ca-islamic", { month: "numeric" });
    const parts = formatter.formatToParts(new Date());
    const monthPart = parts.find((p) => p.type === "month");
    return monthPart?.value === "9";
  } catch {
    return false;
  }
}

/** Check if Ramadan tab should be visible (Ramadan active + not manually hidden) */
export function isRamadanTabVisible(): boolean {
  if (!isRamadanNow()) return false;
  return localStorage.getItem("wise-ramadan-hidden") !== "true";
}

/** Hide the Ramadan tab manually */
export function hideRamadanTab() {
  localStorage.setItem("wise-ramadan-hidden", "true");
}

/** Show the Ramadan tab again */
export function showRamadanTab() {
  localStorage.removeItem("wise-ramadan-hidden");
}

/** Get current Ramadan day (1-30) */
export function getRamadanDay(): number {
  try {
    const formatter = new Intl.DateTimeFormat("en-u-ca-islamic", { day: "numeric", month: "numeric" });
    const parts = formatter.formatToParts(new Date());
    const monthPart = parts.find((p) => p.type === "month");
    const dayPart = parts.find((p) => p.type === "day");
    if (monthPart?.value === "9" && dayPart) {
      return parseInt(dayPart.value, 10);
    }
  } catch (error) {
    console.error("Error calculating Ramadan day from Hijri calendar:", error);
  }
  // Fallback for preview mode
  if (localStorage.getItem("wise-ramadan-preview") === "true") {
    const saved = localStorage.getItem("wise-ramadan-day");
    return saved ? parseInt(saved, 10) : 1;
  }
  return 1;
}

interface KhatmahState {
  completedJuz: number[]; // juz numbers 1-30
  year: number;
}

interface ChecklistState {
  checked: string[]; // item IDs
  date: string; // YYYY-MM-DD, auto-reset on new day
}

interface RamadanState {
  khatmah: KhatmahState;
  checklist: ChecklistState;
}

const DEFAULT_STATE: RamadanState = {
  khatmah: { completedJuz: [], year: new Date().getFullYear() },
  checklist: { checked: [], date: "" },
};

export function useRamadan() {
  const [state, setState] = useLocalStorage<RamadanState>("wise-ramadan", DEFAULT_STATE);
  const today = getToday();
  const currentYear = new Date().getFullYear();

  // Reset khatmah if new year
  const khatmah = state.khatmah.year === currentYear ? state.khatmah : { completedJuz: [], year: currentYear };

  // Reset checklist if new day
  const checklist = state.checklist.date === today ? state.checklist : { checked: [], date: today };

  const toggleJuz = (juzNumber: number) => {
    setState((prev) => {
      const current = prev.khatmah.year === currentYear ? prev.khatmah.completedJuz : [];
      const updated = current.includes(juzNumber)
        ? current.filter((j) => j !== juzNumber)
        : [...current, juzNumber];
      return { ...prev, khatmah: { completedJuz: updated, year: currentYear } };
    });
  };

  const toggleChecklistItem = (itemId: string) => {
    setState((prev) => {
      const current = prev.checklist.date === today ? prev.checklist.checked : [];
      const updated = current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [...current, itemId];
      return { ...prev, checklist: { checked: updated, date: today } };
    });
  };

  const isJuzCompleted = (juzNumber: number) => khatmah.completedJuz.includes(juzNumber);
  const isChecklistDone = (itemId: string) => checklist.checked.includes(itemId);

  const khatmahProgress = useMemo(() => khatmah.completedJuz.length, [khatmah.completedJuz]);

  const ramadanDay = getRamadanDay();
  const todayJuz = Math.min(ramadanDay, 30);

  return {
    toggleJuz,
    toggleChecklistItem,
    isJuzCompleted,
    isChecklistDone,
    khatmahProgress,
    todayJuz,
    ramadanDay,
    checklistProgress: checklist.checked.length,
  };
}
