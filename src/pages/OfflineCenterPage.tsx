import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Download, HardDrive, Loader2, Search, Trash2, Volume2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { formatBytes, downloadSurahAudio } from "@/lib/quran-audio";
import { downloadAllSurahs, downloadSurah } from "@/lib/quran-api";
import { deleteAudio, deleteSurah, getAllAudioEntries, getAllDownloadedSurahs, getStorageStats } from "@/lib/db";
import { RECITERS, DEFAULT_RECITER, getReciterById } from "@/lib/reciters";
import { cn, toArabicNumerals } from "@/lib/utils";
import { SURAH_META } from "@/data/surah-meta";

type OfflineFilter = "all" | "downloaded" | "pending";

export default function OfflineCenterPage() {
  const navigate = useNavigate();
  const { language, isRTL } = useLanguage();
  const [reciterId] = useLocalStorage<string>("wise-reciter", DEFAULT_RECITER);
  const [downloadedSurahs, setDownloadedSurahs] = useState<number[]>([]);
  // Map of surahNumber → list of reciterIds that have audio downloaded for it.
  const [audioByReciter, setAudioByReciter] = useState<Map<number, string[]>>(new Map());
  const [downloadingText, setDownloadingText] = useState(false);
  const [downloadingAudio, setDownloadingAudio] = useState(false);
  const [textProgress, setTextProgress] = useState(0);
  const [audioProgress, setAudioProgress] = useState(0);
  const [storageTotal, setStorageTotal] = useState(0);
  const [filter, setFilter] = useState<OfflineFilter>("all");
  const [search, setSearch] = useState("");
  const [activeItemAction, setActiveItemAction] = useState<string | null>(null);

  const reciterName = useMemo(() => {
    const reciter = RECITERS.find((item) => item.id === reciterId);
    return language === "ar" ? (reciter?.name ?? "") : (reciter?.nameEn ?? reciter?.name ?? "");
  }, [language, reciterId]);

  const refresh = useCallback(async () => {
    const [surahs, allAudio, stats] = await Promise.all([
      getAllDownloadedSurahs(),
      getAllAudioEntries(),
      getStorageStats(),
    ]);
    setDownloadedSurahs(surahs);
    const grouped = new Map<number, string[]>();
    for (const entry of allAudio) {
      const list = grouped.get(entry.surahNumber) ?? [];
      if (!list.includes(entry.reciterId)) list.push(entry.reciterId);
      grouped.set(entry.surahNumber, list);
    }
    setAudioByReciter(grouped);
    setStorageTotal(stats.total);
  }, []);

  // Flat list of surahs that have audio downloaded for the *current* reciter
  // (used by the bulk audio buttons).
  const downloadedAudio = useMemo(() => {
    const out: number[] = [];
    audioByReciter.forEach((reciters, surahNum) => {
      if (reciters.includes(reciterId)) out.push(surahNum);
    });
    return out;
  }, [audioByReciter, reciterId]);

  const totalAudioDownloads = useMemo(() => {
    let total = 0;
    audioByReciter.forEach((reciters) => { total += reciters.length; });
    return total;
  }, [audioByReciter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleDownloadText = useCallback(async () => {
    setDownloadingText(true);
    try {
      await downloadAllSurahs((percent) => setTextProgress(percent));
      await refresh();
    } finally {
      setDownloadingText(false);
    }
  }, [refresh]);

  const handleClearText = useCallback(async () => {
    const current = await getAllDownloadedSurahs();
    await Promise.all(current.map((surahNumber) => deleteSurah(surahNumber)));
    await refresh();
  }, [refresh]);

  const handleDownloadAudio = useCallback(async () => {
    setDownloadingAudio(true);
    try {
      for (let surahNumber = 1; surahNumber <= 114; surahNumber++) {
        await downloadSurahAudio(reciterId, surahNumber);
        setAudioProgress(Math.round((surahNumber / 114) * 100));
      }
      await refresh();
    } finally {
      setDownloadingAudio(false);
    }
  }, [reciterId, refresh]);

  const handleClearAudio = useCallback(async () => {
    // Only clear audio for the *current* reciter — other reciters' downloads
    // are preserved so users do not lose them by switching reciter.
    const surahsForCurrent = downloadedAudio.slice();
    await Promise.all(surahsForCurrent.map((n) => deleteAudio(reciterId, n)));
    await refresh();
  }, [downloadedAudio, reciterId, refresh]);

  const handleTextItem = useCallback(async (surahNumber: number, shouldDelete: boolean) => {
    setActiveItemAction(`text-${surahNumber}`);
    try {
      if (shouldDelete) {
        await deleteSurah(surahNumber);
      } else {
        await downloadSurah(surahNumber);
      }
      await refresh();
    } finally {
      setActiveItemAction(null);
    }
  }, [refresh]);

  const handleAudioItem = useCallback(async (surahNumber: number, shouldDelete: boolean) => {
    setActiveItemAction(`audio-${surahNumber}`);
    try {
      if (shouldDelete) {
        await deleteAudio(reciterId, surahNumber);
      } else {
        await downloadSurahAudio(reciterId, surahNumber);
      }
      await refresh();
    } finally {
      setActiveItemAction(null);
    }
  }, [reciterId, refresh]);

  const handleDeleteReciterAudio = useCallback(async (surahNumber: number, targetReciterId: string) => {
    setActiveItemAction(`audio-${surahNumber}-${targetReciterId}`);
    try {
      await deleteAudio(targetReciterId, surahNumber);
      await refresh();
    } finally {
      setActiveItemAction(null);
    }
  }, [refresh]);

  const filteredSurahs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return SURAH_META.filter((surah) => {
      const hasText = downloadedSurahs.includes(surah.number);
      const hasAudio = downloadedAudio.includes(surah.number);
      const reciterCount = audioByReciter.get(surah.number)?.length ?? 0;
      const matchesFilter = filter === "all"
        ? true
        : filter === "downloaded"
          ? hasText || reciterCount > 0
          : !hasText || !hasAudio;
      const matchesSearch = !query
        || surah.name.includes(search.trim())
        || surah.englishName.toLowerCase().includes(query)
        || String(surah.number).includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [audioByReciter, downloadedAudio, downloadedSurahs, filter, search]);

  return (
    <div className="px-4 pt-6 pb-24" dir={isRTL ? "rtl" : "ltr"}>
      <div className="mb-6 flex items-center gap-3">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} className="rounded-xl glass-card p-2.5 shadow-soft" data-testid="offline-center-back-button">
          {isRTL ? <ArrowRight className="h-5 w-5 text-foreground" /> : <ArrowLeft className="h-5 w-5 text-foreground" />}
        </motion.button>
        <div>
          <h1 className="text-2xl font-bold heading-decorated" data-testid="offline-center-title">{language === "ar" ? "المكتبة بدون إنترنت" : "Offline Center"}</h1>
          <p className="text-xs text-muted-foreground" data-testid="offline-center-subtitle">
            {language === "ar" ? "نزّل النصوص والصوت للاستخدام بدون اتصال" : "Download text and audio for offline use."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-2xl glass-card p-4 border border-border/40" data-testid="offline-center-text-count-card">
          <p className="text-xs text-muted-foreground mb-1">{language === "ar" ? "نص القرآن" : "Quran Text"}</p>
          <p className="text-xl font-bold text-foreground">{language === "ar" ? toArabicNumerals(downloadedSurahs.length) : downloadedSurahs.length} / 114</p>
        </div>
        <div className="rounded-2xl glass-card p-4 border border-border/40" data-testid="offline-center-audio-count-card">
          <p className="text-xs text-muted-foreground mb-1">{language === "ar" ? "الصوت" : "Audio"}</p>
          <p className="text-xl font-bold text-foreground">{language === "ar" ? toArabicNumerals(downloadedAudio.length) : downloadedAudio.length} / 114</p>
          {totalAudioDownloads > downloadedAudio.length && (
            <p className="text-[11px] text-muted-foreground mt-1">
              {language === "ar"
                ? `${toArabicNumerals(totalAudioDownloads)} ملف عبر القرّاء`
                : `${totalAudioDownloads} files across reciters`}
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl glass-card p-4 border border-border/40 mb-4" data-testid="offline-center-storage-card">
        <div className="flex items-center gap-2 mb-2">
          <HardDrive className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">{language === "ar" ? "التخزين الحالي" : "Current Storage"}</p>
        </div>
        <p className="text-sm text-muted-foreground">{formatBytes(storageTotal)}</p>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl glass-card p-4 border border-border/40" data-testid="offline-center-text-panel">
          <div className="flex items-center gap-2 mb-2">
            <Download className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">{language === "ar" ? "تحميل النصوص" : "Download Text"}</p>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            {language === "ar" ? "احفظ السور للقراءة بدون إنترنت." : "Store surahs for offline reading."}
          </p>
          {downloadingText && (
            <p className="text-xs text-primary mb-3">{language === "ar" ? `جارٍ التحميل ${toArabicNumerals(textProgress)}%` : `Downloading ${textProgress}%`}</p>
          )}
          <div className="flex gap-2">
            <Button data-testid="offline-center-download-text-button" className="flex-1 gap-2" onClick={handleDownloadText} disabled={downloadingText}>
              {downloadingText ? <Loader2 className="h-4 w-4 animate-spin" /> : downloadedSurahs.length === 114 ? <Check className="h-4 w-4" /> : <Download className="h-4 w-4" />}
              {downloadedSurahs.length === 114 ? (language === "ar" ? "مكتمل" : "Complete") : (language === "ar" ? "تحميل الكل" : "Download All")}
            </Button>
            <Button data-testid="offline-center-clear-text-button" variant="outline" className="gap-2" onClick={handleClearText} disabled={downloadedSurahs.length === 0 || downloadingText}>
              <Trash2 className="h-4 w-4" />
              {language === "ar" ? "مسح" : "Clear"}
            </Button>
          </div>
        </div>

        <div className="rounded-2xl glass-card p-4 border border-border/40" data-testid="offline-center-audio-panel">
          <div className="flex items-center gap-2 mb-2">
            <Volume2 className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">{language === "ar" ? "تحميل الصوت" : "Download Audio"}</p>
          </div>
          <p className="text-xs text-muted-foreground mb-1">
            {language === "ar" ? `القارئ الحالي: ${reciterName}` : `Current reciter: ${reciterName}`}
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            {language === "ar" ? "احفظ التلاوات للاستماع بدون إنترنت." : "Store recitations for offline listening."}
          </p>
          {downloadingAudio && (
            <p className="text-xs text-primary mb-3">{language === "ar" ? `جارٍ التحميل ${toArabicNumerals(audioProgress)}%` : `Downloading ${audioProgress}%`}</p>
          )}
          <div className="flex gap-2">
            <Button data-testid="offline-center-download-audio-button" className="flex-1 gap-2" onClick={handleDownloadAudio} disabled={downloadingAudio}>
              {downloadingAudio ? <Loader2 className="h-4 w-4 animate-spin" /> : downloadedAudio.length === 114 ? <Check className="h-4 w-4" /> : <Download className="h-4 w-4" />}
              {downloadedAudio.length === 114 ? (language === "ar" ? "مكتمل" : "Complete") : (language === "ar" ? "تحميل الكل" : "Download All")}
            </Button>
            <Button data-testid="offline-center-clear-audio-button" variant="outline" className="gap-2" onClick={handleClearAudio} disabled={downloadedAudio.length === 0 || downloadingAudio}>
              <Trash2 className="h-4 w-4" />
              {language === "ar" ? "مسح" : "Clear"}
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl glass-card p-4 border border-border/40" data-testid="offline-center-per-surah-panel">
        <div className="flex flex-col gap-3 mb-4">
          <div>
            <p className="text-sm font-semibold text-foreground">{language === "ar" ? "إدارة السور فرديًا" : "Per-Surah Management"}</p>
            <p className="text-xs text-muted-foreground">{language === "ar" ? "نزّل أو احذف النص والصوت لكل سورة على حدة." : "Download or remove text and audio for each surah individually."}</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {([
              { key: "all", label: language === "ar" ? "الكل" : "All" },
              { key: "downloaded", label: language === "ar" ? "تم تنزيله" : "Downloaded" },
              { key: "pending", label: language === "ar" ? "ناقص" : "Pending" },
            ] as Array<{ key: OfflineFilter; label: string }>).map((option) => (
              <button
                key={option.key}
                data-testid={`offline-center-filter-${option.key}`}
                onClick={() => setFilter(option.key)}
                className={cn(
                  "rounded-xl py-2 text-sm font-medium transition-colors",
                  filter === option.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" style={isRTL ? { left: "auto", right: "0.75rem" } : {}} />
            <input
              data-testid="offline-center-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={language === "ar" ? "ابحث عن سورة..." : "Search surah..."}
              className="w-full rounded-xl border border-border bg-background py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              style={isRTL ? { paddingRight: "2.5rem", paddingLeft: "1rem" } : { paddingLeft: "2.5rem", paddingRight: "1rem" }}
            />
          </div>
        </div>

        <div className="space-y-2 max-h-[28rem] overflow-y-auto pe-1">
          {filteredSurahs.map((surah) => {
            const hasText = downloadedSurahs.includes(surah.number);
            const hasAudio = downloadedAudio.includes(surah.number);
            const surahReciters = audioByReciter.get(surah.number) ?? [];
            const textBusy = activeItemAction === `text-${surah.number}`;
            const audioBusy = activeItemAction === `audio-${surah.number}`;

            return (
              <div key={surah.number} className="rounded-2xl border border-border/40 bg-background/80 p-3" data-testid={`offline-center-surah-row-${surah.number}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="font-arabic text-base font-bold text-foreground truncate">{language === "ar" ? surah.name : surah.englishName}</p>
                    <p className="text-xs text-muted-foreground">{language === "ar" ? `سورة ${toArabicNumerals(surah.number)}` : `Surah ${surah.number}`}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1">
                    <span className={cn("rounded-full px-2 py-1 text-[11px] font-semibold", hasText ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>{language === "ar" ? "نص" : "Text"}</span>
                    <span className={cn("rounded-full px-2 py-1 text-[11px] font-semibold", hasAudio ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>{language === "ar" ? "صوت" : "Audio"}</span>
                  </div>
                </div>
                {surahReciters.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1.5" data-testid={`offline-center-surah-reciters-${surah.number}`}>
                    {surahReciters.map((rid) => {
                      const reciter = getReciterById(rid);
                      const label = language === "ar" ? reciter.name : (reciter.nameEn || reciter.name);
                      const chipBusy = activeItemAction === `audio-${surah.number}-${rid}`;
                      return (
                        <span
                          key={rid}
                          data-testid={`offline-center-surah-reciter-chip-${surah.number}-${rid}`}
                          className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-semibold"
                        >
                          <Volume2 className="h-3 w-3" />
                          <span className="truncate max-w-[10rem]">{label}</span>
                          <button
                            type="button"
                            disabled={chipBusy}
                            onClick={() => handleDeleteReciterAudio(surah.number, rid)}
                            aria-label={language === "ar" ? `حذف صوت ${label}` : `Remove audio for ${label}`}
                            data-testid={`offline-center-surah-reciter-remove-${surah.number}-${rid}`}
                            className="ms-0.5 rounded-full p-0.5 hover:bg-primary/15 disabled:opacity-50 transition-colors"
                          >
                            {chipBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    data-testid={`offline-center-surah-text-button-${surah.number}`}
                    variant={hasText ? "outline" : "default"}
                    className="gap-2"
                    disabled={textBusy}
                    onClick={() => handleTextItem(surah.number, hasText)}
                  >
                    {textBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : hasText ? <Trash2 className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                    {hasText ? (language === "ar" ? "حذف النص" : "Delete text") : (language === "ar" ? "تنزيل النص" : "Download text")}
                  </Button>
                  <Button
                    data-testid={`offline-center-surah-audio-button-${surah.number}`}
                    variant={hasAudio ? "outline" : "default"}
                    className="gap-2"
                    disabled={audioBusy}
                    onClick={() => handleAudioItem(surah.number, hasAudio)}
                  >
                    {audioBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : hasAudio ? <Trash2 className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                    {hasAudio ? (language === "ar" ? "حذف الصوت" : "Delete audio") : (language === "ar" ? "تنزيل الصوت" : "Download audio")}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border/40 bg-card p-4 text-xs text-muted-foreground" data-testid="offline-center-note">
        {language === "ar"
          ? "هذه الشاشة تركّز على النصوص والصوت فقط حتى يبقى التحميل بسيطًا وواضحًا بدون التأثير على باقي وظائف التطبيق."
          : "This screen focuses on text and audio only, keeping offline downloads simple without affecting the rest of the app."}
      </div>
    </div>
  );
}