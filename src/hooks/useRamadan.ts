import { useMemo } from "react";
import { useLocalStorage } from "./useLocalStorage";

const HIJRI_OFFSET_ANON_KEY = "wise-hijri-offset";
const HIJRI_OFFSET_USER_PREFIX = "wise-hijri-offset:";

// Tracks the currently signed-in user so the helpers below can read
// the per-user offset without having to be inside a React context.
// AuthContext calls `setActiveHijriUser` on sign-in/sign-out.
let activeUserId: string | null = null;

export function setActiveHijriUser(userId: string | null): void {
  activeUserId = userId;
}

function offsetKeyForActiveUser(): string {
  return activeUserId
    ? `${HIJRI_OFFSET_USER_PREFIX}${activeUserId}`
    : HIJRI_OFFSET_ANON_KEY;
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Read the Hijri calendar offset (−2…+2 days) for the active user.
 * Regions that follow a different moonsighting can nudge the default
 * Islamic calendar so Ramadan and Azkar date detection match locally.
 * When signed in, the value is stored per-user so each account keeps
 * its own preference across devices; signed-out sessions fall back to
 * an anonymous key.
 */
export function getHijriOffsetDays(): number {
  try {
    // Prefer the user-scoped key; fall back to the anonymous key if
    // the user just signed in and hasn't set their preference yet.
    const primary = localStorage.getItem(offsetKeyForActiveUser());
    const raw = primary ?? (activeUserId ? localStorage.getItem(HIJRI_OFFSET_ANON_KEY) : null);
    if (!raw) return 0;
    const n = Number(raw);
    if (!Number.isFinite(n)) return 0;
    return Math.max(-2, Math.min(2, Math.round(n)));
  } catch {
    return 0;
  }
}

export function setHijriOffsetDays(days: number): void {
  const clamped = Math.max(-2, Math.min(2, Math.round(days)));
  try {
    localStorage.setItem(offsetKeyForActiveUser(), String(clamped));
  } catch {
    /* ignore quota/unavailable */
  }
}

/**
 * Adjust any Gregorian date by the active user's Hijri offset. Exposed
 * so consumers like useAzkarCompletion can produce a local date-key
 * that honors the same ±2-day shift as Ramadan detection.
 */
export function adjustDateByHijriOffset(date: Date = new Date()): Date {
  const offset = getHijriOffsetDays();
  if (offset === 0) return date;
  const d = new Date(date);
  d.setDate(d.getDate() + offset);
  return d;
}

/** Returns the adjusted date that should be used as "today" for Hijri lookups. */
function adjustedNow(): Date {
  const offset = getHijriOffsetDays();
  if (offset === 0) return new Date();
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d;
}

/** Returns the current Hijri year as a number (e.g. 1446). */
export function getHijriYear(): number {
  try {
    const fmt = new Intl.DateTimeFormat("en-u-ca-islamic", { year: "numeric" });
    const str = fmt.format(adjustedNow());
    const match = str.match(/\d+/);
    return match ? Number(match[0]) : new Date().getFullYear();
  } catch {
    return new Date().getFullYear();
  }
}

/** Detect if current date is in Ramadan using Hijri calendar */
export function isRamadanNow(): boolean {
  // Allow testing override
  if (typeof window !== "undefined" && localStorage.getItem("wise-ramadan-preview") === "true") {
    return true;
  }
  try {
    const formatter = new Intl.DateTimeFormat("en-u-ca-islamic", { month: "numeric" });
    const parts = formatter.formatToParts(adjustedNow());
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
    const parts = formatter.formatToParts(adjustedNow());
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
  // Key khatmah/checklist reset by the Hijri year so travel and the
  // rolling Gregorian year don't wipe progress mid-Ramadan.
  const currentYear = getHijriYear();

  // Reset khatmah if new Hijri year
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
