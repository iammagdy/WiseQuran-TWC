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
}

export const RECITERS: Reciter[] = [
  { id: "alafasy", name: "مشاري العفاسي", nameEn: "Mishary Alafasy", folder: "ar.alafasy", hasAyahAudio: true, qfApiId: 7 },
  { id: "husary", name: "محمود خليل الحصري", nameEn: "Mahmoud Khalil Al-Husary", folder: "ar.husary", hasAyahAudio: true, qfApiId: 6 },
  { id: "minshawi", name: "محمد صديق المنشاوي", nameEn: "Muhammad Siddiq Al-Minshawi", folder: "ar.minshawi", hasAyahAudio: true, qfApiId: 9 },
  { id: "abdulbasit", name: "عبد الباسط عبد الصمد (مرتّل)", nameEn: "Abdul Basit Abdul Samad (Murattal)", folder: "ar.abdulbasitmurattal", hasAyahAudio: true, qfApiId: 2 },
  { id: "abdulbasitmujawwad", name: "عبد الباسط عبد الصمد (مجوّد)", nameEn: "Abdul Basit Abdul Samad (Mujawwad)", folder: "ar.abdulbasitmujawwad", hasAyahAudio: false },
  { id: "sudais", name: "عبد الرحمن السديس", nameEn: "Abdurrahman Al-Sudais", folder: "ar.abdurrahmaansudais", hasAyahAudio: true, qfApiId: 3 },
  { id: "shuraym", name: "سعود الشريم", nameEn: "Saud Al-Shuraym", folder: "ar.saoodshuraym", hasAyahAudio: true, qfApiId: 10 },
  { id: "rifai", name: "هاني الرفاعي", nameEn: "Hani Al-Rifai", folder: "ar.hanirifai", hasAyahAudio: true, qfApiId: 5 },
  { id: "ajamy", name: "أحمد العجمي", nameEn: "Ahmed Al-Ajamy", folder: "ar.ahmedajamy", hasAyahAudio: true },
  { id: "mahermuaiqly", name: "ماهر المعيقلي", nameEn: "Maher Al-Muaiqly", folder: "ar.mahermuaiqly", hasAyahAudio: true },
  // Reciters without per-ayah CDN audio (full-surah only)
  { id: "islamsobhi", name: "إسلام صبحي", nameEn: "Islam Sobhi", folder: "ar.alafasy", hasAyahAudio: false },
  { id: "yasser", name: "ياسر الدوسري", nameEn: "Yasser Al-Dosari", folder: "ar.alafasy", hasAyahAudio: false },
  { id: "baleela", name: "بندر بليلة", nameEn: "Bandar Baleela", folder: "ar.alafasy", hasAyahAudio: false },
  { id: "khalilaljalil", name: "خالد الجليل", nameEn: "Khalid Al-Jalil", folder: "ar.alafasy", hasAyahAudio: false },
  { id: "ayyub", name: "محمد أيوب", nameEn: "Muhammad Ayyub", folder: "ar.alafasy", hasAyahAudio: false },
  { id: "idrisabkar", name: "إدريس أبكر", nameEn: "Idris Abkar", folder: "ar.alafasy", hasAyahAudio: false },
  // Egyptian reciters
  { id: "rifaat", name: "محمد رفعت", nameEn: "Muhammad Rifaat", folder: "ar.alafasy", hasAyahAudio: false },
  { id: "tablawi", name: "محمد الطبلاوي", nameEn: "Muhammad Al-Tablawi", folder: "ar.alafasy", hasAyahAudio: false },
  { id: "bahtimi", name: "كامل يوسف البهتيمي", nameEn: "Kamil Yusuf Al-Bahtimi", folder: "ar.alafasy", hasAyahAudio: false },
  { id: "mustafaismail", name: "مصطفى إسماعيل", nameEn: "Mustafa Ismail", folder: "ar.alafasy", hasAyahAudio: false },
  { id: "shahat", name: "رمضان شحات", nameEn: "Ramadan Shahat", folder: "ar.alafasy", hasAyahAudio: false },
];

export const DEFAULT_RECITER = "alafasy";

export function getReciterById(id: string): Reciter {
  return RECITERS.find((r) => r.id === id) ?? RECITERS[0];
}

// Static CDN URLs — verified working paths (no trailing subfolder junk)
const CUSTOM_CDN_RECITERS: Record<string, string> = {
  ajamy: "https://server10.mp3quran.net/ajm",
  mahermuaiqly: "https://server12.mp3quran.net/maher",
  yasser: "https://server11.mp3quran.net/yasser",
  ayyub: "https://server8.mp3quran.net/ayyub",
  idrisabkar: "https://server6.mp3quran.net/abkr",
  baleela: "https://download.quranicaudio.com/quran/bandar_baleela",
  islamsobhi: "https://server14.mp3quran.net/islam/Rewayat-Hafs-A-n-Assem",
  khalilaljalil: "https://server10.mp3quran.net/jleel",
  abdulbasitmujawwad: "https://download.quranicaudio.com/quran/abdulbasit_abdulsamad_mujawwad",
  // Egyptian reciters
  rifaat: "https://download.quranicaudio.com/quran/muhammad_rifaat",
  tablawi: "https://server7.mp3quran.net/tablawi",
  bahtimi: "https://download.quranicaudio.com/quran/kamel_yusuf_al-bahtimi",
  mustafaismail: "https://download.quranicaudio.com/quran/mustafa_ismail",
  shahat: "https://server8.mp3quran.net/shahat",
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
    // The API returns moshaf array; pick the first moshaf with server URL
    const moshaf = reciter?.moshaf?.[0];
    if (moshaf?.server) {
      const server = moshaf.server.replace(/\/$/, ""); // trim trailing slash
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

/**
 * Get full-surah audio URL for a reciter. Now async to support dynamic resolution.
 */
export async function getReciterAudioUrl(reciterId: string, surahNumber: number): Promise<string> {
  const padded = surahNumber.toString().padStart(3, "0");

  // 1. Check static custom CDN
  const customBase = CUSTOM_CDN_RECITERS[reciterId];
  if (customBase) {
    return `${customBase}/${padded}.mp3`;
  }

  // 2. Check dynamic mp3quran API for reciters with mp3quranId
  const reciter = getReciterById(reciterId);
  if (reciter.mp3quranId) {
    const server = await resolveMp3QuranServer(reciter.mp3quranId);
    if (server) {
      return `${server}/${padded}.mp3`;
    }
  }

  // 3. Fallback to cdn.islamic.network surah audio
  return `https://cdn.islamic.network/quran/audio-surah/128/${reciter.folder}/${surahNumber}.mp3`;
}

// Map reciter folders to quranicaudio.com paths
const QURANIC_AUDIO_MAP: Record<string, string> = {
  "ar.alafasy": "mishaari_raashid_al_3afaasee",
  "ar.husary": "mahmood_khaleel_al-husaree",
  "ar.minshawi": "muhammad_siddeeq_al-minshaawee",
  "ar.abdulbasitmurattal": "abdulbasit_abdulsamad_192kbps",
  "ar.abdurrahmaansudais": "abdurrahmaan_as-sudais",
  "ar.saoodshuraym": "sa3ood_ash-shuraym",
  "ar.hanirifai": "hani_ar-rifai",
  "ar.ahmedajamy": "ahmed_al-ajamy",
};

/**
 * Get an ordered list of audio URLs to try for downloading.
 * No CORS proxies — only direct URLs from servers that support CORS.
 */
export async function getReciterAudioUrls(reciterId: string, surahNumber: number): Promise<string[]> {
  const reciter = getReciterById(reciterId);
  const padded = surahNumber.toString().padStart(3, "0");
  const urls: string[] = [];

  // 1. download.quranicaudio.com — only add if this reciter is the true owner of that folder
  // (hasAyahAudio reciters each have a unique folder; hasAyahAudio:false reciters all share
  //  "ar.alafasy" as a placeholder, so we must NOT look up the quranic audio map for them)
  if (reciter.hasAyahAudio) {
    const qaPath = QURANIC_AUDIO_MAP[reciter.folder];
    if (qaPath) {
      urls.push(`https://download.quranicaudio.com/quran/${qaPath}/${padded}.mp3`);
    }
  }

  // 2. Custom CDN (mp3quran.net etc.) for reciters that have it
  const customBase = CUSTOM_CDN_RECITERS[reciterId];
  if (customBase) {
    urls.push(`${customBase}/${padded}.mp3`);
  }

  // 3. Dynamic mp3quran.net resolution
  if (reciter.mp3quranId) {
    const server = await resolveMp3QuranServer(reciter.mp3quranId);
    if (server) {
      const mp3Url = `${server}/${padded}.mp3`;
      if (!urls.includes(mp3Url)) urls.push(mp3Url);
    }
  }

  // 4. cdn.islamic.network as last resort — only for reciters with their own unique folder
  if (reciter.hasAyahAudio) {
    urls.push(`https://cdn.islamic.network/quran/audio-surah/128/${reciter.folder}/${surahNumber}.mp3`);
  }

  return urls;
}
