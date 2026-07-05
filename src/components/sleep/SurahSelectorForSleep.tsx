import { useEffect, useRef, useState } from "react";
import { Search, ChevronDown, Check, Download, Loader2, WifiOff, Trash2 } from "lucide-react";
import { SURAH_META } from "@/data/surah-meta";
import { downloadSurahAudio } from "@/lib/quran-audio";
import { deleteAudio } from "@/lib/db";
import { requestPersistentStorageWithToast } from "@/lib/storage-persist";
import { toast } from "sonner";

const SLEEP_SURAHS = [2, 3, 18, 36, 55, 56, 67, 73, 76, 78, 112, 113, 114];

interface SurahSelectorForSleepProps {
  selected: number;
  language: string;
  onChange: (surahNumber: number) => void;
  reciterId: string;
  downloadedSurahs: Set<number>;
  onAfterDownload: () => void;
}

/**
 * Surah picker for Sleep Mode with per-surah offline status.
 *
 * Each pill carries a trailing badge that reflects whether the audio
 * for that surah is already in IndexedDB for the currently-selected
 * reciter:
 *   - check  → already downloaded; tapping the pill plays it offline.
 *   - cloud  → not downloaded; the inline download button fetches it.
 *   - spin   → download in flight (cancellable by tapping again).
 *
 * The download button stops click propagation so it never doubles as a
 * "select this surah" tap. Selection still happens by tapping the pill
 * body itself.
 */
export function SurahSelectorForSleep({
  selected,
  language,
  onChange,
  reciterId,
  downloadedSurahs,
  onAfterDownload,
}: SurahSelectorForSleepProps) {
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState("");
  // Map surahNumber → in-flight AbortController so a second tap cancels
  // the download instead of starting a duplicate.
  const [downloading, setDownloading] = useState<Map<number, AbortController>>(new Map());
  // Mirror of `downloading` accessible from the unmount cleanup, since the
  // cleanup runs against the closed-over state value at mount time.
  const downloadingRef = useRef(downloading);
  downloadingRef.current = downloading;

  // On unmount, abort every still-in-flight download so background fetches
  // don't continue to resolve into stale toast/state updates after the user
  // navigates away from Sleep Mode.
  useEffect(() => {
    return () => {
      downloadingRef.current.forEach((ctrl) => ctrl.abort());
    };
  }, []);

  // Live online/offline state — the parent page tracks connectivity but
  // we also subscribe locally so the inline "Offline" badge and the
  // download button's enabled state both react instantly when the
  // device flips connectivity (Wi-Fi handoff, airplane mode, etc.)
  // without waiting for a parent re-render.
  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const suggestedSurahs = SURAH_META.filter((s) => SLEEP_SURAHS.includes(s.number));
  const allFiltered = SURAH_META.filter(
    (s) =>
      s.name.includes(query) ||
      s.englishName.toLowerCase().includes(query.toLowerCase()) ||
      String(s.number).includes(query)
  );

  const displayList = showAll ? allFiltered : suggestedSurahs;
  // ⚡ Bolt: O(1) direct indexing
  const selectedSurah = SURAH_META[selected - 1];

  const handleDelete = async (surahNumber: number) => {
    // Confirm before destructive action so a single accidental tap on a
    // ✓-cached pill doesn't silently free the user's downloaded audio.
    const meta = SURAH_META[surahNumber - 1];
    const surahLabel = meta ? (language === "ar" ? meta.name : meta.englishName) : `${surahNumber}`;
    const confirmMsg =
      language === "ar"
        ? `حذف "${surahLabel}" من التحميلات؟`
        : `Delete "${surahLabel}" from downloads?`;
    if (typeof window !== "undefined" && typeof window.confirm === "function") {
      if (!window.confirm(confirmMsg)) return;
    }
    try {
      await deleteAudio(reciterId, surahNumber);
      onAfterDownload();
      toast.success(
        language === "ar"
          ? "تم حذف التسجيل من الجهاز"
          : "Recording deleted from device",
      );
    } catch {
      toast.error(
        language === "ar" ? "تعذّر الحذف، حاول مجدداً" : "Delete failed, try again",
      );
    }
  };

  const handleDownload = async (surahNumber: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Toggle-cancel if already downloading this one.
    const inFlight = downloading.get(surahNumber);
    if (inFlight) {
      inFlight.abort();
      return;
    }
    // If this surah is already cached, the button acts as a delete:
    // it frees device storage and removes the offline copy.
    if (downloadedSurahs.has(surahNumber)) {
      await handleDelete(surahNumber);
      return;
    }
    if (!isOnline) {
      toast.error(language === "ar" ? "لا يوجد اتصال بالإنترنت" : "No internet connection");
      return;
    }

    // Pin storage on first ever offline download so iOS won't evict it
    // after 7 days of inactivity. The toast variant surfaces the
    // outcome to iOS users exactly once so they understand whether
    // their downloads are protected (or that they need to install the
    // PWA to the Home Screen).
    void requestPersistentStorageWithToast(language, {
      success: (msg) => toast.success(msg),
      info: (msg) => toast.info(msg),
    });

    const ctrl = new AbortController();
    setDownloading((prev) => {
      const next = new Map(prev);
      next.set(surahNumber, ctrl);
      return next;
    });
    try {
      await downloadSurahAudio(reciterId, surahNumber, undefined, ctrl.signal);
      onAfterDownload();
      toast.success(
        language === "ar"
          ? `حُفظت السورة للاستخدام بدون اتصال`
          : "Saved offline for Sleep Mode",
      );
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        toast.info(language === "ar" ? "تم إلغاء التنزيل" : "Download cancelled");
      } else {
        toast.error(
          language === "ar" ? "فشل التنزيل، حاول مجدداً" : "Download failed, please retry",
        );
      }
    } finally {
      setDownloading((prev) => {
        const next = new Map(prev);
        next.delete(surahNumber);
        return next;
      });
    }
  };

  return (
    <div className="space-y-2">
      {showAll && (
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={language === "ar" ? "ابحث عن سورة..." : "Search surah..."}
            className="w-full bg-white/8 border border-white/15 rounded-xl ps-9 pe-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-amber-400/40"
            dir={language === "ar" ? "rtl" : "ltr"}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
        {displayList.map((surah) => {
          const isCached = downloadedSurahs.has(surah.number);
          const isBusy = downloading.has(surah.number);
          const isSelected = selected === surah.number;

          return (
            <div
              key={surah.number}
              className={`flex items-center gap-1 rounded-full text-sm border transition-all ${
                isSelected
                  ? "bg-amber-400/20 border-amber-400/50 text-amber-100"
                  : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
              }`}
            >
              <button
                onClick={() => onChange(surah.number)}
                className="flex items-center gap-1.5 ps-3 pe-1 py-1.5"
                data-testid={`sleep-surah-pill-${surah.number}`}
              >
                <span className="text-xs opacity-60">{surah.number}.</span>
                <span>{language === "ar" ? surah.name : surah.englishName}</span>
              </button>
              <button
                onClick={(e) => handleDownload(surah.number, e)}
                aria-label={
                  isCached
                    ? language === "ar"
                      ? "حذف التسجيل المحفوظ"
                      : "Delete saved recording"
                    : isBusy
                      ? language === "ar"
                        ? "إلغاء التنزيل"
                        : "Cancel download"
                      : language === "ar"
                        ? "تحميل للاستخدام بدون اتصال"
                        : "Download for offline"
                }
                title={
                  isCached
                    ? language === "ar"
                      ? "محفوظة — اضغط للحذف"
                      : "Saved offline — tap to delete"
                    : language === "ar"
                      ? "تحميل للاستخدام بدون اتصال"
                      : "Download for offline"
                }
                data-testid={`sleep-surah-download-${surah.number}`}
                className={`mx-1 my-0.5 flex h-6 w-6 items-center justify-center rounded-full transition-colors group/dl ${
                  isCached
                    ? "bg-emerald-400/20 text-emerald-300 hover:bg-rose-400/20 hover:text-rose-200"
                    : isBusy
                      ? "bg-amber-300/20 text-amber-200"
                      : "bg-white/10 text-white/60 hover:bg-white/20"
                }`}
              >
                {isCached ? (
                  <>
                    {/* Default: ✓ confirms the surah is saved.
                        Hover/focus: 🗑 reveals the destructive action. */}
                    <Check className="h-3 w-3 group-hover/dl:hidden" />
                    <Trash2 className="h-3 w-3 hidden group-hover/dl:inline" />
                  </>
                ) : isBusy ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Download className="h-3 w-3" />
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button
          onClick={() => { setShowAll(!showAll); setQuery(""); }}
          className="flex items-center gap-1 text-xs text-amber-300/70 hover:text-amber-300 transition-colors"
        >
          <ChevronDown className={`h-3 w-3 transition-transform ${showAll ? "rotate-180" : ""}`} />
          {showAll
            ? (language === "ar" ? "إظهار المقترحة فقط" : "Show suggested only")
            : (language === "ar" ? `عرض كل السور (${SURAH_META.length})` : `All ${SURAH_META.length} surahs`)}
        </button>
        {!isOnline && (
          <span className="flex items-center gap-1 text-[0.65rem] text-amber-200/60">
            <WifiOff className="h-3 w-3" />
            {language === "ar" ? "بدون إنترنت" : "Offline"}
          </span>
        )}
      </div>

      {selectedSurah && (
        <p className="text-xs text-white/40">
          {language === "ar" ? "مختارة:" : "Selected:"} {selectedSurah.name} ({selectedSurah.englishName})
          {downloadedSurahs.has(selectedSurah.number) && (
            <span className="ms-2 inline-flex items-center gap-0.5 text-emerald-300/80">
              <Check className="h-3 w-3" />
              {language === "ar" ? "محفوظة" : "saved"}
            </span>
          )}
        </p>
      )}
    </div>
  );
}
