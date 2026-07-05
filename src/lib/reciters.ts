export interface Reciter {
  id: string;
  name: string;
  nameEn: string;
  folder: string;
  /** Whether per-ayah audio is available on cdn.islamic.network */
  hasAyahAudio: boolean;
  /** Quran Foundation API reciter ID (for timestamp-based highlighting) */
  qfApiId?: number;
  /** mp3quran.net reciter ID for dynamic URL resolution */
  mp3quranId?: number;
  /** Whether this reciter's style is calm and suitable for sleep mode */
  suitableForSleep?: boolean;
}

export const RECITERS: Reciter[] = [
  { id: "alafasy", name: "مشاري العفاسي", nameEn: "Mishary Alafasy", folder: "ar.alafasy", hasAyahAudio: true, qfApiId: 7, mp3quranId: 123, suitableForSleep: true },
  { id: "husary", name: "محمود خليل الحصري", nameEn: "Mahmoud Khalil Al-Husary", folder: "ar.husary", hasAyahAudio: true, qfApiId: 6, suitableForSleep: true },
  { id: "minshawi", name: "محمد صديق المنشاوي", nameEn: "Muhammad Siddiq Al-Minshawi", folder: "ar.minshawi", hasAyahAudio: true, qfApiId: 9, suitableForSleep: true },
  { id: "abdulbasit", name: "عبد الباسط عبد الصمد (مرتّل)", nameEn: "Abdul Basit Abdul Samad (Murattal)", folder: "ar.abdulbasitmurattal", hasAyahAudio: true, qfApiId: 2, mp3quranId: 51, suitableForSleep: true },
  { id: "abdulbasitmujawwad", name: "عبد الباسط عبد الصمد (مجوّد)", nameEn: "Abdul Basit Abdul Samad (Mujawwad)", folder: "ar.abdulbasitmujawwad", hasAyahAudio: false, suitableForSleep: false },
  { id: "sudais", name: "عبد الرحمن السديس", nameEn: "Abdurrahman Al-Sudais", folder: "ar.abdurrahmaansudais", hasAyahAudio: true, qfApiId: 3, mp3quranId: 54, suitableForSleep: false },
  { id: "shuraym", name: "سعود الشريم", nameEn: "Saud Al-Shuraym", folder: "ar.saoodshuraym", hasAyahAudio: true, qfApiId: 10, mp3quranId: 31, suitableForSleep: false },
  { id: "rifai", name: "هاني الرفاعي", nameEn: "Hani Al-Rifai", folder: "ar.hanirifai", hasAyahAudio: true, qfApiId: 5, mp3quranId: 89, suitableForSleep: true },
  { id: "ajamy", name: "أحمد العجمي", nameEn: "Ahmed Al-Ajamy", folder: "ar.ahmedajamy", hasAyahAudio: true, mp3quranId: 5, suitableForSleep: true },
  { id: "mahermuaiqly", name: "ماهر المعيقلي", nameEn: "Maher Al-Muaiqly", folder: "ar.mahermuaiqly", hasAyahAudio: true, mp3quranId: 102, suitableForSleep: true },
  // Reciters without per-ayah CDN audio (full-surah only)
  { id: "islamsobhi", name: "إسلام صبحي", nameEn: "Islam Sobhi", folder: "ar.alafasy", hasAyahAudio: false, mp3quranId: 253, suitableForSleep: true },
  { id: "yasser", name: "ياسر الدوسري", nameEn: "Yasser Al-Dosari", folder: "ar.alafasy", hasAyahAudio: false, suitableForSleep: true },
  { id: "baleela", name: "بندر بليلة", nameEn: "Bandar Baleela", folder: "ar.alafasy", hasAyahAudio: false, suitableForSleep: false },
  { id: "khalilaljalil", name: "خالد الجليل", nameEn: "Khalid Al-Jalil", folder: "ar.alafasy", hasAyahAudio: false, mp3quranId: 20, suitableForSleep: true },
  { id: "ayyub", name: "محمد أيوب", nameEn: "Muhammad Ayyub", folder: "ar.alafasy", hasAyahAudio: false, suitableForSleep: true },
  { id: "idrisabkar", name: "إدريس أبكر", nameEn: "Idris Abkar", folder: "ar.alafasy", hasAyahAudio: false, suitableForSleep: true },
  // Egyptian reciters
  { id: "rifaat", name: "محمد رفعت", nameEn: "Muhammad Rifaat", folder: "ar.alafasy", hasAyahAudio: false, mp3quranId: 241, suitableForSleep: true },
  { id: "tablawi", name: "محمد الطبلاوي", nameEn: "Muhammad Al-Tablawi", folder: "ar.alafasy", hasAyahAudio: false, mp3quranId: 106, suitableForSleep: true },
  { id: "mustafaismail", name: "مصطفى إسماعيل", nameEn: "Mustafa Ismail", folder: "ar.alafasy", hasAyahAudio: false, mp3quranId: 125, suitableForSleep: true },
  // New calm reciters
  { id: "saadghamdi", name: "سعد الغامدي", nameEn: "Saad Al-Ghamdi", folder: "ar.alafasy", hasAyahAudio: false, suitableForSleep: true },
  { id: "nasserqatami", name: "ناصر القطامي", nameEn: "Nasser Al-Qatami", folder: "ar.alafasy", hasAyahAudio: false, suitableForSleep: true },
  { id: "khaledalqahtani", name: "خالد القحطاني", nameEn: "Khalid Al-Qahtani", folder: "ar.alafasy", hasAyahAudio: false, suitableForSleep: true },
];

export const DEFAULT_RECITER = "alafasy";

export function getReciterById(id: string): Reciter {
  return RECITERS.find((r) => r.id === id) ?? RECITERS[0];
}

// Static CDN URLs — primary sources for full-surah audio per reciter
const CUSTOM_CDN_RECITERS: Record<string, string[]> = {
  alafasy: [
    "https://download.quranicaudio.com/quran/mishaari_raashid_al_3afaasee/{p}.mp3",
    "https://server8.mp3quran.net/afs/{p}.mp3",
  ],
  ajamy: [
    "https://download.quranicaudio.com/quran/ahmed_ibn_3ali_al-3ajamy/{p}.mp3",
    "https://server10.mp3quran.net/ajm/{p}.mp3",
  ],
  mahermuaiqly: [
    "https://download.quranicaudio.com/quran/maher_256/{p}.mp3",
    "https://server12.mp3quran.net/maher/{p}.mp3",
  ],
  yasser: [
    "https://server11.mp3quran.net/yasser/{p}.mp3",
  ],
  ayyub: [
    "https://download.quranicaudio.com/quran/muhammad_ayyoob/{p}.mp3",
    "https://server8.mp3quran.net/ayyub/{p}.mp3",
  ],
  idrisabkar: [
    "https://download.quranicaudio.com/quran/idrees_abkar/{p}.mp3",
    "https://server6.mp3quran.net/abkr/{p}.mp3",
  ],
  baleela: [
    "https://download.quranicaudio.com/quran/bandar_baleela/complete/{p}.mp3",
    "https://download.quranicaudio.com/quran/bandar_baleela/{p}.mp3",
  ],
  islamsobhi: [
    "https://server14.mp3quran.net/islam/Rewayat-Hafs-A-n-Assem/{p}.mp3",
  ],
  khalilaljalil: [
    "https://server10.mp3quran.net/jleel/{p}.mp3",
  ],
  abdulbasitmujawwad: [
    "https://server7.mp3quran.net/basit/Almusshaf-Al-Mojawwad/{p}.mp3",
  ],
  rifaat: [
    "https://server14.mp3quran.net/refat/{p}.mp3",
  ],
  tablawi: [
    "https://server12.mp3quran.net/tblawi/{p}.mp3",
  ],
  mustafaismail: [
    "https://server8.mp3quran.net/mustafa/{p}.mp3",
  ],
  saadghamdi: [
    "https://download.quranicaudio.com/quran/sa3d_al-ghaamidi/complete/{p}.mp3",
    "https://server7.mp3quran.net/s_gmd/{p}.mp3",
  ],
  nasserqatami: [
    "https://download.quranicaudio.com/quran/nasser_bin_ali_alqatami/{p}.mp3",
    "https://server6.mp3quran.net/qtm/{p}.mp3",
  ],
  khaledalqahtani: [
    "https://download.quranicaudio.com/quran/khaalid_al-qahtaanee/{p}.mp3",
  ],
  abdulbasit: [
    "https://download.quranicaudio.com/quran/abdul_basit_murattal/{p}.mp3",
    "https://server7.mp3quran.net/basit/{p}.mp3",
  ],
  sudais: [
    "https://download.quranicaudio.com/quran/abdurrahmaan_as-sudays/{p}.mp3",
    "https://server11.mp3quran.net/sds/{p}.mp3",
  ],
  shuraym: [
    "https://download.quranicaudio.com/qdc/saud_ash-shuraym/murattal/{p}.mp3",
    "https://server7.mp3quran.net/shur/{p}.mp3",
  ],
  rifai: [
    "https://server8.mp3quran.net/hani/{p}.mp3",
  ],
};

// Cache for dynamically resolved mp3quran.net server URLs
const dynamicCdnCache: Record<string, string> = {};

/**
 * Resolve the server base URL for a reciter from mp3quran.net API.
 * Caches the result so subsequent calls are instant.
 */
async function resolveMp3QuranServer(mp3quranId: number): Promise<string | null> {
  const cacheKey = String(mp3quranId);
  if (dynamicCdnCache[cacheKey]) return dynamicCdnCache[cacheKey];

  try {
    const res = await fetch(`https://mp3quran.net/api/v3/reciters?reciter=${mp3quranId}&language=ar`);
    if (!res.ok) return null;
    const data = await res.json();
    const reciter = data.reciters?.[0];
    const moshaf = reciter?.moshaf?.[0];
    if (moshaf?.server) {
      const server = moshaf.server.replace(/\/$/, "");
      dynamicCdnCache[cacheKey] = server;
      return server;
    }
  } catch {
    // Network error — fall through
  }
  return null;
}

export function getReciterAyahAudioUrl(reciterId: string, globalAyahNumber: number): string {
  const reciter = getReciterById(reciterId);
  return `https://cdn.islamic.network/quran/audio/128/${reciter.folder}/${globalAyahNumber}.mp3`;
}

function buildUrl(template: string, surahNumber: number): string {
  const padded = surahNumber.toString().padStart(3, "0");
  return template.replace("{n}", String(surahNumber)).replace("{p}", padded);
}

/**
 * Get full-surah audio URL for a reciter. Returns first available CDN URL.
 */
export async function getReciterAudioUrl(reciterId: string, surahNumber: number): Promise<string> {
  const customUrls = CUSTOM_CDN_RECITERS[reciterId];
  if (customUrls && customUrls.length > 0) {
    return buildUrl(customUrls[0], surahNumber);
  }

  const reciter = getReciterById(reciterId);

  if (reciter.mp3quranId) {
    const server = await resolveMp3QuranServer(reciter.mp3quranId);
    if (server) {
      const padded = surahNumber.toString().padStart(3, "0");
      return `${server}/${padded}.mp3`;
    }
  }

  if (reciter.hasAyahAudio) {
    const qaPath = QURANIC_AUDIO_MAP[reciter.folder];
    if (qaPath) {
      const padded = surahNumber.toString().padStart(3, "0");
      return `https://download.quranicaudio.com/quran/${qaPath}/${padded}.mp3`;
    }
  }

  const padded = surahNumber.toString().padStart(3, "0");
  return `https://download.quranicaudio.com/quran/mishaari_raashid_al_3afaasee/${padded}.mp3`;
}

// Map reciter folders to quranicaudio.com paths (for per-ayah reciters only)
const QURANIC_AUDIO_MAP: Record<string, string> = {
  "ar.husary": "mahmood_khaleel_al-husaree",
  "ar.minshawi": "muhammad_siddeeq_al-minshaawee",
};

/**
 * Get an ordered list of audio URLs to try for downloading.
 * No CORS proxies — only direct URLs from servers that support CORS.
 */
export async function getReciterAudioUrls(reciterId: string, surahNumber: number): Promise<string[]> {
  const reciter = getReciterById(reciterId);
  const padded = surahNumber.toString().padStart(3, "0");
  const urls: string[] = [];

  // 1. Custom multi-URL list
  const customUrls = CUSTOM_CDN_RECITERS[reciterId];
  if (customUrls) {
    for (const tpl of customUrls) {
      const url = buildUrl(tpl, surahNumber);
      if (!urls.includes(url)) urls.push(url);
    }
  }

  // 2. download.quranicaudio.com for reciters with their own unique folder
  if (reciter.hasAyahAudio) {
    const qaPath = QURANIC_AUDIO_MAP[reciter.folder];
    if (qaPath) {
      const url = `https://download.quranicaudio.com/quran/${qaPath}/${padded}.mp3`;
      if (!urls.includes(url)) urls.push(url);
    }
  }

  // 3. Dynamic mp3quran.net resolution
  if (reciter.mp3quranId) {
    const server = await resolveMp3QuranServer(reciter.mp3quranId);
    if (server) {
      const mp3Url = `${server}/${padded}.mp3`;
      if (!urls.includes(mp3Url)) urls.push(mp3Url);
    }
  }

  return urls;
}
