import { toArabicNumerals } from "@/lib/utils";

/**
 * Prayer time calculator with support for any coordinates
 * Supports multiple calculation methods
 */

// Default coordinates (Cairo)
const DEFAULT_LAT = 30.0444;
const DEFAULT_LNG = 31.2357;
const DEFAULT_TZ = 2;

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

// Calculation methods with their Fajr and Isha angles
export const CALCULATION_METHODS = {
  egyptian: { name: "الهيئة المصرية", fajrAngle: 19.5, ishaAngle: 17.5 },
  mwl: { name: "رابطة العالم الإسلامي", fajrAngle: 18, ishaAngle: 17 },
  isna: { name: "أمريكا الشمالية", fajrAngle: 15, ishaAngle: 15 },
  umm_al_qura: { name: "أم القرى", fajrAngle: 18.5, ishaAngle: 0, ishaMinutes: 90 },
  karachi: { name: "جامعة كراتشي", fajrAngle: 18, ishaAngle: 18 },
  tehran: { name: "طهران", fajrAngle: 17.7, ishaAngle: 14 },
} as const;

export type CalculationMethod = keyof typeof CALCULATION_METHODS;

function julianDate(year: number, month: number, day: number): number {
  if (month <= 2) { year--; month += 12; }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
}

function sunPosition(jd: number) {
  const D = jd - 2451545.0;
  const g = (357.529 + 0.98560028 * D) % 360;
  const q = (280.459 + 0.98564736 * D) % 360;
  const L = (q + 1.915 * Math.sin(g * DEG) + 0.020 * Math.sin(2 * g * DEG)) % 360;
  const e = 23.439 - 0.00000036 * D;
  const RA = Math.atan2(Math.cos(e * DEG) * Math.sin(L * DEG), Math.cos(L * DEG)) * RAD;
  const decl = Math.asin(Math.sin(e * DEG) * Math.sin(L * DEG)) * RAD;
  let EqT = (q - RA) % 360;
  if (EqT > 180) EqT -= 360;
  if (EqT < -180) EqT += 360;
  return { decl, EqT: EqT * 4 };
}

function hourAngle(lat: number, decl: number, angle: number): number {
  const cosHA = (Math.sin(angle * DEG) - Math.sin(lat * DEG) * Math.sin(decl * DEG)) /
    (Math.cos(lat * DEG) * Math.cos(decl * DEG));
  if (cosHA > 1 || cosHA < -1) return 0;
  return Math.acos(cosHA) * RAD;
}

function asrHourAngle(lat: number, decl: number, shadowFactor: number = 1): number {
  const a = Math.atan(1 / (shadowFactor + Math.tan(Math.abs(lat - decl) * DEG)));
  return Math.acos(
    (Math.sin(a) - Math.sin(lat * DEG) * Math.sin(decl * DEG)) /
    (Math.cos(lat * DEG) * Math.cos(decl * DEG))
  ) * RAD;
}

function toTimeString(hours: number): string {
  hours = ((hours % 24) + 24) % 24;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function toArabicTime(time24: string): string {
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr);
  const period = h >= 12 ? "م" : "ص";
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return toArabicNumerals(`${h}:${mStr} ${period}`);
}

// Get timezone offset for a location (simplified)
function getTimezoneOffset(_lng: number): number {
  // Use browser's actual timezone offset instead of guessing from longitude
  return -(new Date().getTimezoneOffset() / 60);
}

export interface PrayerTimes {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

export interface NextPrayerInfo {
  id: string;
  name: string;
  minutesLeft: number;
  secondsLeft: number;
}

export interface CalculationOptions {
  latitude?: number;
  longitude?: number;
  timezone?: number;
  method?: CalculationMethod;
  asrJuristic?: "shafii" | "hanafi"; // Shafii: shadow = 1x, Hanafi: shadow = 2x
}

/**
 * Calculate prayer times for a given date and location
 */
export function calculatePrayerTimes(date: Date, options: CalculationOptions = {}): PrayerTimes {
  const lat = options.latitude ?? DEFAULT_LAT;
  const lng = options.longitude ?? DEFAULT_LNG;
  const tz = options.timezone ?? getTimezoneOffset(lng);
  const method = options.method ?? "egyptian";
  const asrFactor = options.asrJuristic === "hanafi" ? 2 : 1;
  
  const methodConfig = CALCULATION_METHODS[method];
  
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const jd = julianDate(year, month, day);
  const { decl, EqT } = sunPosition(jd);

  const transit = 12 + (lng * -1) / 15 - EqT / 60 + tz;

  const fajrHA = hourAngle(lat, decl, -methodConfig.fajrAngle);
  const sunriseHA = hourAngle(lat, decl, -0.833);
  const asrHA = asrHourAngle(lat, decl, asrFactor);
  const sunsetHA = hourAngle(lat, decl, -0.833);
  
  let ishaTime: number;
  if ("ishaMinutes" in methodConfig && methodConfig.ishaMinutes) {
    // Umm Al-Qura: Isha is fixed minutes after Maghrib
    ishaTime = transit + sunsetHA / 15 + methodConfig.ishaMinutes / 60;
  } else {
    const ishaHA = hourAngle(lat, decl, -methodConfig.ishaAngle);
    ishaTime = transit + ishaHA / 15;
  }

  return {
    fajr: toTimeString(transit - fajrHA / 15),
    sunrise: toTimeString(transit - sunriseHA / 15),
    dhuhr: toTimeString(transit + 2 / 60),
    asr: toTimeString(transit + asrHA / 15),
    maghrib: toTimeString(transit + sunsetHA / 15),
    isha: toTimeString(ishaTime),
  };
}

/** Format a 24h time string to Arabic 12h format */
export function formatArabicTime(time24: string): string {
  return toArabicTime(time24);
}

/** Format a 24h time string to a localized 12h format based on language */
export function formatLocalizedTime(time24: string, language: string): string {
  if (language === "en") {
    const [hStr, mStr] = time24.split(":");
    let h = parseInt(hStr);
    const period = h >= 12 ? "PM" : "AM";
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${h}:${mStr} ${period}`;
  }
  return toArabicTime(time24);
}

/** Get seconds remaining until a specific prayer time. Negative if passed. */
export function getSecondsUntilPrayer(prayerTime: string, now: Date, timezone?: string): number {
  const localNow = timezone 
    ? new Date(now.toLocaleString("en-US", { timeZone: timezone }))
    : now;
  
  const nowSeconds = localNow.getHours() * 3600 + localNow.getMinutes() * 60 + localNow.getSeconds();
  const [h, m] = prayerTime.split(":").map(Number);
  const prayerSeconds = h * 3600 + m * 60;
  return prayerSeconds - nowSeconds;
}

const PRAYER_ORDER = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"] as const;
const PRAYER_NAMES: Record<string, string> = {
  fajr: "الفجر",
  sunrise: "الشروق",
  dhuhr: "الظهر",
  asr: "العصر",
  maghrib: "المغرب",
  isha: "العشاء",
};

/** Get the next upcoming prayer and seconds remaining */
export function getNextPrayer(times: PrayerTimes, now: Date, timezone?: string): NextPrayerInfo | null {
  const localNow = timezone
    ? new Date(now.toLocaleString("en-US", { timeZone: timezone }))
    : now;

  const nowSeconds = localNow.getHours() * 3600 + localNow.getMinutes() * 60 + localNow.getSeconds();

  for (const id of PRAYER_ORDER) {
    if (id === "sunrise") continue; // Skip sunrise for "next prayer"
    const [h, m] = times[id].split(":").map(Number);
    const prayerSeconds = h * 3600 + m * 60;
    if (prayerSeconds > nowSeconds) {
      const secondsLeft = prayerSeconds - nowSeconds;
      return { id, name: PRAYER_NAMES[id], minutesLeft: Math.ceil(secondsLeft / 60), secondsLeft };
    }
  }
  
  // All prayers passed — next is tomorrow's Fajr
  const [fH, fM] = times.fajr.split(":").map(Number);
  const fajrSeconds = fH * 3600 + fM * 60;
  const secondsLeft = (24 * 3600 - nowSeconds) + fajrSeconds;
  return { id: "fajr", name: PRAYER_NAMES.fajr, minutesLeft: Math.ceil(secondsLeft / 60), secondsLeft };
}

/** Get method name in Arabic */
export function getMethodName(method: CalculationMethod): string {
  return CALCULATION_METHODS[method].name;
}
