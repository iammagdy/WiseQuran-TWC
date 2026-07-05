import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Strip Bismillah prefix from ayah 1 text (surahs other than 1 & 9) */
export function stripBismillah(text: string, surahNumber: number, ayahNumber: number): string {
  if (ayahNumber !== 1 || surahNumber === 1 || surahNumber === 9) return text;
  // Strip any leading Bismillah regardless of diacritics/Unicode forms
  // Match: بسم + whitespace + الله/ٱلله + whitespace + الرحمن/ٱلرحمن + whitespace + الرحيم/ٱلرحيم
  // with optional diacritics (Unicode range \u0610-\u065F, \u06D6-\u06ED)
  const diac = "[\\u0610-\\u065F\\u06D6-\\u06ED]*";
  const pattern = new RegExp(
    `^بِ${diac}سْ${diac}مِ${diac}\\s+[ٱا]${diac}ل${diac}ل${diac}[ّ]?${diac}هِ${diac}\\s+[ٱا]${diac}ل${diac}ر${diac}[ّ]?${diac}حْ${diac}مَ${diac}[ٰ]?${diac}نِ${diac}\\s+[ٱا]${diac}ل${diac}ر${diac}[ّ]?${diac}حِ${diac}يمِ${diac}\\s*`
  );
  let result = text.replace(pattern, "");
  // Fallback: strip first 4 words if they contain بسم and الله
  if (result === text && text.includes("بسم") && text.includes("الله")) {
    result = text.replace(/^[^\s]+\s+[^\s]+\s+[^\s]+\s+[^\s]+\s*/, "");
  }
  return result;
}

/** Convert Western digits 0-9 to Arabic-Indic ٠-٩ */
export function toArabicNumerals(str: string | number): string {
  return String(str).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[parseInt(d)]);
}

/** JS getDay(): 0=Sunday … 6=Saturday → full Arabic name */
export function getArabicDayName(dayIndex: number): string {
  const names = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  return names[dayIndex] ?? "";
}

/** Short Arabic day name for compact views */
export function getArabicDayShort(dayIndex: number): string {
  const names = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
  return names[dayIndex];
}

/** Hijri date string for a given Date */
export function getHijriDate(date: Date): string {
  return new Intl.DateTimeFormat("ar-SA-u-ca-islamic", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

/** Full Gregorian date in Arabic */
export function getGregorianDateArabic(date: Date): string {
  return new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

/** Locale-aware day name */
export function getDayName(dayIndex: number, language: string): string {
  if (language === "en") {
    const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return names[dayIndex] ?? "";
  }
  return getArabicDayName(dayIndex);
}

/** Locale-aware Hijri date */
export function getHijriDateLocalized(date: Date, language: string): string {
  if (language === "en") {
    return new Intl.DateTimeFormat("en-u-ca-islamic", { day: "numeric", month: "long", year: "numeric" }).format(date);
  }
  return getHijriDate(date);
}

/** Locale-aware Gregorian date */
export function getGregorianDateLocalized(date: Date, language: string): string {
  if (language === "en") {
    return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "long", year: "numeric" }).format(date);
  }
  return getGregorianDateArabic(date);
}
