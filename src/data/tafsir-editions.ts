export interface TafsirEdition {
  id: string;
  name: string;
  nameEn: string;
  /** True if the full text is bundled in the app and works offline. */
  offline?: boolean;
}

export const TAFSIR_EDITIONS: TafsirEdition[] = [
  { id: "ar.muyassar", name: "تفسير الميسر", nameEn: "Al-Muyassar Tafsir", offline: true },
  { id: "ar.jalalayn", name: "تفسير الجلالين", nameEn: "Tafsir Al-Jalalayn" },
  { id: "ar.qurtubi", name: "تفسير القرطبي", nameEn: "Tafsir Al-Qurtubi" },
  { id: "ar.baghawi", name: "تفسير البغوي", nameEn: "Tafsir Al-Baghawi" },
  { id: "ar.waseet", name: "التفسير الوسيط", nameEn: "Al-Waseet Tafsir" },
  { id: "ar.miqbas", name: "تنوير المقباس", nameEn: "Tanwir Al-Miqbas" },
  { id: "en.ahmedali", name: "ابن كثير (إنجليزي)", nameEn: "Ibn Kathir (English)" },
];

export const ENGLISH_TAFSIR_ID = "en.ahmedali";

export const DEFAULT_TAFSIR = "ar.muyassar";
