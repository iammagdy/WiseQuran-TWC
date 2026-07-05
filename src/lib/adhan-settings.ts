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

const CDN = "https://cdn.islamic.network/prayer-times/audio";

export const ADHAN_VOICES: AdhanVoice[] = [
  {
    id: "makkah",
    nameAr: "المسجد الحرام",
    nameEn: "Makkah Grand Mosque",
    file: `${CDN}/MAKKAH_QURAN.mp3`,
    fajrFile: `${CDN}/MAKKAH_FAJR.mp3`,
  },
  {
    id: "madinah",
    nameAr: "المسجد النبوي",
    nameEn: "Madinah Grand Mosque",
    file: `${CDN}/MADINAH.mp3`,
    fajrFile: `${CDN}/MADINAH.mp3`,
  },
  {
    id: "mishary",
    nameAr: "مشاري راشد العفاسي",
    nameEn: "Mishary Rashid Al-Afasy",
    file: `${CDN}/AFASY.mp3`,
    fajrFile: `${CDN}/AFASY_FAJR.mp3`,
  },
  {
    id: "abdulbasit",
    nameAr: "عبد الباسط عبد الصمد",
    nameEn: "Abdul Basit Abdus-Samad",
    file: `${CDN}/ABU_BAKR_SHATRI.mp3`,
    fajrFile: `${CDN}/ABU_BAKR_SHATRI.mp3`,
  },
  {
    id: "minshawi",
    nameAr: "محمد صديق المنشاوي",
    nameEn: "Mohamed Siddiq Al-Minshawi",
    file: `${CDN}/EGYPT.mp3`,
    fajrFile: `${CDN}/EGYPT_FAJR.mp3`,
  },
];

export const TAKBIR_URL = `${CDN}/MAKKAH_QURAN.mp3`;
export const CHIME_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

export const ADHAN_STORAGE_KEY = "wise-adhan-settings";
