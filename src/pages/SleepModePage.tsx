import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, X, Volume2, Clock, ChevronDown, ChevronUp, AlertCircle, Download, Check, Loader2, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { MoonAnimation } from "@/components/sleep/MoonAnimation";
import { StarField } from "@/components/sleep/StarField";
import { CircularTimer } from "@/components/sleep/CircularTimer";
import { SurahSelectorForSleep } from "@/components/sleep/SurahSelectorForSleep";
import { useSleepModePlayer } from "@/hooks/useSleepModePlayer";
import { RECITERS } from "@/lib/reciters";
import { SURAH_META } from "@/data/surah-meta";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatTime, toArabicNumerals } from "@/lib/utils";
import { downloadSurahAudio } from "@/lib/quran-audio";
import { getDownloadedAudioMap } from "@/lib/db";
import { requestPersistentStorageWithToast } from "@/lib/storage-persist";

const TIMER_PRESETS = [10, 15, 20, 30, 45, 60];

type SettingsPanel = "timer" | "reciter" | "surah" | "volume" | null;


export default function SleepModePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, t } = useLanguage();
  const [activePanel, setActivePanel] = useState<SettingsPanel>(null);
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem("wise-sleep-welcome-seen"));

  const {
    prefs,
    setPrefs,
    isPlaying,
    isLoading,
    hasError,
    isOfflineUncached,
    remainingSeconds,
    audioCurrentTime,
    audioDuration,
    togglePlay,
    stop,
  } = useSleepModePlayer();

  // Per-reciter set of surah numbers that already live in IndexedDB.
  // Drives the "saved offline" check marks in the surah picker and the
  // "X / 114 downloaded" counter in the reciter panel.
  const [downloadedByReciter, setDownloadedByReciter] = useState<Map<string, Set<number>>>(new Map());
  const [bulkProgress, setBulkProgress] = useState<{ reciterId: string; done: number; total: number } | null>(null);
  const bulkAbortRef = useRef<AbortController | null>(null);
  const [isOnline, setIsOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);

  const refreshDownloads = useCallback(async () => {
    // Key-only IDB scan — never loads blob payloads. Safe to call
    // repeatedly during a 114-surah bulk download on mobile.
    const grouped = await getDownloadedAudioMap();
    setDownloadedByReciter(grouped);
  }, []);

  useEffect(() => {
    void refreshDownloads();
  }, [refreshDownloads]);

  // Unmount cleanup: abort any in-flight bulk download when the user
  // navigates away from Sleep Mode. Without this, the serial 114-surah
  // loop would keep running in the background and resolve into stale
  // toast/state updates after the page is gone.
  useEffect(() => {
    return () => {
      bulkAbortRef.current?.abort();
      bulkAbortRef.current = null;
    };
  }, []);

  // Track online/offline so the empty-state and bulk-download UI react to
  // the user re-connecting without requiring a manual refresh.
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

  useEffect(() => {
    const state = location.state as { surahNumber?: number; reciterId?: string } | null;
    if (state?.surahNumber) setPrefs({ surahNumber: state.surahNumber });
    if (state?.reciterId) setPrefs({ reciterId: state.reciterId });
  }, []);

  const downloadedForSelectedReciter = downloadedByReciter.get(prefs.reciterId) ?? new Set<number>();

  const handleBulkDownload = useCallback(async (targetReciterId: string) => {
    if (bulkProgress) {
      // Toggle-cancel a download already in flight.
      bulkAbortRef.current?.abort();
      return;
    }
    if (!isOnline) {
      toast.error(language === "ar" ? "لا يوجد اتصال بالإنترنت" : "No internet connection");
      return;
    }
    void requestPersistentStorageWithToast(language, {
      success: (msg) => toast.success(msg),
      info: (msg) => toast.info(msg),
    });

    const ctrl = new AbortController();
    bulkAbortRef.current = ctrl;
    const cached = downloadedByReciter.get(targetReciterId) ?? new Set<number>();
    const remaining = SURAH_META.filter((s) => !cached.has(s.number)).map((s) => s.number);
    const total = SURAH_META.length;
    setBulkProgress({ reciterId: targetReciterId, done: total - remaining.length, total });

    let failed = 0;
    // Refresh the downloaded-pill state every N surahs (not after every
    // single one). The progress counter ticks only on actual successes
    // (failed surahs are reported separately at the end), so the
    // displayed "n/114" reflects what is truly saved offline. The IDB
    // key-scan that powers per-surah ✓ badges is throttled, which keeps
    // low-end mobile responsive during a 114-surah run. A final refresh
    // fires in `finally` regardless.
    const REFRESH_EVERY = 10;
    let sinceRefresh = 0;
    try {
      for (const surahNumber of remaining) {
        if (ctrl.signal.aborted) throw new DOMException("Aborted", "AbortError");
        let ok = false;
        try {
          await downloadSurahAudio(targetReciterId, surahNumber, undefined, ctrl.signal);
          ok = true;
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") throw err;
          failed += 1;
        }
        if (ok) {
          setBulkProgress((prev) =>
            prev && prev.reciterId === targetReciterId
              ? { ...prev, done: prev.done + 1 }
              : prev,
          );
          sinceRefresh += 1;
          if (sinceRefresh >= REFRESH_EVERY) {
            sinceRefresh = 0;
            await refreshDownloads();
          }
        }
      }
      if (failed > 0) {
        toast.warning(
          language === "ar"
            ? `اكتمل التنزيل، لكن ${toArabicNumerals(failed)} سورة فشلت`
            : `Downloads finished — ${failed} surah(s) failed`,
        );
      } else {
        toast.success(
          language === "ar"
            ? "تم تحميل القرآن كاملاً للاستخدام بدون اتصال"
            : "Whole Quran saved offline for Sleep Mode",
        );
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        toast.info(language === "ar" ? "تم إلغاء التنزيل الجماعي" : "Bulk download cancelled");
      } else {
        toast.error(language === "ar" ? "حدث خطأ أثناء التنزيل" : "Download error");
      }
    } finally {
      bulkAbortRef.current = null;
      setBulkProgress(null);
      await refreshDownloads();
    }
  }, [bulkProgress, downloadedByReciter, isOnline, language, refreshDownloads]);

  const dismissWelcome = () => {
    localStorage.setItem("wise-sleep-welcome-seen", "1");
    setShowWelcome(false);
  };

  const togglePanel = (panel: SettingsPanel) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  };

  // ⚡ Bolt: O(1) direct indexing
  const selectedSurah = SURAH_META[prefs.surahNumber - 1];
  const sleepReciters = RECITERS.filter((r) => r.suitableForSleep);
  const selectedReciter = RECITERS.find((r) => r.id === prefs.reciterId);

  const progressPct = audioDuration > 0 ? (audioCurrentTime / audioDuration) * 100 : 0;

  return (
    <div
      className="fixed inset-0 overflow-hidden flex flex-col"
      style={{ background: "linear-gradient(160deg, #0a0e1a 0%, #0f1525 40%, #1a1f2e 100%)" }}
    >
      <StarField />

      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-safe-top pt-5 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-amber-300/70 text-base font-bold leading-none">Zzz</span>
            <span className="text-sm font-medium text-amber-200/70">
              {language === "ar" ? "وضع النوم" : "Sleep Mode"}
            </span>
          </div>
          <button
            onClick={() => { stop(); navigate(-1); }}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4 text-white/60" />
          </button>
        </div>

        {/* Center: Moon + Timer */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-5">
          <div className="relative flex items-center justify-center">
            <CircularTimer
              totalSeconds={prefs.timerMinutes * 60}
              remainingSeconds={remainingSeconds}
              size={240}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <MoonAnimation isPlaying={isPlaying} />
            </div>
          </div>

          {selectedSurah && (
            <motion.div
              key={selectedSurah.number}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <p className="text-2xl font-light text-amber-100 font-arabic" dir="rtl">
                {selectedSurah.name}
              </p>
              <p className="text-xs text-amber-200/40 mt-1">
                {selectedSurah.englishName}
              </p>
              {selectedReciter && (
                <p className="text-xs text-white/30 mt-0.5">
                  {language === "ar" ? selectedReciter.name : selectedReciter.nameEn}
                </p>
              )}
            </motion.div>
          )}

          {hasError && !isOfflineUncached && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 bg-red-500/15 border border-red-400/20 rounded-xl px-4 py-2.5 text-sm text-red-300"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              {language === "ar" ? "تعذّر تحميل الصوت. تحقق من اتصالك." : "Could not load audio. Check your connection."}
            </motion.div>
          )}

          {isOfflineUncached && (
            <motion.div
              data-testid="sleep-offline-empty-state"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-2.5 bg-amber-500/10 border border-amber-400/20 rounded-2xl px-4 py-3 text-sm text-amber-200/90 max-w-xs"
            >
              <div className="flex items-center gap-2 font-medium">
                <WifiOff className="h-4 w-4 shrink-0" />
                {language === "ar" ? "هذه السورة غير محفوظة بعد" : "This surah isn't downloaded yet"}
              </div>
              <p className="text-xs text-amber-100/60 text-center leading-relaxed">
                {language === "ar"
                  ? "أنت بدون إنترنت الآن. افتح قائمة السور لاختيار سورة محفوظة بعلامة ✓."
                  : "You're offline. Open the surah list to pick one marked ✓."}
              </p>
              <button
                onClick={() => setActivePanel("surah")}
                data-testid="sleep-offline-empty-state-cta"
                className="mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400/25 hover:bg-amber-400/35 text-amber-100 text-xs font-medium transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                {language === "ar" ? "افتح السور المحفوظة" : "Open downloaded surahs"}
              </button>
            </motion.div>
          )}
        </div>

        {/* Playback Controls */}
        <div className="flex flex-col items-center gap-3 py-4 px-6">
          <div className="flex items-center gap-8">
            <button
              onClick={() => setPrefs({ surahNumber: Math.max(1, prefs.surahNumber - 1) })}
              className="p-3 rounded-full bg-white/8 hover:bg-white/15 border border-white/10 transition-all text-white/60"
            >
              <ChevronDown className="h-5 w-5" />
            </button>

            {(() => {
              // Proactive offline gating: when the device is offline AND the
              // currently-selected (reciter, surah) is not in IndexedDB,
              // playing would just hit the silent-failure path and surface
              // the empty-state below. Replace play with a primary CTA that
              // jumps the user straight into the surah picker — every pill
              // there carries an inline ✓ / download badge so they can pick
              // a downloaded one or enable downloads.
              const isSelectedDownloaded = downloadedForSelectedReciter.has(prefs.surahNumber);
              const mustPickDownloaded = !isOnline && !isSelectedDownloaded && !isPlaying;
              if (mustPickDownloaded) {
                return (
                  <button
                    onClick={() => setActivePanel("surah")}
                    data-testid="sleep-pick-downloaded-cta"
                    aria-label={
                      language === "ar"
                        ? "اختر سورة محفوظة"
                        : "Pick a downloaded surah"
                    }
                    className="h-16 px-5 rounded-full border-2 border-amber-400/60 bg-amber-400/20 hover:bg-amber-400/30 flex items-center gap-2 transition-all active:scale-95 text-amber-100 text-sm font-medium"
                  >
                    <Download className="h-4 w-4" />
                    <span>
                      {language === "ar" ? "اختر سورة محفوظة" : "Pick a downloaded surah"}
                    </span>
                  </button>
                );
              }
              return (
                <button
                  onClick={togglePlay}
                  disabled={isLoading}
                  data-testid="sleep-play-button"
                  className="w-16 h-16 rounded-full border-2 border-amber-400/50 bg-amber-400/15 hover:bg-amber-400/25 flex items-center justify-center transition-all active:scale-95 disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 rounded-full border-2 border-amber-300/60 border-t-transparent animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="h-6 w-6 text-amber-200" />
                  ) : (
                    <Play className="h-6 w-6 text-amber-200 translate-x-0.5" />
                  )}
                </button>
              );
            })()}

            <button
              onClick={() => setPrefs({ surahNumber: Math.min(114, prefs.surahNumber + 1) })}
              className="p-3 rounded-full bg-white/8 hover:bg-white/15 border border-white/10 transition-all text-white/60"
            >
              <ChevronUp className="h-5 w-5" />
            </button>
          </div>

          {/* Audio progress bar */}
          <div className="w-full max-w-xs">
            <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-amber-400/60"
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[0.6rem] text-white/30 tabular-nums">
              <span>{formatTime(audioCurrentTime, language)}</span>
              {audioDuration > 0 && <span>{formatTime(audioDuration, language)}</span>}
            </div>
          </div>
        </div>

        {/* Settings Panels */}
        <div className="px-4 pb-safe-bottom pb-6 space-y-2">
          {/* Quick settings row */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: "timer" as SettingsPanel, icon: <Clock className="h-3.5 w-3.5" />, label: language === "ar" ? `${toArabicNumerals(prefs.timerMinutes)} د` : `${prefs.timerMinutes}m` },
              { id: "surah" as SettingsPanel, icon: null, label: selectedSurah ? (language === "ar" ? selectedSurah.name : selectedSurah.englishName) : t("sleep_label_surah") },
              { id: "reciter" as SettingsPanel, icon: null, label: selectedReciter ? (language === "ar" ? selectedReciter.name : selectedReciter.nameEn) : t("sleep_label_reciter") },
              { id: "volume" as SettingsPanel, icon: <Volume2 className="h-3.5 w-3.5" />, label: language === "ar" ? "الصوت" : "Volume" },
            ].map(({ id, icon, label }) => (
              <button
                key={id}
                onClick={() => togglePanel(id)}
                className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-2 rounded-full text-xs border transition-all shrink-0 ${
                  activePanel === id
                    ? "bg-amber-400/20 border-amber-400/40 text-amber-200"
                    : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                }`}
              >
                {icon}
                <span className="max-w-[90px] truncate">{label}</span>
              </button>
            ))}
          </div>

          {/* Expanded panel */}
          <AnimatePresence mode="wait">
            {activePanel && (
              <motion.div
                key={activePanel}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  {activePanel === "timer" && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
                        {language === "ar" ? "مدة المؤقت" : "Timer Duration"}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {TIMER_PRESETS.map((mins) => (
                          <button
                            key={mins}
                            onClick={() => setPrefs({ timerMinutes: mins })}
                            className={`px-4 py-2 rounded-full text-sm border transition-all ${
                              prefs.timerMinutes === mins
                                ? "bg-amber-400/20 border-amber-400/40 text-amber-200"
                                : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                            }`}
                          >
                            {language === "ar" ? `${toArabicNumerals(mins)} دقيقة` : `${mins} min`}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {activePanel === "surah" && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
                        {language === "ar" ? "اختر السورة" : "Choose Surah"}
                      </p>
                      <SurahSelectorForSleep
                        selected={prefs.surahNumber}
                        language={language}
                        onChange={(n) => setPrefs({ surahNumber: n })}
                        reciterId={prefs.reciterId}
                        downloadedSurahs={downloadedForSelectedReciter}
                        onAfterDownload={() => void refreshDownloads()}
                      />
                    </div>
                  )}

                  {activePanel === "reciter" && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
                        {language === "ar" ? "القارئ" : "Reciter"}
                      </p>
                      <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                        {sleepReciters.map((r) => {
                          const cachedCount = downloadedByReciter.get(r.id)?.size ?? 0;
                          return (
                            <button
                              key={r.id}
                              onClick={() => setPrefs({ reciterId: r.id })}
                              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-start border transition-all ${
                                prefs.reciterId === r.id
                                  ? "bg-amber-400/15 border-amber-400/35 text-amber-100"
                                  : "bg-white/4 border-white/8 text-white/60 hover:bg-white/8"
                              }`}
                            >
                              <div className={`h-3.5 w-3.5 rounded-full border-2 shrink-0 ${prefs.reciterId === r.id ? "bg-amber-400 border-amber-400" : "border-white/20"}`} />
                              <span className="flex-1 min-w-0 truncate">{language === "ar" ? r.name : r.nameEn}</span>
                              {cachedCount > 0 && (
                                <span
                                  className="ms-auto inline-flex items-center gap-0.5 rounded-full bg-emerald-400/15 text-emerald-300 px-2 py-0.5 text-[10px] font-semibold tabular-nums"
                                  title={language === "ar" ? "سور محفوظة" : "Saved surahs"}
                                >
                                  <Check className="h-2.5 w-2.5" />
                                  {language === "ar" ? toArabicNumerals(cachedCount) : cachedCount}
                                  /{language === "ar" ? toArabicNumerals(114) : 114}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Bulk download for the selected reciter — keeps Sleep Mode
                          fully self-contained without requiring a trip to the
                          Offline Center. */}
                      {(() => {
                        const cached = downloadedForSelectedReciter.size;
                        const total = SURAH_META.length;
                        const isAllDone = cached >= total;
                        const isThisReciterBusy = bulkProgress?.reciterId === prefs.reciterId;
                        const pct = bulkProgress
                          ? Math.round((bulkProgress.done / bulkProgress.total) * 100)
                          : Math.round((cached / total) * 100);
                        return (
                          <div className="mt-3 rounded-xl bg-white/5 border border-white/10 p-3 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-white/60">
                                {language === "ar" ? "محفوظ بدون اتصال" : "Saved offline"}
                              </span>
                              <span className="text-amber-200/80 tabular-nums">
                                {language === "ar"
                                  ? `${toArabicNumerals(cached)} / ${toArabicNumerals(total)}`
                                  : `${cached} / ${total}`}
                              </span>
                            </div>
                            <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-amber-400/70 transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <button
                              data-testid="sleep-bulk-download-button"
                              onClick={() => void handleBulkDownload(prefs.reciterId)}
                              disabled={isAllDone || (!!bulkProgress && !isThisReciterBusy) || (!isOnline && !isThisReciterBusy)}
                              className={`w-full flex items-center justify-center gap-2 rounded-xl text-xs font-medium px-3 py-2 border transition-all ${
                                isThisReciterBusy
                                  ? "bg-amber-400/20 border-amber-400/40 text-amber-100"
                                  : isAllDone
                                    ? "bg-emerald-400/15 border-emerald-400/30 text-emerald-200 cursor-default"
                                    : "bg-amber-400/10 border-amber-400/30 text-amber-200 hover:bg-amber-400/20 disabled:opacity-50"
                              }`}
                            >
                              {isThisReciterBusy ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  {language === "ar"
                                    ? `جارٍ التحميل ${toArabicNumerals(bulkProgress!.done)}/${toArabicNumerals(bulkProgress!.total)} — اضغط للإلغاء`
                                    : `Downloading ${bulkProgress!.done}/${bulkProgress!.total} — tap to cancel`}
                                </>
                              ) : isAllDone ? (
                                <>
                                  <Check className="h-3.5 w-3.5" />
                                  {language === "ar" ? "كل السور محفوظة" : "All surahs saved"}
                                </>
                              ) : (
                                <>
                                  <Download className="h-3.5 w-3.5" />
                                  {language === "ar" ? "تنزيل كل القرآن لهذا القارئ" : "Download whole Quran for this reciter"}
                                </>
                              )}
                            </button>
                            {!isOnline && !isThisReciterBusy && !isAllDone && (
                              <p className="flex items-center gap-1 text-[10px] text-amber-200/60">
                                <WifiOff className="h-3 w-3" />
                                {language === "ar"
                                  ? "أنت بدون إنترنت — التنزيل غير متاح الآن"
                                  : "You're offline — downloads unavailable"}
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {activePanel === "volume" && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-white/50">{language === "ar" ? "صوت القرآن" : "Quran Volume"}</p>
                        <span className="text-xs text-amber-300/60">{language === "ar" ? toArabicNumerals(prefs.quranVolume) : prefs.quranVolume}%</span>
                      </div>
                      <Slider
                        value={[prefs.quranVolume]}
                        onValueChange={([v]) => setPrefs({ quranVolume: v })}
                        min={0} max={100} step={5}
                        className="[&_[role=slider]]:bg-amber-300 [&_[role=slider]]:border-amber-400"
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Welcome overlay */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center p-6"
            style={{ background: "rgba(0,0,0,0.5)" }}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", damping: 20 }}
              className="w-full max-w-sm rounded-3xl border border-amber-400/20 p-6 space-y-4"
              style={{ background: "linear-gradient(145deg, #12182b, #1a2035)" }}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-amber-300 leading-none">Zzz</span>
                <h2 className="text-lg font-semibold text-amber-100">
                  {language === "ar" ? "وضع النوم" : "Sleep Mode"}
                </h2>
              </div>
              <p className="text-sm text-white/60 leading-relaxed">
                {language === "ar"
                  ? "استمع للقرآن الكريم قبل النوم. يوقف التشغيل تلقائياً بعد المدة المحددة مع تلاشي تدريجي للصوت."
                  : "Listen to the Quran before sleep. Playback automatically stops after the set duration with a gentle fade-out."}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={dismissWelcome}
                  className="flex-1 py-2.5 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-200 text-sm font-medium"
                >
                  {language === "ar" ? "ابدأ" : "Get Started"}
                </button>
                <button
                  onClick={dismissWelcome}
                  className="py-2.5 px-4 rounded-xl bg-white/5 border border-white/10 text-white/40 text-sm"
                >
                  {language === "ar" ? "لا تظهر مجدداً" : "Don't show again"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
