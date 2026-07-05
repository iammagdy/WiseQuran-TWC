export interface PerPrayerConfig {
  adhanEnabled: boolean;
  reminderEnabled: boolean;
}

export interface AdhanSettings {
  adhanEnabled: boolean;
  voiceId: string;
  adhanVolume: number;
  reminderVolume: number;
  fajrSpecialAdhan: boolean;
  takbirOnlyMode: boolean;
  preReminderMinutes: number;
  postReminderMinutes: number;
  postReminderContent: "simple" | "dhikr" | "quran";
  reminderSoundId: string;
  perPrayer: Record<string, PerPrayerConfig>;
}

export const DEFAULT_ADHAN_SETTINGS: AdhanSettings = {
  adhanEnabled: false,
  voiceId: "makkah",
  adhanVolume: 80,
  reminderVolume: 60,
  fajrSpecialAdhan: true,
  takbirOnlyMode: false,
  preReminderMinutes: 15,
  postReminderMinutes: 0,
  postReminderContent: "simple",
  reminderSoundId: "chime",
  perPrayer: {
    fajr: { adhanEnabled: true, reminderEnabled: true },
    dhuhr: { adhanEnabled: true, reminderEnabled: true },
    asr: { adhanEnabled: true, reminderEnabled: true },
    maghrib: { adhanEnabled: true, reminderEnabled: true },
    isha: { adhanEnabled: true, reminderEnabled: true },
  },
};

export interface AdhanVoice {
  id: string;
  nameAr: string;
  nameEn: string;
  file: string;
  fajrFile: string;
}

export const ADHAN_VOICES: AdhanVoice[] = [
  {
    id: "makkah",
    nameAr: "المسجد الحرام — مكة المكرمة",
    nameEn: "Makkah Grand Mosque",
    file: "/audio/adhan/makkah.mp3",
    fajrFile: "/audio/adhan/makkah_fajr.mp3",
  },
  {
    id: "madinah",
    nameAr: "المسجد النبوي — المدينة المنورة",
    nameEn: "Madinah Grand Mosque",
    file: "/audio/adhan/madinah.mp3",
    fajrFile: "/audio/adhan/madinah.mp3",
  },
  {
    id: "madinah2",
    nameAr: "المسجد النبوي — رواية أخرى",
    nameEn: "Madinah (alternate)",
    file: "/audio/adhan/medina2.mp3",
    fajrFile: "/audio/adhan/medina2.mp3",
  },
  {
    id: "mishary",
    nameAr: "مشاري راشد العفاسي",
    nameEn: "Mishary Rashid Al-Afasy",
    file: "/audio/adhan/afasy.mp3",
    fajrFile: "/audio/adhan/afasy_fajr.mp3",
  },
  {
    id: "sudais",
    nameAr: "عبد الرحمن السديس",
    nameEn: "Abdul Rahman Al-Sudais",
    file: "/audio/adhan/sudais.mp3",
    fajrFile: "/audio/adhan/sudais.mp3",
  },
  {
    id: "egypt",
    nameAr: "الإذاعة المصرية",
    nameEn: "Egyptian Radio",
    file: "/audio/adhan/egypt.mp3",
    fajrFile: "/audio/adhan/egypt.mp3",
  },
  {
    id: "nablusi",
    nameAr: "الأذان النابلسي",
    nameEn: "Nablusi Style",
    file: "/audio/adhan/nablusi.mp3",
    fajrFile: "/audio/adhan/nablusi.mp3",
  },
  {
    id: "husary_adhan",
    nameAr: "محمود خليل الحصري",
    nameEn: "Mahmoud Khalil Al-Husary",
    file: "/audio/adhan/husary.mp3",
    fajrFile: "/audio/adhan/husary.mp3",
  },
];

export interface ReminderSound {
  id: string;
  nameAr: string;
  nameEn: string;
  file: string;
}

export const REMINDER_SOUNDS: ReminderSound[] = [
  {
    id: "chime",
    nameAr: "أذان — مكة المكرمة",
    nameEn: "Adhan — Makkah",
    file: "/audio/adhan/makkah.mp3",
  },
  {
    id: "adhan_madinah",
    nameAr: "أذان — المدينة المنورة",
    nameEn: "Adhan — Madinah",
    file: "/audio/adhan/madinah.mp3",
  },
  {
    id: "adhan_afasy",
    nameAr: "أذان — مشاري العفاسي",
    nameEn: "Adhan — Al-Afasy",
    file: "/audio/adhan/afasy.mp3",
  },
  {
    id: "silent",
    nameAr: "بدون صوت (إشعار فقط)",
    nameEn: "Silent (notification only)",
    file: "",
  },
];

export const TAKBIR_URL = "/audio/adhan/makkah.mp3";
export const CHIME_URL = "/audio/adhan/makkah.mp3";

export const ADHAN_STORAGE_KEY = "wise-adhan-settings";

export const IOS_SAFE_AZAN_URLS = [
  "https://www.islamcan.com/audio/adhan/azan1.mp3",
  "https://archive.org/download/AzanMp3/Azan-makkah.mp3",
  "https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3",
];

export function buildAzanSourceList(localSources: string[], preferHttpsOnIOS: boolean) {
  const cleanedLocalSources = localSources.filter(Boolean);
  const ordered = preferHttpsOnIOS
    ? [...IOS_SAFE_AZAN_URLS, ...cleanedLocalSources]
    : [...cleanedLocalSources, ...IOS_SAFE_AZAN_URLS];

  return Array.from(new Set(ordered));
}
