import { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Bookmark, BookmarkCheck, Star, BookOpen, Search, Maximize2, Headphones, MoreVertical, NotebookPen, Loader2 } from "lucide-react";
import { ShareAyahCard } from "@/components/quran/ShareAyahCard";
import AyahActionsSheet from "@/components/quran/AyahActionsSheet";
import { useBookmarks } from "@/hooks/useBookmarks";
import { SearchModal } from "@/components/quran/SearchModal";
import ListeningTab from "@/components/quran/ListeningTab";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { fetchSurahAyahs, fetchSurahList, type Ayah, type SurahMeta } from "@/lib/quran-api";
import { fetchTafsir, type TafsirAyah } from "@/lib/tafsir-api";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useDailyReading } from "@/hooks/useDailyReading";
import { useStreak } from "@/hooks/useStreak";
import { cn, toArabicNumerals, stripBismillah } from "@/lib/utils";
import SurahBottomBar from "@/components/quran/SurahBottomBar";
import { useAudioPlayerState, useAudioPlayerAyah } from "@/hooks/useAudioPlayer";
import { DEFAULT_TAFSIR, TAFSIR_EDITIONS, ENGLISH_TAFSIR_ID } from "@/data/tafsir-editions";
import { DEFAULT_TRANSLATION, TRANSLATION_EDITIONS } from "@/data/translation-editions";
import { HighlightText } from "@/components/HighlightText";
import MushafPageView from "@/components/quran/MushafPageView";
import TafsirSheet from "@/components/quran/TafsirSheet";
import FocusMode from "@/components/quran/FocusMode";
import { useReadingHistory } from "@/hooks/useReadingHistory";
import { useLanguage } from "@/contexts/LanguageContext";
import { getReciterById } from "@/lib/reciters";
import { useReaderPersonalization } from "@/hooks/useReaderPersonalization";
import { useReaderWakeLock } from "@/hooks/useReaderWakeLock";
import { useWbwSurah } from "@/hooks/useWbwSurah";
import { WbwAyahText } from "@/components/quran/WbwAyahText";
import { logger } from "@/lib/logger";

export default function SurahReaderPage() {
  const { id } = useParams<{id: string;}>();
  const surahNumber = Number(id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetAyah = searchParams.get("ayah") ? Number(searchParams.get("ayah")) : null;
  const isListeningMode = searchParams.get("mode") === "listening";

  const [searchOpen, setSearchOpen] = useState(false);
  const [highlightedAyah, setHighlightedAyah] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState<number | null>(null);
  const [goToPageInput, setGoToPageInput] = useState("");
  const [goToPageOpen, setGoToPageOpen] = useState(false);
  const [mushafTargetPage, setMushafTargetPage] = useState<number | null>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const scrollToAyahRef = useRef<((ayahNum: number) => void) | null>(null);
  const currentVisibleAyahRef = useRef<number>(1);
  const highlightClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioPlayer = useAudioPlayerState();
  const { currentAyahInSurah: audioCurrentAyahInSurah } = useAudioPlayerAyah();
  const playingAyahInSurah = audioPlayer.surahNumber === surahNumber ? audioCurrentAyahInSurah : null;

  const { t, language, isRTL } = useLanguage();

  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [surahInfo, setSurahInfo] = useState<SurahMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fontSize] = useLocalStorage<number>("wise-font-size", 24);
  const [, setLastRead] = useLocalStorage<{surah: number; ayah: number; mode: "reading" | "listening"} | null>("wise-last-read", null);
  const [, setLastReading] = useLocalStorage<{surah: number; ayah: number} | null>("wise-last-reading", null);
  const [, setLastListening] = useLocalStorage<{surah: number; ayah: number} | null>("wise-last-listening", null);
  const { isBookmarked: isAyahBookmarked, getNoteFor, toggleBookmark: toggleBookmarkRecord, saveNote, deleteNote } = useBookmarks();
  const [favorites, setFavorites] = useLocalStorage<number[]>("wise-favorite-surahs", []);
  const [actionSheetAyah, setActionSheetAyah] = useState<number | null>(null);
  const [tafsirEdition] = useLocalStorage<string>("wise-tafsir", DEFAULT_TAFSIR);
  const [translationEnabled] = useLocalStorage<boolean>("wise-translation-enabled", false);
  const [translationEdition] = useLocalStorage<string>("wise-translation", DEFAULT_TRANSLATION);
  const [readerMode, setReaderMode] = useLocalStorage<"ayah" | "mushaf">("wise-reader-mode", "ayah");
  const [focusModeActive, setFocusModeActive] = useState(false);
  const { lineHeight, focusLineHeight, readerToneClass, focusPreset, mushafFontClass, wbwEnabled, setWbwEnabled } = useReaderPersonalization();
  const { data: wbwData, supported: wbwSupported } = useWbwSurah(surahNumber, wbwEnabled);
  const [showBismillahGreeting, setShowBismillahGreeting] = useState(false);

  const [activeTab, setActiveTab] = useState<"text" | "tafsir">("text");
  const isMushafActive = !isListeningMode && readerMode === "mushaf" && activeTab === "text";
  useReaderWakeLock(isMushafActive);

  useEffect(() => {
    if (!isMushafActive) return;
    try {
      const now = new Date();
      const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const last = localStorage.getItem("wise-bismillah-greeting-date");
      if (last !== todayKey) {
        localStorage.setItem("wise-bismillah-greeting-date", todayKey);
        setShowBismillahGreeting(true);
        const timer = setTimeout(() => setShowBismillahGreeting(false), 2400);
        return () => clearTimeout(timer);
      }
    } catch { /* ignore */ }
  }, [isMushafActive]);

  const [focusedAyah, setFocusedAyah] = useState<number | null>(null);
  const [tafsirSheetAyah, setTafsirSheetAyah] = useState<number | null>(null);
  const [tafsirSheetOpen, setTafsirSheetOpen] = useState(false);
  const [tafsirAyahs, setTafsirAyahs] = useState<TafsirAyah[]>([]);
  const [tafsirLoading, setTafsirLoading] = useState(false);
  const [tafsirError, setTafsirError] = useState("");
  const [tafsirSearch, setTafsirSearch] = useState("");
  const tafsirEditionRef = useRef(tafsirEdition);

  const [translationAyahs, setTranslationAyahs] = useState<TafsirAyah[]>([]);
  const translationEditionRef = useRef(translationEdition);
  const translationEnabledRef = useRef(translationEnabled);

  const { increment } = useDailyReading();
  const { markActive } = useStreak();
  const { addToHistory } = useReadingHistory();
  const hasTracked = useRef(false);

  // Phase B perf marker — fires on the layout commit immediately
  // following the first time `ayahs` becomes non-empty for this
  // surah. Logs the elapsed time via the dev-gated logger so it's
  // a no-op in production. Reading PerformanceMeasure here gives us
  // a stable number we can compare across builds.
  const perfLoggedRef = useRef(false);
  useLayoutEffect(() => {
    if (perfLoggedRef.current || ayahs.length === 0) return;
    perfLoggedRef.current = true;
    try {
      performance.mark(`reader-mount-end-${surahNumber}`);
      const measure = performance.measure(
        `reader-mount-${surahNumber}`,
        `reader-mount-start-${surahNumber}`,
        `reader-mount-end-${surahNumber}`,
      );
      logger.debug(
        `[perf] reader surah=${surahNumber} ayahs=${ayahs.length} mount=${measure.duration.toFixed(1)}ms`,
      );
    } catch { /* marks may be missing on hot reload */ }
  }, [ayahs, surahNumber]);

  // Reset the perf-logged guard whenever the surah changes so each
  // navigation gets its own measurement.
  useEffect(() => {
    perfLoggedRef.current = false;
  }, [surahNumber]);

  const isFavorite = favorites.includes(surahNumber);
  const effectiveTafsirEdition = language === "en" && tafsirEdition.startsWith("ar.")
    ? ENGLISH_TAFSIR_ID
    : tafsirEdition;
  const editionName = (() => { const ed = TAFSIR_EDITIONS.find((e) => e.id === effectiveTafsirEdition); return language === "en" ? (ed?.nameEn ?? effectiveTafsirEdition) : (ed?.name ?? effectiveTafsirEdition); })();
  const displaySurahName = surahInfo
    ? (language === "ar" ? surahInfo.name : surahInfo.englishName)
    : `${t("surah")} ${language === "ar" ? toArabicNumerals(surahNumber) : surahNumber}`;
  // Tafsir editions are either Arabic (`ar.*`) or English. Direction +
  // alignment must follow the *edition*, not the UI language, otherwise
  // English tafsir reads right-to-left under Arabic UI and Arabic tafsir
  // wraps strangely under English UI.
  const tafsirIsArabic = effectiveTafsirEdition.startsWith("ar.");
  const tafsirDir: "rtl" | "ltr" = tafsirIsArabic ? "rtl" : "ltr";
  const tafsirAlignClass = tafsirIsArabic ? "text-end" : "text-start";

  const tafsirMap = useMemo(() => new Map(tafsirAyahs.map(a => [a.numberInSurah, a])), [tafsirAyahs]);
  const translationMap = useMemo(() => new Map(translationAyahs.map(a => [a.numberInSurah, a])), [translationAyahs]);
  const filteredTafsir = useMemo(() =>
    tafsirSearch.trim()
      ? tafsirAyahs.filter((item) => item.text.includes(tafsirSearch.trim()))
      : tafsirAyahs,
    [tafsirAyahs, tafsirSearch]
  );
  const currentTranslationEdition = TRANSLATION_EDITIONS.find(e => e.id === translationEdition);

  const toggleFavorite = () => {
    if (isFavorite) {
      setFavorites(favorites.filter((n) => n !== surahNumber));
    } else {
      setFavorites([...favorites, surahNumber]);
    }
  };

  useEffect(() => {
    hasTracked.current = false;
    setLoading(true);
    setError("");
    setActiveTab("text");
    setFocusedAyah(null);
    setTafsirAyahs([]);
    setTafsirSearch("");
    setTranslationAyahs([]);
    // Phase B perf marker — captures the time from "user landed on
    // the reader route" through "ayah data committed to React state".
    // The companion measurement runs in a layout effect below so we
    // also include the first paint of the windowed list.
    try { performance.mark(`reader-mount-start-${surahNumber}`); } catch { /* noop */ }
    const controller = new AbortController();
    Promise.all([fetchSurahAyahs(surahNumber, controller.signal), fetchSurahList()]).
    then(([ayahData, surahList]) => {
      if (controller.signal.aborted) return;
      setAyahs(ayahData);
      const info = surahList.find((s) => s.number === surahNumber) || null;
      setSurahInfo(info);
      setLastRead({
        surah: surahNumber,
        ayah: 1,
        mode: isListeningMode ? "listening" : "reading"
      });
      if (isListeningMode) {
        setLastListening({ surah: surahNumber, ayah: 1 });
      } else {
        setLastReading({ surah: surahNumber, ayah: 1 });
      }
      if (info) addToHistory(surahNumber, info.name);
      setLoading(false);
    }).
    catch((err) => {
      if (controller.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) return;
      setError(t("error_loading"));
      setLoading(false);
    });
    return () => controller.abort();
  }, [surahNumber, addToHistory, setLastListening, setLastRead, setLastReading, isListeningMode, t]);

  useEffect(() => {
    if (!loading && ayahs.length > 0 && !hasTracked.current) {
      hasTracked.current = true;
      markActive();
      increment(ayahs.length);
    }
  }, [loading, ayahs.length, markActive, increment]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const targetAyahHandledRef = useRef<string | null>(null);
  const ayahElementsRef = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (loading || ayahs.length === 0 || !targetAyah) return;
    // Key the guard by surah+ayah so navigating between surahs with the
    // same ?ayah=N still triggers the scroll.
    const handledKey = `${surahNumber}:${targetAyah}`;
    if (targetAyahHandledRef.current === handledKey) return;
    targetAyahHandledRef.current = handledKey;

    // One frame is enough for the virtualizer to measure the initial
    // range. If the row still isn't mounted, `requestAnimationFrame`
    // retries until it is — no arbitrary timeouts.
    const tryScroll = () => {
      const idx = ayahs.findIndex((a) => a.numberInSurah === targetAyah);
      if (idx < 0) return;
      // Mushaf mode: scroll the real DOM node (registered via setAyahRef).
      const el = ayahElementsRef.current.get(targetAyah);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      } else {
        scrollToAyahRef.current?.(targetAyah);
      }
      setHighlightedAyah(targetAyah);
      setTimeout(() => setHighlightedAyah(null), 2000);
    };
    const raf = requestAnimationFrame(tryScroll);
    return () => cancelAnimationFrame(raf);
    // surahNumber must be in deps so navigating between surahs (when
    // the component is reused) re-runs the scroll for the new surah's
    // target ayah. The `targetAyahHandledRef` guard above keys on
    // `${surahNumber}:${targetAyah}` so the same ayah isn't re-scrolled.
  }, [loading, ayahs, targetAyah, surahNumber]);

  const setAyahRef = useCallback((el: HTMLDivElement | null, num: number) => {
    if (el) ayahElementsRef.current.set(num, el);
    else ayahElementsRef.current.delete(num);
  }, []);

  const navigateToAyah = useCallback((ayahNum: number) => {
    const distance = Math.abs(ayahNum - currentVisibleAyahRef.current);
    scrollToAyahRef.current?.(ayahNum);
    if (distance > 10) {
      if (highlightClearTimerRef.current) clearTimeout(highlightClearTimerRef.current);
      setHighlightedAyah(ayahNum);
      highlightClearTimerRef.current = setTimeout(() => {
        setHighlightedAyah(null);
        highlightClearTimerRef.current = null;
      }, 1800);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (highlightClearTimerRef.current) clearTimeout(highlightClearTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (playingAyahInSurah && readerMode === "ayah") {
      navigateToAyah(playingAyahInSurah);
    }
  }, [playingAyahInSurah, readerMode, navigateToAyah]);

  useEffect(() => {
    if (activeTab !== "tafsir") return;
    if (tafsirEditionRef.current !== effectiveTafsirEdition) {
      setTafsirAyahs([]);
      tafsirEditionRef.current = effectiveTafsirEdition;
    }
    if (tafsirAyahs.length > 0 && tafsirEditionRef.current === effectiveTafsirEdition) return;

    setTafsirLoading(true);
    setTafsirError("");
    const controller = new AbortController();
    fetchTafsir(surahNumber, effectiveTafsirEdition, controller.signal).
    then((data) => {
      if (controller.signal.aborted) return;
      setTafsirAyahs(data);
      setTafsirLoading(false);
    }).
    catch((err) => {
      if (controller.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) return;
      setTafsirError(t("error_loading"));
      setTafsirLoading(false);
    });
    return () => controller.abort();
  }, [activeTab, surahNumber, effectiveTafsirEdition, tafsirAyahs.length, t]);

  useEffect(() => {
    if (!translationEnabled) {
      setTranslationAyahs([]);
      return;
    }
    const editionChanged = translationEditionRef.current !== translationEdition;
    const enabledChanged = translationEnabledRef.current !== translationEnabled;
    translationEditionRef.current = translationEdition;
    translationEnabledRef.current = translationEnabled;
    if (!editionChanged && !enabledChanged && translationAyahs.length > 0) return;

    const controller = new AbortController();
    fetchTafsir(surahNumber, translationEdition, controller.signal).
      then((data) => {
        if (!controller.signal.aborted) setTranslationAyahs(data);
      }).
      catch((err) => {
        if (controller.signal.aborted) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
      });
    return () => controller.abort();
  }, [translationEnabled, translationEdition, surahNumber, translationAyahs.length]);

  const isBookmarked = (ayahNum: number) => isAyahBookmarked(surahNumber, ayahNum);

  const ayahSnapshot = useCallback(
    (ayahNum: number) => {
      const a = ayahs.find((x) => x.numberInSurah === ayahNum);
      return {
        ayahText: a?.text ?? "",
        surahName: displaySurahName,
      };
    },
    [ayahs, displaySurahName],
  );

  const toggleBookmark = (ayahNum: number) => {
    const snap = ayahSnapshot(ayahNum);
    void toggleBookmarkRecord({
      surah: surahNumber,
      ayah: ayahNum,
      ayahText: snap.ayahText,
      surahName: snap.surahName,
    });
  };

  const hasNote = (ayahNum: number) => getNoteFor(surahNumber, ayahNum).length > 0;

  const handleAyahTafsir = (ayahNum: number) => {
    setTafsirSheetAyah(ayahNum);
    setTafsirSheetOpen(true);
  };

  const currentReciterName = (() => { const r = getReciterById(audioPlayer.reciterId); return language === "en" && r.nameEn ? r.nameEn : r.name; })();

  const parentOffsetRef = useRef(0);
  const tafsirListRef = useRef<HTMLDivElement>(null);
  const tafsirParentOffsetRef = useRef(0);
  useLayoutEffect(() => {
    parentOffsetRef.current = listRef.current?.offsetTop ?? 0;
    tafsirParentOffsetRef.current = tafsirListRef.current?.offsetTop ?? 0;
  });

  const rowVirtualizer = useWindowVirtualizer({
    count: ayahs.length,
    estimateSize: () => 170,
    overscan: 5,
    scrollMargin: parentOffsetRef.current,
  });

  const tafsirVirtualizer = useWindowVirtualizer({
    count: activeTab === "tafsir" && focusedAyah === null ? filteredTafsir.length : 0,
    estimateSize: () => 250,
    overscan: 3,
    scrollMargin: tafsirParentOffsetRef.current,
  });

  const tafsirScrollToAyahRef = useRef<((ayahNum: number) => void) | null>(null);
  useEffect(() => {
    tafsirScrollToAyahRef.current = (ayahNum: number) => {
      const idx = filteredTafsir.findIndex((a) => a.numberInSurah === ayahNum);
      if (idx >= 0) {
        tafsirVirtualizer.scrollToIndex(idx, { align: "start", behavior: "smooth" });
      }
    };
  });

  useEffect(() => {
    scrollToAyahRef.current = (ayahNum: number) => {
      const idx = ayahs.findIndex((a) => a.numberInSurah === ayahNum);
      if (idx >= 0) {
        rowVirtualizer.scrollToIndex(idx, { align: "center", behavior: "smooth" });
      }
    };
  });

  useEffect(() => {
    if (loading || ayahs.length === 0) return;
    const range = rowVirtualizer.range;
    if (!range) return;
    const midIdx = Math.floor((range.startIndex + range.endIndex) / 2);
    const midAyah = ayahs[midIdx];
    if (!midAyah) return;
    if (midAyah.page) setCurrentPage(midAyah.page);
    const ayahNum = midAyah.numberInSurah;
    currentVisibleAyahRef.current = ayahNum;
    setLastRead({ surah: surahNumber, ayah: ayahNum, mode: isListeningMode ? "listening" : "reading" });
    if (isListeningMode) {
      setLastListening({ surah: surahNumber, ayah: ayahNum });
    } else {
      setLastReading({ surah: surahNumber, ayah: ayahNum });
    }
  }, [rowVirtualizer.range, loading, ayahs, surahNumber, isListeningMode, setLastRead, setLastListening, setLastReading]);

  return (
    <div className={cn("min-h-screen overflow-x-hidden", isListeningMode ? "pb-surah-listening" : "pb-surah-reader")}>
      <AnimatePresence>
        {showBismillahGreeting && !isListeningMode && (
          <motion.div
            key="bismillah-greeting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-sm pointer-events-none"
            aria-hidden="true"
          >
            <motion.p
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="font-arabic text-3xl sm:text-4xl text-gradient text-center px-6"
            >
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="sticky top-0 z-10 glass-subtle border-b border-border/50">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 py-3 pb-[5px] pt-[12px]">
          <div className="flex min-w-0 items-center gap-1.5 justify-self-start">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate(-1)}
              data-testid="surah-reader-back-button"
              className="rounded-xl p-2.5 hover:bg-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0">
              <ArrowRight className="h-5 w-5" />
            </motion.button>
            {/* Page indicator in header — only in reading mode */}
            {!isListeningMode && currentPage && activeTab === "text" && (() => {
              const surahPages = ayahs.filter((a) => a.page).map((a) => a.page!);
              const minPage = surahPages.length > 0 ? Math.min(...surahPages) : null;
              const maxPage = surahPages.length > 0 ? Math.max(...surahPages) : null;
              return (
                <Popover open={goToPageOpen} onOpenChange={setGoToPageOpen}>
                <PopoverTrigger asChild>
                  <button
                    data-testid="surah-reader-page-indicator-button"
                    className="min-w-[8.5rem] max-w-[11rem] rounded-md bg-primary/10 px-2 py-1 text-[0.6875rem] font-bold text-primary hover:bg-primary/20 transition-colors min-h-[44px] flex items-center justify-center text-center whitespace-nowrap shrink-0"
                  >
                    {language === "ar" ? `صفحة ${toArabicNumerals(currentPage)}` : `${t("page")} ${currentPage}`}
                    {minPage && maxPage && minPage !== maxPage &&
                      <span className="text-primary/60 me-1 tabular-nums">
                        {language === "ar" ? `(${toArabicNumerals(minPage)}–${toArabicNumerals(maxPage)})` : `(${minPage}–${maxPage})`}
                      </span>
                      }
                  </button>
                </PopoverTrigger>
                <PopoverContent side="bottom" align="start" className="w-56 p-3" dir={isRTL ? "rtl" : "ltr"}>
                  <p className="text-xs font-medium text-foreground mb-2">{t("go_to_page")}</p>
                  <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const pageNum = Number(goToPageInput);
                        if (!pageNum || pageNum < 1 || pageNum > 604) {
                          toast({ title: t("invalid_page"), description: t("page_range_hint").replace("{min}", language === "ar" ? toArabicNumerals(1) : "1").replace("{max}", language === "ar" ? toArabicNumerals(604) : "604") });
                          return;
                        }
                        const surahPages = ayahs.filter((a) => a.page).map((a) => a.page!);
                        const minPage = Math.min(...surahPages);
                        const maxPage = Math.max(...surahPages);
                        if (pageNum < minPage || pageNum > maxPage) {
                          toast({
                            title: t("page_out_of_range"),
                            description: language === "ar"
                              ? `هذه السورة تقع في الصفحات ${toArabicNumerals(minPage)} - ${toArabicNumerals(maxPage)}`
                              : `This surah is on pages ${minPage} - ${maxPage}`
                          });
                          return;
                        }
                        if (readerMode === "mushaf") {
                          setMushafTargetPage(null);
                          setTimeout(() => setMushafTargetPage(pageNum), 0);
                        } else {
                          const targetAyahOnPage = ayahs.find((a) => a.page === pageNum);
                          if (targetAyahOnPage) {
                            navigateToAyah(targetAyahOnPage.numberInSurah);
                          }
                        }
                        setGoToPageInput("");
                        setGoToPageOpen(false);
                      }}
                      className="flex gap-2">
                    <Input
                        type="number"
                        min={1}
                        max={604}
                        value={goToPageInput}
                        onChange={(e) => setGoToPageInput(e.target.value)}
                        placeholder={language === "ar" ? "رقم الصفحة" : "Page number"}
                        className="text-center text-sm h-8"
                        autoFocus />
                    <button
                        type="submit"
                        className="shrink-0 rounded-md bg-primary px-3 h-11 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                      {t("go")}
                    </button>
                  </form>
                </PopoverContent>
              </Popover>);
            })()}
          </div>
          <div className="min-w-0 px-1 text-center">
            <h1 className="font-arabic text-xl font-bold truncate" data-testid="surah-reader-surah-title">
              {surahInfo ? (language === "ar" ? surahInfo.name : surahInfo.englishName) : `${t("surah")} ${surahNumber}`}
            </h1>
            <p className="text-[0.6875rem] text-muted-foreground truncate" data-testid="surah-reader-surah-meta">
              {surahInfo &&
              <span>{language === "ar" ? toArabicNumerals(surahInfo.numberOfAyahs) : surahInfo.numberOfAyahs} {t("ayah")} · {surahInfo.revelationType === "Meccan" ? t("revelation_meccan") : t("revelation_medinan")}</span>
              }
            </p>
          </div>
          <div className="flex min-w-0 items-center gap-0.5 justify-self-end">
            {/* Focus mode — reading only */}
            {!isListeningMode && (
              <button
                onClick={() => setFocusModeActive(true)}
                data-testid="surah-reader-focus-mode-button"
                className="rounded-lg p-2.5 transition-colors text-muted-foreground hover:bg-muted min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
                title="وضع التركيز">
                <Maximize2 className="h-4 w-4" />
              </button>
            )}
            {/* Mushaf toggle — reading only */}
            {!isListeningMode && (
              <button
                onClick={() => setReaderMode(readerMode === "ayah" ? "mushaf" : "ayah")}
                data-testid="surah-reader-toggle-mushaf-button"
                className={cn(
                  "rounded-lg p-2.5 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0",
                  readerMode === "mushaf" ? "text-primary" : "text-muted-foreground hover:bg-muted"
                )}
                title={readerMode === "ayah" ? "عرض المصحف" : "عرض الآيات"}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></svg>
              </button>
            )}
            {/* Listening mode indicator pill */}
            {isListeningMode && (
              <div className="hidden items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 border border-amber-500/20 sm:flex max-w-[8.5rem] shrink" data-testid="surah-reader-reciter-pill">
                <Headphones className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                <span className="text-[0.6875rem] font-semibold text-amber-700 dark:text-amber-400 truncate max-w-[80px]">
                  {currentReciterName}
                </span>
              </div>
            )}
            <button
              onClick={() => setSearchOpen(true)}
              data-testid="surah-reader-search-button"
              className="rounded-lg p-2.5 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:bg-muted shrink-0"
              title={language === "ar" ? "بحث في السورة" : "Search surah"}
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              onClick={toggleFavorite}
              data-testid="surah-reader-favorite-button"
              className={cn("rounded-lg p-2.5 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0", isFavorite ? "text-primary" : "text-muted-foreground hover:bg-muted")}>
              <Star className={cn("h-4 w-4", isFavorite && "fill-primary")} />
            </button>
          </div>
        </div>

        {/* Tab switcher — reading mode only */}
        {!isListeningMode && (
          <div className="flex justify-center px-3 pt-1 pb-[4px]" dir={isRTL ? "rtl" : "ltr"}>
            <div className="flex gap-1 p-1 rounded-2xl bg-muted/50 border-2 w-full">
              <button
                onClick={() => {setActiveTab("text");setFocusedAyah(null);}}
                className={cn("flex-1 rounded-xl px-2 py-2.5 text-xs font-semibold transition-all border min-h-[44px]",
                activeTab === "text" ?
                "bg-card text-foreground shadow-soft" :
                "text-muted-foreground hover:text-foreground border-transparent"
                )}>
                {t("text_tab")}
              </button>
              <button
                onClick={() => setActiveTab("tafsir")}
                className={cn("flex-1 rounded-xl px-2 py-2.5 text-xs font-semibold transition-all border min-h-[44px]",
                activeTab === "tafsir" ?
                "bg-card text-foreground shadow-soft" :
                "text-muted-foreground hover:text-foreground border-transparent"
                )}>
                {t("tafsir_tab")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-6 pt-[10px]">

        {/* ===== LISTENING MODE ===== */}
        {isListeningMode ? (
          !loading && ayahs.length > 0 ? (
            <ListeningTab surahNumber={surahNumber} surahName={displaySurahName} ayahs={ayahs} translationAyahs={translationAyahs} />
          ) : loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) =>
                <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
              )}
            </div>
          ) : (
            <div className="rounded-xl bg-destructive/10 p-6 text-center">
              <p className="text-destructive">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">
                إعادة المحاولة
              </button>
            </div>
          )
        ) : (

        /* ===== READING MODE ===== */
        loading ?
        <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) =>
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          )}
          </div> :
        error ?
        <div className="rounded-xl bg-destructive/10 p-6 text-center">
            <p className="text-destructive">{error}</p>
            <button
            onClick={() => window.location.reload()}
            className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">
              إعادة المحاولة
            </button>
          </div> :
        activeTab === "text" ? (
        /* ===== Text Tab ===== */
        <>
            {/* Reading progress bar */}
            {ayahs.length > 0 && currentPage && (() => {
              const surahPages = ayahs.filter((a) => a.page).map((a) => a.page!);
              const minPage = surahPages.length > 0 ? Math.min(...surahPages) : currentPage;
              const maxPage = surahPages.length > 0 ? Math.max(...surahPages) : currentPage;
              const totalPages = maxPage - minPage + 1;
              const currentOffset = currentPage - minPage;
              const pct = totalPages > 1 ? Math.round((currentOffset / (totalPages - 1)) * 100) : 100;
              return (
                <div className="mb-4 rounded-2xl bg-card border border-border/50 p-3 shadow-soft" dir={isRTL ? "rtl" : "ltr"}>
                  <div className="flex items-center justify-between mb-2 text-xs">
                    <span className="font-semibold text-muted-foreground">{t("reading_progress")}</span>
                    <span className="font-bold text-primary">{language === "ar" ? toArabicNumerals(pct) : pct}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-primary"
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <p className="text-[0.625rem] text-muted-foreground mt-1.5 text-center">
                    {language === "ar" ? `صفحة ${toArabicNumerals(currentPage)} من ${toArabicNumerals(maxPage)}` : `Page ${currentPage} of ${maxPage}`}
                  </p>
                </div>
              );
            })()}
            {/* Mushaf / Ayah view toggle */}
            <div className="mb-4 flex gap-2 p-1 rounded-2xl bg-muted/50 border border-border/30" dir={isRTL ? "rtl" : "ltr"}>
              <button
                onClick={() => setReaderMode("ayah")}
                className={cn(
                  "flex-1 rounded-xl py-2 text-xs font-semibold transition-all min-h-[44px] flex items-center justify-center",
                  readerMode === "ayah" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t("ayah_view")}
              </button>
              <button
                onClick={() => setReaderMode("mushaf")}
                className={cn(
                  "flex-1 rounded-xl py-2 text-xs font-semibold transition-all min-h-[44px] flex items-center justify-center",
                  readerMode === "mushaf" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t("mushaf_view")}
              </button>
            </div>

            {/* Word-by-word toggle (per-reader; persisted globally) */}
            <div className="mb-4" dir={isRTL ? "rtl" : "ltr"}>
              <button
                type="button"
                onClick={() => setWbwEnabled(!wbwEnabled)}
                data-testid="surah-reader-wbw-toggle"
                aria-pressed={wbwEnabled}
                className={cn(
                  "w-full rounded-2xl border px-3 py-2.5 text-xs font-semibold transition-colors flex items-center justify-between gap-3 min-h-[44px]",
                  wbwEnabled
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/40 bg-muted/30 text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="flex items-center gap-2">
                  <span className="font-arabic text-sm">ك</span>
                  <span>{t("wbw_toggle_label")}</span>
                </span>
                <span
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
                    wbwEnabled ? "bg-primary" : "bg-muted-foreground/30"
                  )}
                  aria-hidden="true"
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 rounded-full bg-card shadow transition-transform",
                      wbwEnabled ? (isRTL ? "-translate-x-4" : "translate-x-4") : "translate-x-0.5"
                    )}
                  />
                </span>
              </button>
              {wbwEnabled && !wbwSupported && (
                <p className="mt-1.5 text-[0.6875rem] text-muted-foreground text-center" data-testid="surah-reader-wbw-not-supported">
                  {t("wbw_not_supported")}
                </p>
              )}
            </div>

            {surahNumber !== 1 && surahNumber !== 9 &&
          <div className="ornamental-divider mb-8 px-4">
                <p
              className="shrink-0 font-arabic text-muted-foreground"
              style={{ fontSize: fontSize * 0.85 }}>
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </p>
              </div>
          }

            {readerMode === "mushaf" ?
          <MushafPageView
            ayahs={ayahs}
            fontSize={fontSize}
            lineHeight={lineHeight}
            readerToneClass={readerToneClass}
            mushafFontClass={mushafFontClass}
            surahNumber={surahNumber}
            highlightedAyah={highlightedAyah}
            playingAyah={null}
            isBookmarked={isBookmarked}
            hasNote={hasNote}
            toggleBookmark={toggleBookmark}
            onAyahTafsir={handleAyahTafsir}
            onAyahMore={(ayahNum) => setActionSheetAyah(ayahNum)}
            setAyahRef={setAyahRef}
            targetPage={mushafTargetPage}
            onPageChange={(page) => setCurrentPage(page)}
            onSeekToAyah={() => {}}
            wbwEnabled={wbwEnabled} /> :

          <ol
                ref={listRef as React.RefObject<HTMLOListElement>}
                role="list"
                aria-label={language === "ar" ? `آيات ${displaySurahName}` : `${displaySurahName} ayahs`}
                style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative", listStyle: "none", padding: 0, margin: 0 }}
                dir={isRTL ? "rtl" : "ltr"}>
                {rowVirtualizer.getVirtualItems().map((virtualItem) => {
              const ayah = ayahs[virtualItem.index];
              const i = virtualItem.index;
              const showPageSep = i > 0 && ayah.page && ayahs[i - 1]?.page && ayah.page !== ayahs[i - 1].page;
              return (
                <div
                      key={ayah.number}
                      data-index={virtualItem.index}
                      ref={rowVirtualizer.measureElement}
                      style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualItem.start - rowVirtualizer.options.scrollMargin}px)`,
                    paddingBottom: "12px",
                  }}>
                      {showPageSep &&
                  <div className="flex items-center gap-3 py-2 text-muted-foreground">
                          <div className="h-px flex-1 bg-border" />
                          <span className="text-xs font-medium">{language === "ar" ? `صفحة ${toArabicNumerals(ayah.page!)}` : `${t("page")} ${ayah.page}`}</span>
                          <div className="h-px flex-1 bg-border" />
                        </div>
                  }
                      <article
                    id={`ayah-${ayah.numberInSurah}`}
                    data-ayah={ayah.numberInSurah}
                    role="listitem"
                    aria-label={
                      language === "ar"
                        ? `${displaySurahName} الآية ${toArabicNumerals(ayah.numberInSurah)}`
                        : `${displaySurahName}, ayah ${ayah.numberInSurah}`
                    }
                    className={cn("group relative rounded-2xl bg-card shadow-soft border border-border/50 transition-all duration-300 pt-[5px] pb-[5px] ps-[10px] pe-[10px]",
                    highlightedAyah === ayah.numberInSurah && "ring-2 ring-primary/50 bg-primary/5 shadow-glow",
                    playingAyahInSurah === ayah.numberInSurah && "ring-1 ring-primary/30"
                    )}>
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => toggleBookmark(ayah.numberInSurah)}
                          className="rounded-xl p-2 transition-colors hover:bg-muted min-h-[44px] min-w-[44px] flex items-center justify-center">
                              {isBookmarked(ayah.numberInSurah) ?
                          <BookmarkCheck className="h-4 w-4 text-gold" /> :
                          <Bookmark className="h-4 w-4 text-muted-foreground opacity-30 transition-opacity group-hover:opacity-100" />
                          }
                            </motion.button>
                            <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleAyahTafsir(ayah.numberInSurah)}
                          className="rounded-xl p-2 transition-colors hover:bg-muted text-muted-foreground opacity-30 group-hover:opacity-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
                          title={t("tafsir_tab")}>
                              <BookOpen className="h-4 w-4" />
                            </motion.button>
                            <ShareAyahCard
                          ayahText={ayah.text}
                          surahName={displaySurahName}
                          ayahNumber={ayah.numberInSurah}
                          surahNumber={surahNumber} />
                            <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setActionSheetAyah(ayah.numberInSurah)}
                          data-testid={`ayah-more-button-${ayah.numberInSurah}`}
                          className={cn(
                            "rounded-xl p-2 transition-colors hover:bg-muted min-h-[44px] min-w-[44px] flex items-center justify-center",
                            hasNote(ayah.numberInSurah)
                              ? "text-primary"
                              : "text-muted-foreground opacity-30 group-hover:opacity-100",
                          )}
                          title={language === "ar" ? "المزيد" : "More"}>
                              {hasNote(ayah.numberInSurah) ? (
                                <NotebookPen className="h-4 w-4" />
                              ) : (
                                <MoreVertical className="h-4 w-4" />
                              )}
                            </motion.button>
                          </div>
                          <div className="number-badge h-8 w-8 text-xs">
                            {language === "ar" ? toArabicNumerals(ayah.numberInSurah) : ayah.numberInSurah}
                          </div>
                        </div>
                        <p
                      className={cn("font-arabic", readerToneClass)}
                      style={{ fontSize, lineHeight }}>
                          {(() => {
                            const wbwWords = wbwEnabled ? wbwData?.ayahs[String(ayah.numberInSurah)] : undefined;
                            if (wbwWords && wbwWords.length > 0) {
                              return <WbwAyahText ayahNumber={ayah.numberInSurah} words={wbwWords} />;
                            }
                            return stripBismillah(ayah.text, surahNumber, ayah.numberInSurah);
                          })()}
                        </p>
                        {translationEnabled && translationAyahs.length > 0 && (() => {
                          const tAyah = translationMap.get(ayah.numberInSurah);
                          if (!tAyah) return null;
                          const edition = currentTranslationEdition;
                          return (
                            <p
                              className="mt-2 border-t border-border/30 pt-2 text-sm text-muted-foreground leading-relaxed"
                              dir={edition?.dir ?? "ltr"}
                              style={{ textAlign: edition?.dir === "rtl" ? "right" : "left" }}>
                              {tAyah.text}
                            </p>
                          );
                        })()}
                        {hasNote(ayah.numberInSurah) && (
                          <button
                            type="button"
                            onClick={() => setActionSheetAyah(ayah.numberInSurah)}
                            data-testid={`ayah-note-preview-${ayah.numberInSurah}`}
                            className="mt-2 flex w-full items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-start text-xs text-foreground/90 hover:bg-primary/10 transition-colors"
                          >
                            <NotebookPen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                            <span className="line-clamp-2 flex-1">{getNoteFor(surahNumber, ayah.numberInSurah)}</span>
                          </button>
                        )}
                      </article>
                    </div>);
            })}
              </ol>
          }
          </>) : (

        /* ===== Tafsir Tab ===== */
        <div dir={isRTL ? "rtl" : "ltr"}>
            {tafsirLoading ?
          <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div> :
          tafsirError ?
          <div className="rounded-xl bg-destructive/10 p-6 text-center">
                <p className="text-destructive text-sm">{tafsirError}</p>
              </div> :
          focusedAyah !== null ? (
          /* Single ayah tafsir */
          <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <h2 className="font-arabic text-base font-bold text-foreground">
                      {t("tafsir_tab")} {t("ayah")} {language === "ar" ? toArabicNumerals(focusedAyah) : focusedAyah}
                    </h2>
                  </div>
                  <span className="text-xs text-muted-foreground">{editionName}</span>
                </div>

                <div className="rounded-xl bg-card p-5 shadow-sm border border-border">
                  <p
                className="font-arabic text-foreground/90 leading-[2.2]"
                style={{ fontSize: 18 }}>
                    {tafsirMap.get(focusedAyah)?.text ||
                t("no_tafsir")}
                  </p>
                  {language === "en" && translationAyahs.length > 0 && (() => {
                    const tAyah = translationMap.get(focusedAyah);
                    if (!tAyah) return null;
                    return (
                      <p className="mt-3 border-t border-border/30 pt-3 text-sm text-muted-foreground leading-relaxed" dir="ltr" style={{ textAlign: "left" }}>
                        {tAyah.text}
                      </p>
                    );
                  })()}
                </div>

                <button
              onClick={() => setFocusedAyah(null)}
              className="text-sm text-primary hover:underline">
                  {language === "ar" ? "← عرض تفسير السورة بالكامل" : `← ${t("show_full_tafsir")}`}
                </button>
              </div>) : (

          /* Full surah tafsir */
          <div className="space-y-5">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <h2 className="font-arabic text-base font-bold text-foreground">{t("tafsir_tab")} {t("surah")}</h2>
                  <span className="text-xs text-muted-foreground me-auto">{editionName}</span>
                </div>
                {language === "en" && tafsirEdition.startsWith("ar.") && (
                  <p className="text-xs text-primary/70 -mt-2 mb-2">{t("tafsir_english_note")}</p>
                )}

                {/* Ayah picker + Search input */}
                <div className="flex gap-2 mb-2">
                  <Select
                value=""
                onValueChange={(val) => tafsirScrollToAyahRef.current?.(Number(val))}>
                    <SelectTrigger className="w-40 shrink-0 text-end">
                      <SelectValue placeholder={language === "ar" ? "انتقل إلى آية..." : t("jump_to_ayah")} />
                    </SelectTrigger>
                    <SelectContent>
                      {tafsirAyahs.map((tafsirItem) =>
                  <SelectItem key={tafsirItem.numberInSurah} value={String(tafsirItem.numberInSurah)}>
                          {t("ayah")} {language === "ar" ? toArabicNumerals(tafsirItem.numberInSurah) : tafsirItem.numberInSurah}
                        </SelectItem>
                  )}
                    </SelectContent>
                  </Select>
                  <div className="relative flex-1">
                    <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                  placeholder={t("search")}
                  value={tafsirSearch}
                  onChange={(e) => setTafsirSearch(e.target.value)}
                  className="pe-10 text-end"
                  dir={isRTL ? "rtl" : "ltr"} />
                  </div>
                </div>

                {filteredTafsir.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    لا توجد نتائج لـ "{tafsirSearch}"
                  </p>
                ) : (
                  <div
                    ref={tafsirListRef}
                    style={{ height: `${tafsirVirtualizer.getTotalSize()}px`, position: "relative" }}
                  >
                    {tafsirVirtualizer.getVirtualItems().map((virtualItem) => {
                      const tafsirItem = filteredTafsir[virtualItem.index];
                      return (
                        <div
                          key={tafsirItem.numberInSurah}
                          data-index={virtualItem.index}
                          ref={tafsirVirtualizer.measureElement}
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            transform: `translateY(${virtualItem.start - tafsirVirtualizer.options.scrollMargin}px)`,
                            paddingBottom: "20px",
                          }}
                        >
                          <div className="rounded-xl bg-card p-4 shadow-sm border border-border" dir={tafsirDir}>
                            <div className="mb-2 flex items-center gap-2">
                              <span className="flex h-6 w-6 rotate-45 items-center justify-center rounded-sm bg-primary/10">
                                <span className="-rotate-45 text-[0.625rem] font-bold text-primary">
                                  {language === "ar" ? toArabicNumerals(tafsirItem.numberInSurah) : tafsirItem.numberInSurah}
                                </span>
                              </span>
                              <span className="text-xs text-muted-foreground">{t("ayah")} {language === "ar" ? toArabicNumerals(tafsirItem.numberInSurah) : tafsirItem.numberInSurah}</span>
                            </div>
                            <p
                              className={cn(tafsirIsArabic ? "font-arabic" : "", "text-foreground/90 leading-[2.2]", tafsirAlignClass)}
                              style={{ fontSize: 17 }}>
                              <HighlightText text={tafsirItem.text} highlight={tafsirSearch.trim()} />
                            </p>
                            {language === "en" && translationAyahs.length > 0 && (() => {
                              const tAyah = translationMap.get(tafsirItem.numberInSurah);
                              if (!tAyah) return null;
                              return (
                                <p className="mt-2 border-t border-border/30 pt-2 text-sm text-muted-foreground leading-relaxed" dir="ltr" style={{ textAlign: "left" }}>
                                  {tAyah.text}
                                </p>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>)
          }
          </div>)
        )}
      </div>


      {/* Focus Mode Overlay — reading mode only */}
      {!isListeningMode && (
        <AnimatePresence>
          {focusModeActive && ayahs.length > 0 &&
          <FocusMode
            ayahs={ayahs}
            fontSize={fontSize}
            lineHeight={focusLineHeight}
            readerToneClass={readerToneClass}
            focusPreset={focusPreset}
            surahNumber={surahNumber}
            surahName={displaySurahName}
            playingAyah={null}
            onSeekToAyah={() => {}}
            onClose={() => setFocusModeActive(false)} />
          }
        </AnimatePresence>
      )}

      {/* Ayah actions sheet (bookmark / note / share) */}
      {actionSheetAyah !== null && (() => {
        const snap = ayahSnapshot(actionSheetAyah);
        return (
          <AyahActionsSheet
            open
            onOpenChange={(o) => { if (!o) setActionSheetAyah(null); }}
            surah={surahNumber}
            ayah={actionSheetAyah}
            ayahText={snap.ayahText}
            surahName={snap.surahName}
            isBookmarked={isBookmarked(actionSheetAyah)}
            note={getNoteFor(surahNumber, actionSheetAyah)}
            onToggleBookmark={() => toggleBookmark(actionSheetAyah)}
            onSaveNote={(note) =>
              saveNote({
                surah: surahNumber,
                ayah: actionSheetAyah,
                ayahText: snap.ayahText,
                surahName: snap.surahName,
                note,
              })
            }
            onDeleteNote={() => deleteNote(surahNumber, actionSheetAyah)}
          />
        );
      })()}

      {/* Per-ayah Tafsir bottom sheet */}
      <TafsirSheet
        open={tafsirSheetOpen}
        onOpenChange={setTafsirSheetOpen}
        surahNumber={surahNumber}
        surahName={displaySurahName}
        ayahNumber={tafsirSheetAyah}
        ayahText={tafsirSheetAyah !== null ? ayahs.find((a) => a.numberInSurah === tafsirSheetAyah)?.text : undefined}
        editionId={effectiveTafsirEdition}
      />

      {/* Global Quran Search Modal */}
      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        ayahs={ayahs}
        surahNumber={surahNumber}
        translationAyahs={translationAyahs}
        language={language}
        onScrollToAyah={navigateToAyah}
      />
    </div>);
}
