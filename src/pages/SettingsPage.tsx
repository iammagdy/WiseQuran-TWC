import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { cn, toArabicNumerals } from "@/lib/utils";
import { motion } from "framer-motion";
import { ArchiveRestore, ArchiveX, ArrowLeft, ArrowRight, Bell, BellOff, BookMarked, BookOpen, Check, CheckCircle, ChevronDown, ChevronUp, Clock, Download, FileText, Github, Globe, HardDrive, Info, Loader2, Mail, Mic, Moon, MoreVertical, Music, Palette, Pause, Play, RefreshCw, RotateCcw, Share, Smartphone, Sparkles, Square, Sun, Target, Trash2, Type, Volume2 } from "lucide-react";
import { exportBackup, downloadBackupFile, parseBackupFile, restoreBackup, estimateBackupSize, exportBackupBinary, downloadBackupBlob, restoreBackupFromFile, type BackupSizeEstimate } from "@/lib/backup";
import { clearAllLocalBookmarks } from "@/lib/bookmarks";
import { ADHAN_VOICES, REMINDER_SOUNDS, ADHAN_STORAGE_KEY, DEFAULT_ADHAN_SETTINGS, TAKBIR_URL, buildAzanSourceList, type AdhanSettings } from "@/lib/adhan-settings";
import { detectBrowser, getInstallInstructions } from "@/lib/browser-detect";
import { CALCULATION_METHODS, type CalculationMethod } from "@/lib/prayer-times";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useTheme } from "@/hooks/useTheme";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useDailyReading } from "@/hooks/useDailyReading";
import { useReadingReminder } from "@/hooks/useReadingReminder";
import { downloadAllSurahs, fetchSurahList, type SurahMeta } from "@/lib/quran-api";
import { downloadSurahAudio, formatBytes, verifyAndRepairDownloads } from "@/lib/quran-audio";
import { RECITERS, DEFAULT_RECITER, getReciterAyahAudioUrl, getReciterAudioUrl } from "@/lib/reciters";
import { TAFSIR_EDITIONS, DEFAULT_TAFSIR } from "@/data/tafsir-editions";
import { TRANSLATION_EDITIONS, DEFAULT_TRANSLATION } from "@/data/translation-editions";
import { toast } from "sonner";
import { getMergedChangelog, getEffectiveVersion } from "@/lib/changelog-overrides";
import { useLanguage } from "@/contexts/LanguageContext";
import { useServiceWorkerUpdate } from "@/hooks/useServiceWorkerUpdate";
import { mobileAudioManager } from "@/lib/mobile-audio";
import { showAppNotification } from "@/lib/notifications";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger } from
"@/components/ui/alert-dialog";
import FadeSection from "@/components/layout/FadeSection";
import InstallModal from "@/components/quran/InstallModal";
import { useReaderPersonalization } from "@/hooks/useReaderPersonalization";
import { getHijriOffsetDays, setHijriOffsetDays } from "@/hooks/useRamadan";

const loadDBModule = () => import("@/lib/settings-storage");

/**
 * Phase C — Device storage row.
 *
 * Surfaces `navigator.storage.estimate()` (used / quota) and offers a
 * one-tap `navigator.storage.persist()` opt-in. Persisted storage is
 * less likely to be evicted by the OS under disk pressure, which
 * matters once a user has downloaded a few hundred MB of recitations.
 *
 * Both APIs are best-effort: on browsers that don't expose
 * `navigator.storage` (notably some older WebViews) the row hides
 * itself silently rather than showing a confusing empty state.
 */
function DeviceStorageRow() {
  const { language } = useLanguage();
  const supported =
    typeof navigator !== "undefined" &&
    !!navigator.storage &&
    typeof navigator.storage.estimate === "function";

  const [estimate, setEstimate] = useState<{ usage: number; quota: number } | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!supported) return;
    try {
      const e = await navigator.storage.estimate();
      setEstimate({ usage: e.usage ?? 0, quota: e.quota ?? 0 });
    } catch {
      /* ignore */
    }
    if (navigator.storage.persisted) {
      try {
        setPersisted(await navigator.storage.persisted());
      } catch {
        setPersisted(null);
      }
    }
  }, [supported]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const requestPersist = useCallback(async () => {
    if (!supported || !navigator.storage.persist) return;
    setBusy(true);
    try {
      const granted = await navigator.storage.persist();
      setPersisted(granted);
      toast[granted ? "success" : "info"](
        granted
          ? language === "ar"
            ? "تم تفعيل التخزين الدائم"
            : "Persistent storage enabled"
          : language === "ar"
            ? "لم يمنح المتصفح التخزين الدائم"
            : "Browser declined persistent storage",
      );
    } finally {
      setBusy(false);
      void refresh();
    }
  }, [supported, language, refresh]);

  if (!supported || !estimate) return null;

  const used = estimate.usage;
  const quota = estimate.quota;
  const pct = quota > 0 ? Math.min(100, (used / quota) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {language === "ar" ? "مساحة الجهاز" : "Device storage"}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatBytes(used)} / {quota > 0 ? formatBytes(quota) : "—"}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-l from-primary to-primary/70 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      {persisted === true ? (
        <p className="flex items-center gap-1.5 text-[0.6875rem] text-primary">
          <CheckCircle className="h-3 w-3" />
          {language === "ar"
            ? "التخزين الدائم مفعّل — لن يحذف المتصفح ملفاتك تلقائياً"
            : "Persistent storage on — your downloads won't be auto-evicted"}
        </p>
      ) : (
        <button
          type="button"
          onClick={requestPersist}
          disabled={busy}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 py-2 text-xs font-medium text-primary transition hover:bg-primary/10 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <HardDrive className="h-3.5 w-3.5" />}
          {language === "ar" ? "تفعيل التخزين الدائم" : "Enable persistent storage"}
        </button>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { theme, toggleTheme, uiScale, setUIScale } = useTheme();
  const [hijriOffset, setHijriOffset] = useState<number>(() => getHijriOffsetDays());
  const { t, language, setLanguage, isRTL } = useLanguage();
  const browserType = detectBrowser();
  const isIOS = browserType === "ios-safari";
  const installInstructions = getInstallInstructions(browserType, language);
  const navigate = useNavigate();
  const [showChangelog, setShowChangelog] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const { checkForUpdate } = useServiceWorkerUpdate();
  const [fontSize, setFontSize] = useLocalStorage<number>("wise-font-size", 24);
  const [reciterId, setReciterId] = useLocalStorage<string>("wise-reciter", DEFAULT_RECITER);
  const [tafsirId, setTafsirId] = useLocalStorage<string>("wise-tafsir", DEFAULT_TAFSIR);
  const [translationEnabled, setTranslationEnabled] = useLocalStorage<boolean>("wise-translation-enabled", false);
  const [translationId, setTranslationId] = useLocalStorage<string>("wise-translation", DEFAULT_TRANSLATION);
  const [calcMethod, setCalcMethod] = useLocalStorage<CalculationMethod>("wise-prayer-method", "egyptian");
  const [adhanSettings, setAdhanSettings] = useLocalStorage<AdhanSettings>(ADHAN_STORAGE_KEY, DEFAULT_ADHAN_SETTINGS);
  const [notificationsEnabled, setNotificationsEnabled] = useLocalStorage<boolean>("wise-prayer-notifications", false);
  const [checkoffReminderEnabled, setCheckoffReminderEnabled] = useLocalStorage<boolean>("wise-prayer-checkoff-reminders", false);
  const [azkarNotificationsEnabled, setAzkarNotificationsEnabled] = useLocalStorage<boolean>("wise-azkar-notifications", false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    "Notification" in window ? Notification.permission : "denied"
  );
  const {
    enabled: readingReminderEnabled,
    time: readingReminderTime,
    enableReminder: enableReadingReminder,
    disableReminder: disableReadingReminder,
    updateTime: updateReadingReminderTime,
  } = useReadingReminder();
  const { goal, setGoal } = useDailyReading();
  const {
    lineSpacing,
    setLineSpacing,
    readerColorTheme,
    setReaderColorTheme,
    focusPreset,
    setFocusPreset,
    mushafFont,
    setMushafFont,
    wbwEnabled,
    setWbwEnabled,
  } = useReaderPersonalization();
  const [downloadedSurahs, setDownloadedSurahs] = useState<number[]>([]);
  const [downloadedAudio, setDownloadedAudio] = useState<number[]>([]);
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [audioDownloading, setAudioDownloading] = useState(false);
  const [audioDownloadProgress, setAudioDownloadProgress] = useState(0);
  const [singleAudioDownloading, setSingleAudioDownloading] = useState<number | null>(null);
  const [showAudioList, setShowAudioList] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyProgress, setVerifyProgress] = useState({ current: 0, total: 0 });

  // Storage stats
  const [storageStats, setStorageStats] = useState<{quranText: number;audio: number;tafsir: number;total: number;audioCount: number;surahCount: number;tafsirCount: number;} | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const refreshStorageStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const { getStorageStats } = await loadDBModule();
      const stats = await getStorageStats();
      setStorageStats(stats);
    } catch {/* ignore */}
    setLoadingStats(false);
  }, []);

  const [showInstallModal, setShowInstallModal] = useState(false);

  // Adhan voice preview
  const [previewingAdhan, setPreviewingAdhan] = useState<string | null>(null);
  const [adhanPreviewLoading, setAdhanPreviewLoading] = useState<string | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupSizeEstimate, setBackupSizeEstimate] = useState<BackupSizeEstimate | null>(null);
  const [backupSizeLoading, setBackupSizeLoading] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<import("@/lib/backup").BackupData | null>(null);
  const backupImportRef = useRef<HTMLInputElement>(null);

  const adhanPreviewRef = useRef<HTMLAudioElement | null>(null);
  const adhanPreviewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const azanFallbackRef = useRef<HTMLAudioElement | null>(null);
  const lastAzanTouchRef = useRef(0);
  const [previewingReminder, setPreviewingReminder] = useState<string | null>(null);
  const reminderPreviewRef = useRef<HTMLAudioElement | null>(null);

  const playAzanImmediately = useCallback((sources: string[], volumePercent: number, onSuccess?: () => void, onError?: () => void, onEnd?: () => void) => {
    const candidates = buildAzanSourceList(sources, isIOS);
    const fallbackAudio = azanFallbackRef.current;

    if (!fallbackAudio) {
      mobileAudioManager.playWithFallback("alarm", candidates, {
        volume: Math.max(0, Math.min(1, volumePercent / 100)),
        resetTime: true,
      }).then(() => onSuccess?.()).catch(() => onError?.());
      return;
    }

    let index = 0;
    const trySource = () => {
      const nextSource = candidates[index];
      if (!nextSource) {
        onError?.();
        return;
      }

      fallbackAudio.pause();
      fallbackAudio.src = nextSource;
      fallbackAudio.preload = "auto";
      fallbackAudio.volume = Math.max(0, Math.min(1, volumePercent / 100));
      fallbackAudio.onended = () => onEnd?.();
      fallbackAudio.onerror = () => {
        index += 1;
        trySource();
      };
      fallbackAudio.load();

      const playAttempt = fallbackAudio.play();
      playAttempt.then(() => {
        onSuccess?.();
      }).catch(() => {
        index += 1;
        trySource();
      });
    };

    trySource();
  }, [isIOS]);

  const stopAdhanPreview = useCallback(() => {
    if (adhanPreviewTimeoutRef.current) {
      clearTimeout(adhanPreviewTimeoutRef.current);
      adhanPreviewTimeoutRef.current = null;
    }
    if (adhanPreviewRef.current) {
      adhanPreviewRef.current.pause();
      adhanPreviewRef.current.removeAttribute("src");
      adhanPreviewRef.current.load();
      adhanPreviewRef.current = null;
    }
    setPreviewingAdhan(null);
    setAdhanPreviewLoading(null);
  }, []);

  const toggleAdhanPreview = useCallback((voiceId: string, src: string) => {
    if (previewingAdhan === voiceId || adhanPreviewLoading === voiceId) {
      stopAdhanPreview();
      return;
    }
    stopAdhanPreview();
    setAdhanPreviewLoading(voiceId);
    adhanPreviewRef.current = azanFallbackRef.current;

    adhanPreviewTimeoutRef.current = setTimeout(() => {
      if (adhanPreviewRef.current) {
        azanFallbackRef.current?.pause();
        azanFallbackRef.current?.removeAttribute("src");
        azanFallbackRef.current?.load();
        adhanPreviewRef.current = null;
        setAdhanPreviewLoading(null);
        setPreviewingAdhan(null);
        toast.error(language === "ar" ? "انتهت مهلة تحميل الأذان. تحقق من اتصالك." : "Adhan loading timed out. Check your connection.");
      }
    }, 12000);

    playAzanImmediately([src], adhanSettings.adhanVolume, () => {
      if (adhanPreviewTimeoutRef.current) clearTimeout(adhanPreviewTimeoutRef.current);
      setAdhanPreviewLoading(null);
      setPreviewingAdhan(voiceId);
    }, () => {
      if (adhanPreviewTimeoutRef.current) clearTimeout(adhanPreviewTimeoutRef.current);
      setAdhanPreviewLoading(null);
      setPreviewingAdhan(null);
      toast.error(language === "ar" ? "تعذّر تحميل الأذان. قد يكون الخادم غير متاح مؤقتاً." : "Could not load adhan. The server may be temporarily unavailable.");
    }, () => {
      adhanPreviewRef.current = null;
      setPreviewingAdhan(null);
    });
  }, [previewingAdhan, adhanPreviewLoading, stopAdhanPreview, adhanSettings.adhanVolume, language, playAzanImmediately]);

  // Preview reciter audio
  const [previewingReciter, setPreviewingReciter] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const stopPreview = useCallback(() => {
    if (previewAudioRef.current) {
      mobileAudioManager.stop("preview", true);
      previewAudioRef.current = null;
    }
    setPreviewingReciter(null);
    setPreviewLoading(null);
  }, []);

  const togglePreview = useCallback(async (r: typeof RECITERS[0]) => {
    // If already previewing this reciter, stop
    if (previewingReciter === r.id) {
      stopPreview();
      return;
    }
    // Stop any current preview
    stopPreview();

    setPreviewLoading(r.id);

    // Create Audio IMMEDIATELY to preserve user gesture context
    const audio = mobileAudioManager.getAudio("preview");
    previewAudioRef.current = audio;
    mobileAudioManager.prime("preview").catch(() => { /* ignore */ });

    // Now fetch the URL asynchronously
    const url = await getReciterAudioUrl(r.id, 1);

    // Timeout: abort if audio doesn't start within 10s
    const timeoutId = setTimeout(() => {
      if (previewAudioRef.current === audio) {
        audio.pause();
        audio.src = "";
        previewAudioRef.current = null;
        setPreviewLoading(null);
        setPreviewingReciter(null);
        toast.error(t("settings_toast_preview_timeout"));
      }
    }, 10000);

    audio.oncanplay = () => {
      clearTimeout(timeoutId);
      setPreviewLoading(null);
      setPreviewingReciter(r.id);
      mobileAudioManager.play("preview").catch(() => {
        setPreviewingReciter(null);
      });
    };

    audio.onended = () => {
      setPreviewingReciter(null);
    };

    audio.onerror = () => {
      clearTimeout(timeoutId);
      setPreviewLoading(null);
      setPreviewingReciter(null);
      toast.error(t("settings_toast_preview_error"));
    };

    // Set src after listeners are attached
    audio.src = url;
    audio.preload = "auto";

    audio.load();
  }, [previewingReciter, stopPreview]);

  // Cleanup on unmount
  useEffect(() => {
    if (azanFallbackRef.current) {
      azanFallbackRef.current.setAttribute("playsinline", "");
      azanFallbackRef.current.setAttribute("webkit-playsinline", "");
    }

    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      if (adhanPreviewRef.current) {
        adhanPreviewRef.current.pause();
        adhanPreviewRef.current = null;
      }
      if (adhanPreviewTimeoutRef.current) {
        clearTimeout(adhanPreviewTimeoutRef.current);
        adhanPreviewTimeoutRef.current = null;
      }
      if (reminderPreviewRef.current) {
        reminderPreviewRef.current.pause();
        reminderPreviewRef.current = null;
      }
      if (azanFallbackRef.current) {
        azanFallbackRef.current.pause();
        azanFallbackRef.current = null;
      }
    };
  }, []);

  // PWA Install
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;

  useEffect(() => {
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const installedHandler = () => setIsInstalled(true);
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, [isStandalone]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  useEffect(() => {
    loadDBModule().then(({ getAllDownloadedSurahs, getAllDownloadedAudio }) => {
      getAllDownloadedSurahs().then(setDownloadedSurahs);
      getAllDownloadedAudio(reciterId).then(setDownloadedAudio);
    });
    fetchSurahList().then(setSurahs);
    refreshStorageStats();
  }, [reciterId, refreshStorageStats]);

  const handleDownloadAll = async () => {
    setDownloading(true);
    try {
      await downloadAllSurahs((percent) => setDownloadProgress(percent));
    } catch {
      toast.error(t("settings_toast_download_failed"));
    }
    const { getAllDownloadedSurahs } = await loadDBModule();
    const updated = await getAllDownloadedSurahs();
    setDownloadedSurahs(updated);
    setDownloading(false);
    refreshStorageStats();
    if (updated.length === 114) {
      toast.success(t("settings_toast_quran_downloaded"));
    }
  };

  const handleClear = async () => {
    const { clearAllData } = await loadDBModule();
    await clearAllData();
    setDownloadedSurahs([]);
    setDownloadedAudio([]);
    refreshStorageStats();
    toast.success(t("settings_toast_data_cleared"));
  };

  const handleDownloadAllAudio = async () => {
    setAudioDownloading(true);
    const total = 114;
    const toDownload = [];

    for (let i = 1; i <= total; i++) {
      if (!downloadedAudio.includes(i)) {
        toDownload.push(i);
      }
    }

    let completed = total - toDownload.length;
    setAudioDownloadProgress(Math.round((completed / total) * 100));

    const CONCURRENCY = 5;
    for (let i = 0; i < toDownload.length; i += CONCURRENCY) {
      const chunk = toDownload.slice(i, i + CONCURRENCY);
      await Promise.all(
        chunk.map(async (surahNum) => {
          try {
            await downloadSurahAudio(reciterId, surahNum);
          } catch {
            /* continue */
          }
          completed++;
          setAudioDownloadProgress(Math.round((completed / total) * 100));
        })
      );
    }

    const { getAllDownloadedAudio } = await loadDBModule();
    const updated = await getAllDownloadedAudio(reciterId);
    setDownloadedAudio(updated);
    setAudioDownloading(false);
    refreshStorageStats();
    toast.success(t("settings_toast_audio_downloaded"));
  };

  const handleClearAllAudio = async () => {
    const { clearAllAudio } = await loadDBModule();
    await clearAllAudio();
    setDownloadedAudio([]);
    refreshStorageStats();
    toast.success(t("settings_toast_audio_cleared"));
  };

  const handleDownloadSingleAudio = async (num: number) => {
    setSingleAudioDownloading(num);
    try {
      const size = await downloadSurahAudio(reciterId, num);
      const { getAllDownloadedAudio } = await loadDBModule();
      const updated = await getAllDownloadedAudio(reciterId);
      setDownloadedAudio(updated);
      refreshStorageStats();
      toast.success(`${t("settings_toast_recitation_downloaded")} (${formatBytes(size)})`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("settings_toast_recitation_failed"));
    }
    setSingleAudioDownloading(null);
  };

  const handleDeleteSingleAudio = async (num: number) => {
    const { deleteAudio, getAllDownloadedAudio } = await loadDBModule();
    await deleteAudio(reciterId, num);
    const updated = await getAllDownloadedAudio(reciterId);
    setDownloadedAudio(updated);
    refreshStorageStats();
  };

  const handleClearTafsir = async () => {
    const { clearAllTafsir } = await loadDBModule();
    await clearAllTafsir();
    refreshStorageStats();
    toast.success(t("settings_toast_tafsir_cleared"));
  };

  const handleExportBackup = async (includeOfflineContent = false, includeAudio = false) => {
    setBackupBusy(true);
    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      if (includeAudio) {
        // Large archives go through the streamed binary format so we
        // never materialise hundreds of megabytes of audio as a single
        // JSON string.
        const blob = await exportBackupBinary({ includeOfflineContent: true, includeAudio: true });
        downloadBackupBlob(blob, `wise-quran-backup-${dateStr}.wqb`);
      } else {
        const data = await exportBackup({ includeOfflineContent, includeAudio: false });
        downloadBackupFile(data);
      }
      toast.success(language === "ar" ? "تم تصدير النسخة الاحتياطية" : "Backup exported successfully");
    } catch {
      toast.error(language === "ar" ? "فشل تصدير النسخة الاحتياطية" : "Backup export failed");
    } finally {
      setBackupBusy(false);
    }
  };

  // Estimates the "include everything" archive size so the user knows
  // what they're downloading before they click export. Refreshed when
  // the Backup & Restore card becomes visible.
  const refreshBackupEstimate = useCallback(async () => {
    setBackupSizeLoading(true);
    try {
      const est = await estimateBackupSize({ includeOfflineContent: true, includeAudio: true });
      setBackupSizeEstimate(est);
    } catch {
      setBackupSizeEstimate(null);
    } finally {
      setBackupSizeLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshBackupEstimate();
  }, [refreshBackupEstimate]);

  const [pendingBackupFile, setPendingBackupFile] = useState<File | null>(null);

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    // For large `.wqb` archives we intentionally don't parse the audio
    // body up-front — `restoreBackupFromFile` streams it on demand.
    // For small `.json` files we still pre-validate so we can show a
    // clean confirm dialog.
    if (/\.wqb$/i.test(file.name)) {
      setPendingBackupFile(file);
      setPendingBackup(null);
      return;
    }
    try {
      const data = await parseBackupFile(file);
      setPendingBackup(data);
      setPendingBackupFile(null);
    } catch (err) {
      toast.error(language === "ar" ? "فشل قراءة الملف" : `Cannot read file: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleConfirmRestore = async () => {
    if (!pendingBackup && !pendingBackupFile) return;
    setBackupBusy(true);
    try {
      const result = pendingBackupFile
        ? await restoreBackupFromFile(pendingBackupFile)
        : await restoreBackup(pendingBackup!);
      const summary = language === "ar"
        ? `تمت الاستعادة (${result.lsKeysRestored} إعداد · ${result.azkarRestored} ذكر · ${result.audioRestored} مقطع صوتي) — إعادة تحميل…`
        : `Restored ${result.lsKeysRestored} settings · ${result.azkarRestored} azkar · ${result.audioRestored} audio — reloading…`;
      toast.success(summary);
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      toast.error(language === "ar" ? "فشل استيراد النسخة الاحتياطية" : `Restore failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBackupBusy(false);
      setPendingBackup(null);
      setPendingBackupFile(null);
    }
  };

  const handleVerifyDownloads = async () => {
    setVerifying(true);
    setVerifyProgress({ current: 0, total: 0 });

    try {
      const result = await verifyAndRepairDownloads(
        reciterId,
        (current, total) => {
          setVerifyProgress({ current, total });
        }
      );

      const { getAllDownloadedAudio } = await loadDBModule();
      const updated = await getAllDownloadedAudio(reciterId);
      setDownloadedAudio(updated);
      refreshStorageStats();

      if (result.corrupted.length === 0) {
        const validCount = language === "ar" ? toArabicNumerals(result.valid.length) : result.valid.length;
        toast.success(language === "ar"
          ? `تم التحقق من جميع الملفات ✓ (${validCount} ملف سليم)`
          : `All files verified ✓ (${validCount} valid)`);
      } else {
        const validCount = language === "ar" ? toArabicNumerals(result.valid.length) : result.valid.length;
        const corruptCount = language === "ar" ? toArabicNumerals(result.corrupted.length) : result.corrupted.length;
        toast.success(language === "ar"
          ? `تم إصلاح التحميلات\nملفات سليمة: ${validCount}\nملفات تالفة تم حذفها: ${corruptCount}`
          : `Downloads repaired\nValid: ${validCount}\nCorrupted removed: ${corruptCount}`,
          { duration: 5000 }
        );
      }
    } catch (e) {
      toast.error(t("settings_toast_verify_failed"));
    } finally {
      setVerifying(false);
      setVerifyProgress({ current: 0, total: 0 });
    }
  };

  return (
    <div className="px-4 pt-6 ps-[5px] pb-[20px]" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center gap-2 mb-1">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(-1)}
          className="rounded-xl p-2 hover:bg-muted transition-colors"
        >
          {isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
        </motion.button>
        <h1 className="text-2xl font-bold heading-decorated">{t("settings_title")}</h1>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">{t("settings_subtitle")}</p>

      <div className="space-y-10 pb-10">
        {/* ─── HUB: PERSONALIZATION ─── */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-1">
            <div className="h-1 flex-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 shrink-0">
              {isRTL ? "التخصيص" : "Personalization"}
            </h2>
            <div className="h-1 flex-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          </div>

        {/* ─── Install PWA ─── */}
        {!isInstalled && (
          <FadeSection>
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowInstallModal(true)}
              className="relative group cursor-pointer overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background/40 to-background/60 p-4 shadow-sm transition-all"
            >
              {/* Premium Gradient Glow */}
              <div className="absolute -top-10 -end-10 h-32 w-32 rounded-full bg-primary/20 blur-3xl transition-opacity group-hover:opacity-60" />
              <div className="absolute -bottom-10 -start-10 h-32 w-32 rounded-full bg-gold/10 blur-3xl transition-opacity group-hover:opacity-40" />

              <div className="relative z-10 flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20">
                  <Smartphone className="h-6 w-6" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-gradient">
                      {language === "ar" ? "ثبّت التطبيق الآن" : "Install the App Now"}
                    </h3>
                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  </div>
                  <p className="text-xs text-muted-foreground/80 truncate">
                    {language === "ar" 
                      ? "اضغط لمشاهدة طريقة التثبيت السريعة" 
                      : "Tap to see the quick installation guide"}
                  </p>
                </div>

                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 border border-white/10 text-muted-foreground group-hover:text-primary group-hover:border-primary/40 transition-all shadow-sm">
                  {isRTL ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                </div>
              </div>

              {/* Shimmer Light Sweep */}
              <div className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-[-20deg] -translate-x-full group-hover:translate-x-[150%] transition-transform duration-1000 ease-out pointer-events-none" />
            </motion.div>
          </FadeSection>
        )}

        <InstallModal 
          open={showInstallModal} 
          onOpenChange={setShowInstallModal} 
        />

        {isInstalled && (
          <FadeSection>
            <div className="flex items-center justify-center gap-2 rounded-xl bg-primary/5 py-2 text-xs text-primary/80 border border-primary/10">
              <CheckCircle className="h-3.5 w-3.5" />
              <span>{t("install_app_already")}</span>
            </div>
          </FadeSection>
        )}

        <section>
          <div className="section-title flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            {language === "ar" ? "أدوات سريعة" : "Quick Tools"}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              data-testid="settings-offline-center-button"
              onClick={() => navigate("/offline")}
              className="rounded-2xl border border-border/50 bg-card p-4 text-start shadow-soft hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <Download className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">{language === "ar" ? "المكتبة بدون إنترنت" : "Offline Center"}</span>
              </div>
              <p className="text-xs text-muted-foreground">{language === "ar" ? "حمّل النصوص والصوت وأدرها من شاشة مخصصة." : "Download and manage text and audio from a dedicated screen."}</p>
            </button>
            <button
              data-testid="settings-safari-diagnostics-button"
              onClick={() => navigate("/settings/safari-diagnostics")}
              className="rounded-2xl border border-border/50 bg-card p-4 text-start shadow-soft hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <Smartphone className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">{language === "ar" ? "تشخيص Safari" : "Safari Diagnostics"}</span>
              </div>
              <p className="text-xs text-muted-foreground">{language === "ar" ? "افحص الصوت والمايك والإشعارات على iPhone Safari." : "Check audio, mic, and notifications on iPhone Safari."}</p>
            </button>
          </div>
        </section>

        {/* ─── Language & Content ─── */}
        <section>
          <div className="section-title flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" />
            {t("language")} & {t("translation_section")}
          </div>
          <FadeSection className="rounded-xl bg-card shadow-sm overflow-hidden">
            {/* App Language Toggle */}
            <div className="flex gap-2 p-3">
              <button
                onClick={() => setLanguage("ar")}
                className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-colors min-h-[44px] ${
                  language === "ar" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {t("language_arabic")}
              </button>
              <button
                onClick={() => setLanguage("en")}
                className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-colors min-h-[44px] ${
                  language === "en" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {t("language_english")}
              </button>
            </div>

            <Separator className="opacity-50" />

            {/* Translation Settings */}
            <div className="flex items-center justify-between px-4 py-3.5">
              <div>
                <span className="text-sm font-medium block">{t("show_translation")}</span>
                <span className="text-xs text-muted-foreground">{t("show_translation_subtitle")}</span>
              </div>
              <Switch
                checked={translationEnabled}
                onCheckedChange={setTranslationEnabled} />
            </div>

            {translationEnabled && (
              <Collapsible>
                <CollapsibleTrigger className="flex w-full items-center justify-between border-t border-border/50 px-4 py-3.5 text-sm font-medium hover:bg-muted/50 transition-colors">
                  <span>{TRANSLATION_EDITIONS.find((t) => t.id === translationId)?.name ?? "Sahih International"}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border-t border-border/50 px-2 py-2 max-h-64 overflow-y-auto space-y-0.5">
                    {TRANSLATION_EDITIONS.map((t) =>
                    <button
                      key={t.id}
                      onClick={() => setTranslationId(t.id)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px] ${
                      translationId === t.id ?
                      "bg-primary/10 text-primary" :
                      "text-foreground hover:bg-muted"}`
                      }>
                      <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      translationId === t.id ? "border-primary bg-primary" : "border-muted-foreground/30"}`
                      }>
                        {translationId === t.id && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                      </div>
                      <span className="flex-1 text-end">{t.name}</span>
                      <span className="text-xs text-muted-foreground">{t.language}</span>
                    </button>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </FadeSection>
        </section>
        </div>

        {/* ─── HUB: READING EXPERIENCE ─── */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-1">
            <div className="h-1 flex-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 shrink-0">
              {isRTL ? "تجربة القراءة" : "Reading Experience"}
            </h2>
            <div className="h-1 flex-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          </div>

          {/* ─── Appearance & Reading ─── */}
        <section>
          <div className="section-title flex items-center gap-1.5">
            <Palette className="h-3.5 w-3.5" />
            {t("appearance")}
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-card p-5 shadow-elevated border border-border/50 space-y-4">

            {/* Theme toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === "dark" ? <Moon className="h-4.5 w-4.5 text-primary" /> : <Sun className="h-4.5 w-4.5 text-primary" />}
                <span className="text-sm font-medium">{t("theme_dark_mode")}</span>
              </div>
              <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
            </div>

            <Separator className="my-4" />

            {/* UI Scale */}
            <div>
              <div className="mb-3 flex items-center gap-3">
                <Smartphone className="h-4.5 w-4.5 text-primary" />
                <span className="text-sm font-medium">{t("ui_scale")}</span>
              </div>
              <div className="flex gap-2">
                {[
                { value: "normal" as const, labelKey: "scale_normal" as const },
                { value: "large" as const, labelKey: "scale_large" as const },
                { value: "xlarge" as const, labelKey: "scale_xlarge" as const }].
                map((opt) =>
                <button
                  key={opt.value}
                  onClick={() => setUIScale(opt.value)}
                  className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors ${
                  uiScale === opt.value ?
                  "bg-primary text-primary-foreground" :
                  "bg-muted text-muted-foreground hover:bg-muted/80"}`
                  }>
                    {t(opt.labelKey)}
                  </button>
                )}
              </div>
            </div>

            <Separator className="my-4" />

            {/* Hijri calendar adjustment (±2 days) */}
            <div>
              <div className="mb-3 flex items-center gap-3">
                <Moon className="h-4.5 w-4.5 text-primary" />
                <span className="text-sm font-medium">
                  {language === "ar" ? "ضبط التقويم الهجري" : "Hijri adjustment"}
                </span>
              </div>
              <div className="flex gap-2">
                {[-2, -1, 0, 1, 2].map((n) => {
                  const active = hijriOffset === n;
                  const label = n === 0
                    ? (language === "ar" ? "افتراضي" : "Default")
                    : (language === "ar" ? `${n > 0 ? "+" : ""}${toArabicNumerals(n)}` : `${n > 0 ? "+" : ""}${n}`);
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => {
                        setHijriOffsetDays(n);
                        setHijriOffset(n);
                      }}
                      className={cn(
                        "flex-1 rounded-xl py-2 text-xs font-medium transition-colors min-h-[36px]",
                        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80",
                      )}
                      aria-pressed={active}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-muted-foreground/80">
                {language === "ar"
                  ? "يؤثر على اكتشاف رمضان والأذكار اليومية."
                  : "Affects Ramadan and daily Azkar date detection."}
              </p>
            </div>

            <Separator className="my-4" />

            {/* Font size */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Type className="h-4.5 w-4.5 text-primary" />
                  <span className="text-sm font-medium">{t("quran_font_size")}</span>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{fontSize}px</span>
              </div>
              <Slider
                value={[fontSize]}
                onValueChange={([v]) => setFontSize(v)}
                min={16}
                max={40}
                step={2} />

              <div className="mt-3 text-center text-muted-foreground space-y-0.5">
                <p className="font-arabic" style={{ fontSize }}>بِسْمِ اللَّهِ</p>
                {language === "en" && <p className="text-xs text-muted-foreground/70">In the Name of Allah</p>}
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-4">
              <div>
                <div className="mb-3 flex items-center gap-3">
                  <MoreVertical className="h-4.5 w-4.5 text-primary" />
                  <span className="text-sm font-medium">{language === "ar" ? "تباعد السطور" : "Line Spacing"}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: "compact", label: language === "ar" ? "مضغوط" : "Compact" },
                    { key: "balanced", label: language === "ar" ? "متوازن" : "Balanced" },
                    { key: "relaxed", label: language === "ar" ? "مريح" : "Relaxed" },
                  ].map((option) => (
                    <button
                      key={option.key}
                      data-testid={`settings-line-spacing-${option.key}`}
                      onClick={() => setLineSpacing(option.key as typeof lineSpacing)}
                      className={cn(
                        "rounded-xl py-2 text-sm font-medium transition-colors",
                        lineSpacing === option.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center gap-3">
                  <Palette className="h-4.5 w-4.5 text-primary" />
                  <span className="text-sm font-medium">{language === "ar" ? "لون النص" : "Text Tone"}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: "classic", label: language === "ar" ? "كلاسيكي" : "Classic" },
                    { key: "emerald", label: language === "ar" ? "زمردي" : "Emerald" },
                    { key: "sepia", label: language === "ar" ? "سيبيا" : "Sepia" },
                  ].map((option) => (
                    <button
                      key={option.key}
                      data-testid={`settings-reader-theme-${option.key}`}
                      onClick={() => setReaderColorTheme(option.key as typeof readerColorTheme)}
                      className={cn(
                        "rounded-xl py-2 text-sm font-medium transition-colors",
                        readerColorTheme === option.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center gap-3">
                  <BookOpen className="h-4.5 w-4.5 text-primary" />
                  <span className="text-sm font-medium">{language === "ar" ? "خط المصحف" : "Mushaf Font"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "uthmanic", label: language === "ar" ? "عثماني" : "Uthmanic", className: "font-mushaf-uthmanic" },
                    { key: "indopak", label: language === "ar" ? "هندي/باكستاني" : "Indopak", className: "font-mushaf-indopak" },
                  ].map((option) => (
                    <button
                      key={option.key}
                      data-testid={`settings-mushaf-font-${option.key}`}
                      onClick={() => setMushafFont(option.key as typeof mushafFont)}
                      className={cn(
                        "rounded-xl py-2 text-sm font-medium transition-colors",
                        mushafFont === option.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      <span className={cn("block text-base", option.className)}>﴿بِسْمِ اللَّهِ﴾</span>
                      <span className="block text-[0.6875rem] mt-0.5 opacity-80">{option.label}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[0.6875rem] text-muted-foreground">
                  {language === "ar"
                    ? "يطبَّق على عرض المصحف. يمكنك التبديل في أي وقت."
                    : "Used in the Mushaf page view. Switch any time."}
                </p>
              </div>

              <div>
                <div className="mb-3 flex items-center gap-3">
                  <Moon className="h-4.5 w-4.5 text-primary" />
                  <span className="text-sm font-medium">{language === "ar" ? "وضع التركيز" : "Focus Preset"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "standard", label: language === "ar" ? "قياسي" : "Standard" },
                    { key: "calm", label: language === "ar" ? "هادئ" : "Calm" },
                  ].map((option) => (
                    <button
                      key={option.key}
                      data-testid={`settings-focus-preset-${option.key}`}
                      onClick={() => setFocusPreset(option.key as typeof focusPreset)}
                      className={cn(
                        "rounded-xl py-2 text-sm font-medium transition-colors",
                        focusPreset === option.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <BookOpen className="h-4.5 w-4.5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{t("wbw_settings_label")}</p>
                    <p className="text-[0.6875rem] text-muted-foreground">{t("wbw_settings_description")}</p>
                  </div>
                </div>
                <Switch
                  checked={wbwEnabled}
                  onCheckedChange={setWbwEnabled}
                  data-testid="settings-wbw-toggle"
                />
              </div>
            </div>
          </motion.div>
        </section>

        {/* ─── Reciter Selection (Collapsible) ─── */}
        <section>
          <div className="section-title flex items-center gap-1.5">
            <Mic className="h-3.5 w-3.5" />
            {t("reciter_section")}
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.02 }}
            className="rounded-xl bg-card shadow-sm overflow-hidden">

            <Collapsible>
              <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3.5 text-sm font-medium hover:bg-muted/50 transition-colors">
                <span className="font-arabic">{(() => { const r = RECITERS.find((r) => r.id === reciterId); return language === "en" ? (r?.nameEn ?? "Mishary Alafasy") : (r?.name ?? "مشاري العفاسي"); })()}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t border-border/50 px-2 py-2 max-h-64 overflow-y-auto space-y-0.5">
                  {RECITERS.map((r) =>
                  <div
                    key={r.id}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px] ${
                    reciterId === r.id ?
                    "bg-primary/10 text-primary" :
                    "text-foreground hover:bg-muted"}`
                    }>

                      <button
                      onClick={() => setReciterId(r.id)}
                      className="flex flex-1 items-center gap-3 min-w-0">

                        <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      reciterId === r.id ? "border-primary bg-primary" : "border-muted-foreground/30"}`
                      }>
                          {reciterId === r.id && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                        </div>
                        <span className="font-arabic truncate">{language === "en" ? r.nameEn : r.name}</span>
                      </button>
                      <button
                      onClick={(e) => {e.stopPropagation();togglePreview(r);}}
                      className="shrink-0 p-2.5 rounded-full hover:bg-muted-foreground/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title={t("audio_preview")}>

                        {previewLoading === r.id ?
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> :
                      previewingReciter === r.id ?
                      <Pause className="h-4 w-4 text-primary" /> :

                      <Volume2 className="h-4 w-4 text-muted-foreground" />
                      }
                      </button>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </motion.div>
        </section>

        {/* ─── Tafsir Selection (Collapsible) ─── */}
        <section>
          <div className="section-title flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            {t("tafsir_section")}
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.025 }}
            className="rounded-xl bg-card shadow-sm overflow-hidden">

            <Collapsible>
              <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3.5 text-sm font-medium hover:bg-muted/50 transition-colors">
                <span className="font-arabic">{(() => { const ed = TAFSIR_EDITIONS.find((e) => e.id === tafsirId); return language === "en" ? (ed?.nameEn ?? "Al-Muyassar Tafsir") : (ed?.name ?? "تفسير الميسر"); })()}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t border-border/50 px-2 py-2 space-y-0.5">
                  {TAFSIR_EDITIONS.map((t) =>
                  <button
                    key={t.id}
                    onClick={() => setTafsirId(t.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px] ${
                    tafsirId === t.id ?
                    "bg-primary/10 text-primary" :
                    "text-foreground hover:bg-muted"}`
                    }>

                      <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    tafsirId === t.id ? "border-primary bg-primary" : "border-muted-foreground/30"}`
                    }>
                        {tafsirId === t.id && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                      </div>
                      <span className="font-arabic">{language === "en" ? t.nameEn : t.name}</span>
                    </button>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </motion.div>
        </section>
        </div>

        {/* ─── HUB: PRAYER & SPIRITUALITY ─── */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-1">
            <div className="h-1 flex-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 shrink-0">
              {isRTL ? "الصلاة والروحانيات" : "Prayer & Reminders"}
            </h2>
            <div className="h-1 flex-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          </div>

          {/* ─── Prayer Notifications ─── */}
        <section>
          <div className="section-title flex items-center gap-1.5">
            <Bell className="h-3.5 w-3.5" />
            {t("prayer_notifications")}
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.03 }}
            className="rounded-xl bg-card p-4 shadow-sm space-y-3">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {notificationsEnabled ?
                <Bell className="h-4.5 w-4.5 text-primary" /> :

                <BellOff className="h-4.5 w-4.5 text-muted-foreground" />
                }
                <span className="text-sm font-medium">{t("prayer_time_reminder")}</span>
              </div>
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={async (checked) => {
                  if (checked) {
                    if (!("Notification" in window)) {
                      toast.error(t("notifications_not_supported"));
                      return;
                    }
                    const perm = await Notification.requestPermission();
                    setNotificationPermission(perm);
                    if (perm === "granted") {
                      setNotificationsEnabled(true);
                      toast.success(t("prayer_time_reminder_enabled"));
                    } else {
                      toast.error(t("notifications_permission_denied"));
                    }
                  } else {
                    setNotificationsEnabled(false);
                    toast.success(t("prayer_time_reminder_disabled"));
                  }
                }} />

            </div>
            <p className="text-xs text-muted-foreground">
              {notificationPermission === "denied" ?
              t("prayer_notifications_denied") :
              t("prayer_time_hint")}
            </p>

            <Separator className="my-4" />

            {/* Check-off reminder */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {checkoffReminderEnabled ?
                <Bell className="h-4.5 w-4.5 text-primary" /> :
                <BellOff className="h-4.5 w-4.5 text-muted-foreground" />}
                <span className="text-sm font-medium">{t("prayer_checkoff_reminder")}</span>
              </div>
              <Switch
                checked={checkoffReminderEnabled}
                onCheckedChange={async (checked) => {
                  if (checked) {
                    if (!("Notification" in window)) {
                      toast.error(t("notifications_not_supported"));
                      return;
                    }
                    const perm = await Notification.requestPermission();
                    setNotificationPermission(perm);
                    if (perm === "granted") {
                      setCheckoffReminderEnabled(true);
                    } else {
                      toast.error(t("notifications_permission_denied"));
                    }
                  } else {
                    setCheckoffReminderEnabled(false);
                  }
                }} />
            </div>
            <p className="text-xs text-muted-foreground">
              {t("prayer_checkoff_reminder_hint")}
            </p>

            <Separator className="my-4" />

            {/* Azkar Notifications */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {azkarNotificationsEnabled ?
                <Bell className="h-4.5 w-4.5 text-primary" /> :

                <BellOff className="h-4.5 w-4.5 text-muted-foreground" />
                }
                <span className="text-sm font-medium">{t("azkar_reminder")}</span>
              </div>
              <Switch
                checked={azkarNotificationsEnabled}
                onCheckedChange={async (checked) => {
                  if (checked) {
                    if (!("Notification" in window)) {
                      toast.error(t("notifications_not_supported"));
                      return;
                    }
                    const perm = await Notification.requestPermission();
                    setNotificationPermission(perm);
                    if (perm === "granted") {
                      setAzkarNotificationsEnabled(true);
                      toast.success(t("azkar_reminder_enabled"));
                    } else {
                      toast.error(t("notifications_permission_denied"));
                    }
                  } else {
                    setAzkarNotificationsEnabled(false);
                    toast.success(t("azkar_reminder_disabled"));
                  }
                }} />

            </div>
            <p className="text-xs text-muted-foreground">
              {t("azkar_reminder_hint")}
            </p>

            <Separator className="my-4" />

            {/* Reading Reminder */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {readingReminderEnabled ?
                <Bell className="h-4.5 w-4.5 text-primary" /> :
                <BellOff className="h-4.5 w-4.5 text-muted-foreground" />
                }
                <span className="text-sm font-medium">{t("reading_reminder")}</span>
              </div>
              <Switch
                checked={readingReminderEnabled}
                onCheckedChange={async (checked) => {
                  if (checked) {
                    if (!("Notification" in window)) {
                      toast.error(t("notifications_not_supported"));
                      return;
                    }
                    const success = await enableReadingReminder(readingReminderTime);
                    if (success) {
                      toast.success(t("reading_reminder_enabled"));
                    } else {
                      toast.error(t("notifications_permission_denied"));
                    }
                  } else {
                    disableReadingReminder();
                    toast.success(t("reading_reminder_disabled"));
                  }
                }} />
            </div>
            {readingReminderEnabled && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-muted-foreground">{t("reading_reminder_time")}</span>
                <input
                  type="time"
                  value={readingReminderTime}
                  onChange={(e) => updateReadingReminderTime(e.target.value)}
                  className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {t("reading_reminder_hint")}
            </p>
          </motion.div>
        </section>

        {/* ─── Adhan & Reminders ─── */}
        <section>
          <div className="section-title flex items-center gap-1.5">
            <Music className="h-3.5 w-3.5" />
            {language === "ar" ? "الأذان والتذكيرات" : "Adhan & Reminders"}
          </div>

          {isIOS && (
            <FadeSection>
              <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 p-3.5 border border-blue-200/60 dark:border-blue-800/40">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                      {language === "ar" ? "ملاحظة لمستخدمي iOS" : "Note for iOS Users"}
                    </p>
                    <p className="text-xs text-blue-700/80 dark:text-blue-400/80 mt-1">
                      {language === "ar"
                        ? "يتم التحكم في إخراج الصوت (مكبرات الصوت أو سماعات الرأس) من خلال مركز التحكم في جهازك، وليس من داخل التطبيق."
                        : "Audio output (speakers vs. headphones) is controlled via your device's Control Center, not from within the app."}
                    </p>
                  </div>
                </div>
              </div>
            </FadeSection>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.03 }}
            className="rounded-xl bg-card p-4 shadow-sm space-y-4">

            {/* Enable Adhan */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{language === "ar" ? "تشغيل الأذان" : "Play Adhan"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{language === "ar" ? "يُشغَّل عند دخول وقت الصلاة" : "Plays at prayer time"}</p>
              </div>
              <Switch
                checked={adhanSettings.adhanEnabled}
                onCheckedChange={(v) => setAdhanSettings({ ...adhanSettings, adhanEnabled: v })}
              />
            </div>

            {/* Notification permission status */}
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
              <span className="text-xs text-muted-foreground">
                {language === "ar" ? "إذن الإشعارات" : "Notification permission"}
              </span>
              {notificationPermission === "granted" ? (
                <span className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5" />
                  {language === "ar" ? "ممنوح" : "Granted"}
                </span>
              ) : notificationPermission === "denied" ? (
                <span className="text-xs font-medium text-destructive flex items-center gap-1">
                  <BellOff className="h-3.5 w-3.5" />
                  {language === "ar" ? "محظور" : "Denied"}
                </span>
              ) : (
                <button
                  onClick={async () => {
                    if (!("Notification" in window)) return;
                    const perm = await Notification.requestPermission();
                    setNotificationPermission(perm);
                    if (perm === "granted") toast.success(language === "ar" ? "تم منح إذن الإشعارات" : "Notification permission granted");
                    else toast.error(language === "ar" ? "لم يُمنح الإذن" : "Permission not granted");
                  }}
                  className="text-xs font-medium text-primary underline underline-offset-2"
                >
                  {language === "ar" ? "اطلب الإذن" : "Request permission"}
                </button>
              )}
            </div>

            {adhanSettings.adhanEnabled && (
              <>
                <Separator />

                {/* Voice Picker */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {language === "ar" ? "صوت المؤذن" : "Muezzin Voice"}
                  </p>
                  <div className="space-y-1.5">
                    {ADHAN_VOICES.map((voice) => (
                      <div
                        key={voice.id}
                        className={`flex items-center justify-between rounded-xl px-3 py-2.5 border transition-colors ${
                          adhanSettings.voiceId === voice.id
                            ? "bg-primary/8 border-primary/20"
                            : "bg-muted/40 border-border/40"
                        }`}
                      >
                        <button
                          onClick={() => setAdhanSettings({ ...adhanSettings, voiceId: voice.id })}
                          className="flex items-center gap-2.5 flex-1 min-w-0"
                        >
                          <div className={`h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
                            adhanSettings.voiceId === voice.id ? "border-primary bg-primary" : "border-muted-foreground/30"
                          }`}>
                            {adhanSettings.voiceId === voice.id && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                          </div>
                          <span className="text-sm font-medium truncate">
                            {language === "ar" ? voice.nameAr : voice.nameEn}
                          </span>
                        </button>
                        <button
                          onTouchEnd={(e) => {
                            e.preventDefault();
                            lastAzanTouchRef.current = Date.now();
                            toggleAdhanPreview(voice.id, voice.file);
                          }}
                          onClick={() => {
                            if (Date.now() - lastAzanTouchRef.current < 700) return;
                            toggleAdhanPreview(voice.id, voice.file);
                          }}
                          className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-all shrink-0 ${
                            previewingAdhan === voice.id
                              ? "bg-destructive/15 text-destructive border border-destructive/20"
                              : adhanPreviewLoading === voice.id
                                ? "bg-primary/15 text-primary border border-primary/20"
                                : "bg-muted text-muted-foreground hover:bg-muted/80 border border-transparent"
                          }`}
                        >
                          {adhanPreviewLoading === voice.id
                            ? <><Loader2 className="h-3 w-3 animate-spin" /> {language === "ar" ? "إيقاف" : "Stop"}</>
                            : previewingAdhan === voice.id
                              ? <><Square className="h-3 w-3 fill-current" /> {language === "ar" ? "إيقاف" : "Stop"}</>
                              : <><Play className="h-3 w-3" /> {language === "ar" ? "معاينة" : "Preview"}</>
                          }
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Fajr special + takbir toggles */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{language === "ar" ? "أذان الفجر الخاص" : "Special Fajr Adhan"}</p>
                      <p className="text-xs text-muted-foreground">{language === "ar" ? "يتضمن الصلاة خير من النوم" : "Includes Assalatu Khayrun Minan Nawm"}</p>
                    </div>
                    <Switch
                      checked={adhanSettings.fajrSpecialAdhan}
                      onCheckedChange={(v) => setAdhanSettings({ ...adhanSettings, fajrSpecialAdhan: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{language === "ar" ? "وضع التكبير فقط" : "Takbir Only Mode"}</p>
                      <p className="text-xs text-muted-foreground">{language === "ar" ? "يعزف تكبير قصير بدلًا من الأذان" : "Plays short takbir instead of full adhan"}</p>
                    </div>
                    <Switch
                      checked={adhanSettings.takbirOnlyMode}
                      onCheckedChange={(v) => setAdhanSettings({ ...adhanSettings, takbirOnlyMode: v })}
                    />
                  </div>
                </div>

                <Separator />

                {/* Adhan Volume */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      <Volume2 className="h-4 w-4 text-muted-foreground" />
                      {language === "ar" ? "مستوى صوت الأذان" : "Adhan Volume"}
                    </p>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {language === "ar" ? `${toArabicNumerals(String(adhanSettings.adhanVolume))}٪` : `${adhanSettings.adhanVolume}%`}
                    </span>
                  </div>
                  <Slider
                    value={[adhanSettings.adhanVolume]}
                    onValueChange={([v]) => setAdhanSettings({ ...adhanSettings, adhanVolume: v })}
                    min={0} max={100} step={5}
                  />
                </div>
              </>
            )}

            <Separator />

            {/* Pre-prayer reminder */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{language === "ar" ? "تذكير قبل الصلاة" : "Pre-Prayer Reminder"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {language === "ar" ? "إشعار قبل دخول وقت الصلاة" : "Notification before prayer time"}
                </p>
              </div>
              <select
                value={adhanSettings.preReminderMinutes}
                onChange={(e) => setAdhanSettings({ ...adhanSettings, preReminderMinutes: Number(e.target.value) })}
                className="rounded-lg border border-border bg-muted text-sm px-2 py-1.5 outline-none focus:border-primary transition-colors"
              >
                <option value={0}>{language === "ar" ? "لا شيء" : "None"}</option>
                <option value={5}>{language === "ar" ? "٥ دقائق" : "5 min"}</option>
                <option value={10}>{language === "ar" ? "١٠ دقائق" : "10 min"}</option>
                <option value={15}>{language === "ar" ? "١٥ دقيقة" : "15 min"}</option>
                <option value={30}>{language === "ar" ? "٣٠ دقيقة" : "30 min"}</option>
                <option value={60}>{language === "ar" ? "ساعة" : "1 hour"}</option>
              </select>
            </div>

            {/* Post-prayer reminder */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{language === "ar" ? "تذكير بعد الصلاة" : "Post-Prayer Reminder"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {language === "ar" ? "تذكير بالأذكار والأوراد" : "Reminder for post-prayer adhkar"}
                </p>
              </div>
              <select
                value={adhanSettings.postReminderMinutes}
                onChange={(e) => setAdhanSettings({ ...adhanSettings, postReminderMinutes: Number(e.target.value) })}
                className="rounded-lg border border-border bg-muted text-sm px-2 py-1.5 outline-none focus:border-primary transition-colors"
              >
                <option value={0}>{language === "ar" ? "لا شيء" : "None"}</option>
                <option value={30}>{language === "ar" ? "٣٠ دقيقة" : "30 min"}</option>
                <option value={60}>{language === "ar" ? "ساعة" : "1 hour"}</option>
                <option value={120}>{language === "ar" ? "ساعتان" : "2 hours"}</option>
              </select>
            </div>

            {adhanSettings.postReminderMinutes > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{language === "ar" ? "نوع المحتوى" : "Reminder content"}</p>
                <select
                  value={adhanSettings.postReminderContent}
                  onChange={(e) => setAdhanSettings({ ...adhanSettings, postReminderContent: e.target.value as AdhanSettings["postReminderContent"] })}
                  className="rounded-lg border border-border bg-muted text-sm px-2 py-1.5 outline-none focus:border-primary transition-colors"
                >
                  <option value="simple">{language === "ar" ? "تذكير بسيط" : "Simple"}</option>
                  <option value="dhikr">{language === "ar" ? "تسبيح" : "Dhikr"}</option>
                  <option value="quran">{language === "ar" ? "آية قرآنية" : "Quran verse"}</option>
                </select>
              </div>
            )}

            {/* Reminder Sound Picker */}
            {(adhanSettings.preReminderMinutes > 0 || adhanSettings.postReminderMinutes > 0) && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {language === "ar" ? "صوت التذكير" : "Reminder Sound"}
                </p>
                <div className="space-y-1.5">
                  {REMINDER_SOUNDS.map((sound) => (
                    <div
                      key={sound.id}
                      className={`flex items-center justify-between rounded-xl px-3 py-2.5 border transition-colors ${
                        (adhanSettings.reminderSoundId ?? "chime") === sound.id
                          ? "bg-primary/8 border-primary/20"
                          : "bg-muted/40 border-border/40"
                      }`}
                    >
                      <button
                        onClick={() => setAdhanSettings({ ...adhanSettings, reminderSoundId: sound.id })}
                        className="flex items-center gap-2.5 flex-1 min-w-0"
                      >
                        <div className={`h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
                          (adhanSettings.reminderSoundId ?? "chime") === sound.id ? "border-primary bg-primary" : "border-muted-foreground/30"
                        }`}>
                          {(adhanSettings.reminderSoundId ?? "chime") === sound.id && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                        </div>
                        <span className="text-sm font-medium truncate">
                          {language === "ar" ? sound.nameAr : sound.nameEn}
                        </span>
                      </button>
                      {sound.file && (
                        <button
                          onClick={() => {
                            if (previewingReminder === sound.id) {
                              if (reminderPreviewRef.current) {
                                mobileAudioManager.stop("preview", true);
                                reminderPreviewRef.current = null;
                              }
                              setPreviewingReminder(null);
                              return;
                            }
                            if (reminderPreviewRef.current) {
                              mobileAudioManager.stop("preview", true);
                              reminderPreviewRef.current = null;
                            }
                            const audio = mobileAudioManager.getAudio("preview");
                            audio.volume = Math.max(0, Math.min(1, adhanSettings.reminderVolume / 100));
                            reminderPreviewRef.current = audio;
                            setPreviewingReminder(sound.id);
                            audio.onended = () => {
                              setPreviewingReminder(null);
                              reminderPreviewRef.current = null;
                            };
                            audio.src = sound.file;
                            audio.load();
                            mobileAudioManager.prime("preview").catch(() => {});
                            mobileAudioManager.play("preview").catch(() => { setPreviewingReminder(null); });
                          }}
                          className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-all shrink-0 ${
                            previewingReminder === sound.id
                              ? "bg-destructive/15 text-destructive border border-destructive/20"
                              : "bg-muted text-muted-foreground hover:bg-muted/80 border border-transparent"
                          }`}
                        >
                          {previewingReminder === sound.id
                            ? <><Square className="h-3 w-3 fill-current" /> {language === "ar" ? "إيقاف" : "Stop"}</>
                            : <><Play className="h-3 w-3" /> {language === "ar" ? "معاينة" : "Preview"}</>
                          }
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chime volume */}
            {(adhanSettings.preReminderMinutes > 0 || adhanSettings.postReminderMinutes > 0) && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    {language === "ar" ? "مستوى صوت التذكيرات" : "Reminder Chime Volume"}
                  </p>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {language === "ar" ? `${toArabicNumerals(String(adhanSettings.reminderVolume))}٪` : `${adhanSettings.reminderVolume}%`}
                  </span>
                </div>
                <Slider
                  value={[adhanSettings.reminderVolume]}
                  onValueChange={([v]) => setAdhanSettings({ ...adhanSettings, reminderVolume: v })}
                  min={0} max={100} step={5}
                />
              </div>
            )}

            <Separator />

            {/* Per-prayer overrides */}
            <Collapsible>
              <CollapsibleTrigger className="flex w-full items-center justify-between text-sm font-medium hover:text-primary transition-colors">
                <span>{language === "ar" ? "إعدادات كل صلاة" : "Per-Prayer Settings"}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-3 space-y-2.5">
                  {(["fajr","dhuhr","asr","maghrib","isha"] as const).map((id) => {
                    const names: Record<string,string> = { fajr: language==="ar"?"الفجر":"Fajr", dhuhr: language==="ar"?"الظهر":"Dhuhr", asr: language==="ar"?"العصر":"Asr", maghrib: language==="ar"?"المغرب":"Maghrib", isha: language==="ar"?"العشاء":"Isha" };
                    const cfg = adhanSettings.perPrayer?.[id] ?? { adhanEnabled: true, reminderEnabled: true };
                    const update = (patch: Partial<typeof cfg>) =>
                      setAdhanSettings({ ...adhanSettings, perPrayer: { ...adhanSettings.perPrayer, [id]: { ...cfg, ...patch } } });
                    return (
                      <div key={id} className="rounded-xl bg-muted/40 border border-border/30 px-3 py-2.5">
                        <p className="text-sm font-semibold mb-2">{names[id]}</p>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                            <input
                              type="checkbox"
                              checked={cfg.adhanEnabled}
                              onChange={(e) => update({ adhanEnabled: e.target.checked })}
                              className="accent-primary"
                            />
                            {language === "ar" ? "أذان" : "Adhan"}
                          </label>
                          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                            <input
                              type="checkbox"
                              checked={cfg.reminderEnabled}
                              onChange={(e) => update({ reminderEnabled: e.target.checked })}
                              className="accent-primary"
                            />
                            {language === "ar" ? "تذكير" : "Reminder"}
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            {/* Test buttons */}
            <div className="flex gap-2 flex-wrap">
              <button
                data-testid="settings-test-adhan-button"
                onTouchEnd={(e) => {
                  e.preventDefault();
                  lastAzanTouchRef.current = Date.now();
                  const voice = ADHAN_VOICES.find((v) => v.id === adhanSettings.voiceId) ?? ADHAN_VOICES[0];
                  const src = adhanSettings.takbirOnlyMode ? TAKBIR_URL : voice.file;
                  playAzanImmediately([src], adhanSettings.adhanVolume, undefined, () => {
                    toast.error(language === "ar" ? "تعذر تشغيل الأذان، تحقق من الاتصال بالإنترنت" : "Could not play Azan. Check your internet connection.");
                  });
                }}
                onClick={() => {
                  if (Date.now() - lastAzanTouchRef.current < 700) return;
                  const voice = ADHAN_VOICES.find((v) => v.id === adhanSettings.voiceId) ?? ADHAN_VOICES[0];
                  const src = adhanSettings.takbirOnlyMode ? TAKBIR_URL : voice.file;
                  playAzanImmediately([src], adhanSettings.adhanVolume, undefined, () => {
                    toast.error(language === "ar" ? "تعذر تشغيل الأذان، تحقق من الاتصال بالإنترنت" : "Could not play Azan. Check your internet connection.");
                  });
                }}
                className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors"
              >
                <Play className="h-3.5 w-3.5" />
                {language === "ar" ? "اختبر الأذان الآن" : "Test Adhan Now"}
              </button>
              <button
                data-testid="settings-test-notification-button"
                onClick={() => {
                  if (!("Notification" in window) || Notification.permission !== "granted") {
                    toast.error(language === "ar" ? "يرجى منح إذن الإشعارات أولاً" : "Please grant notification permission first");
                    return;
                  }
                  showAppNotification(language === "ar" ? "حان وقت الصلاة 🕌" : "Prayer Time 🕌", {
                    body: language === "ar" ? "هذا اختبار للإشعارات" : "This is a test notification",
                    tag: "wise-settings-test-notification",
                  });
                }}
                className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors"
              >
                <Bell className="h-3.5 w-3.5" />
                {language === "ar" ? "اختبر الإشعار" : "Test Notification"}
              </button>
            </div>

            <audio ref={azanFallbackRef} preload="none" playsInline className="hidden" data-testid="settings-azan-fallback-audio" />
          </motion.div>
        </section>

        {/* ─── Prayer Calculation Method (Collapsible) ─── */}
        <section>
          <div className="section-title flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {t("prayer_method")}
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.035 }}
            className="rounded-xl bg-card shadow-sm overflow-hidden">
            
            <Collapsible>
              <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3.5 text-sm font-medium hover:bg-muted/50 transition-colors">
                <span className="font-arabic">{CALCULATION_METHODS[calcMethod]?.name ?? "الهيئة المصرية"}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t border-border/50 px-2 py-2 space-y-0.5">
                  {(Object.entries(CALCULATION_METHODS) as [CalculationMethod, typeof CALCULATION_METHODS[CalculationMethod]][]).map(([key, method]) =>
                  <button
                    key={key}
                    onClick={() => setCalcMethod(key)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    calcMethod === key ?
                    "bg-primary/10 text-primary" :
                    "text-foreground hover:bg-muted"}`
                    }>
                    
                      <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    calcMethod === key ? "border-primary bg-primary" : "border-muted-foreground/30"}`
                    }>
                        {calcMethod === key && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                      </div>
                      <span className="font-arabic">{method.name}</span>
                    </button>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </motion.div>
          <div className="section-title flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5" />
            {t("daily_reading_goal")}
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-xl bg-card p-4 shadow-sm">
            
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium">{t("daily_verse_count")}</span>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">{goal} {t("ayahs")}</span>
            </div>
            <div className="flex gap-2 mb-3">
              {[10, 20, 50].map((v) =>
              <button
                key={v}
                onClick={() => setGoal(v)}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                goal === v ?
                "bg-primary text-primary-foreground" :
                "bg-muted text-muted-foreground hover:bg-muted/80"}`
                }>
                
                  {language === "en" ? v : toArabicNumerals(v)}
                </button>
              )}
            </div>
            <Slider
              value={[goal]}
              onValueChange={([v]) => setGoal(v)}
              min={5}
              max={100}
              step={5} />
            
          </motion.div>
        </section>
        </div>

        {/* ─── HUB: STORAGE & SYSTEM ─── */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-1">
            <div className="h-1 flex-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 shrink-0">
              {isRTL ? "النظام والبيانات" : "Storage & System"}
            </h2>
            <div className="h-1 flex-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          </div>

          {/* ─── Downloads ─── */}
        <section>
          <div className="section-title flex items-center gap-1.5">
            <Download className="h-3.5 w-3.5" />
            {t("downloads")}
          </div>
          <div className="space-y-3">
            {/* Quran Text Download */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-xl bg-card p-4 shadow-sm">
              
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium">{t("downloads_quran_text")}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[0.625rem] text-muted-foreground">
                  {language === "en" ? `${downloadedSurahs.length}/114` : toArabicNumerals(`${downloadedSurahs.length}/114`)}
                </span>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">{t("downloads_quran_desc")}</p>

              {downloading ?
              <div className="space-y-2">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${downloadProgress}%` }} />

                  </div>
                  <p className="text-center text-xs text-muted-foreground">
                    {t("downloads_downloading")} {language === "en" ? `${downloadProgress}%` : `${toArabicNumerals(String(downloadProgress))}٪`}
                  </p>
                </div> :

              <div className="flex gap-2">
                  <button
                  onClick={handleClear}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-destructive/10 py-2.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20">

                    <Trash2 className="h-3.5 w-3.5" />
                    {t("downloads_clear_all")}
                  </button>
                  <button
                  onClick={handleDownloadAll}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90">

                    {downloadedSurahs.length === 114 ?
                  <>
                        <Check className="h-3.5 w-3.5" />
                        {t("downloads_complete")}
                      </> :

                  <>
                        <Download className="h-3.5 w-3.5" />
                        {t("downloads_download_all")}
                      </>
                  }
                  </button>
                </div>
              }
            </motion.div>

            {/* Audio Download */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-xl bg-card p-4 shadow-sm">
              
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{t("downloads_audio")}</span>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[0.625rem] text-muted-foreground">
                  {language === "en" ? `${downloadedAudio.length}/114` : toArabicNumerals(`${downloadedAudio.length}/114`)}
                </span>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">{t("downloads_audio_desc")}</p>

              {audioDownloading ?
              <div className="space-y-2">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${audioDownloadProgress}%` }} />

                  </div>
                  <p className="text-center text-xs text-muted-foreground">
                    {t("downloads_downloading_audio")} {language === "en" ? `${audioDownloadProgress}%` : `${toArabicNumerals(String(audioDownloadProgress))}٪`}
                  </p>
                </div> :
              verifying ?
              <div className="space-y-2">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: verifyProgress.total > 0 ? `${(verifyProgress.current / verifyProgress.total) * 100}%` : '0%' }} />

                  </div>
                  <p className="text-center text-xs text-muted-foreground">
                    {t("downloads_verifying")} {language === "en" ? `${verifyProgress.current}/${verifyProgress.total}` : toArabicNumerals(`${verifyProgress.current}/${verifyProgress.total}`)}
                  </p>
                </div> :

              <div className="space-y-2">
                <div className="flex gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-destructive/10 py-2.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
                      disabled={downloadedAudio.length === 0}>

                        <Trash2 className="h-3.5 w-3.5" />
                        {t("downloads_clear_audio")}
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent dir={isRTL ? "rtl" : "ltr"}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("downloads_confirm_clear_audio_title")}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t("downloads_confirm_clear_audio_desc")}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex-row-reverse gap-2">
                        <AlertDialogAction onClick={handleClearAllAudio} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          {t("downloads_confirm_yes")}
                        </AlertDialogAction>
                        <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <button
                  onClick={handleDownloadAllAudio}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90">

                    {downloadedAudio.length === 114 ?
                  <>
                        <Check className="h-3.5 w-3.5" />
                        {t("downloads_complete")}
                      </> :

                  <>
                        <Download className="h-3.5 w-3.5" />
                        {t("downloads_download_all")}
                      </>
                  }
                  </button>
                </div>

                {downloadedAudio.length > 0 && (
                  <button
                    onClick={handleVerifyDownloads}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-muted py-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/80">
                    <CheckCircle className="h-3.5 w-3.5" />
                    {t("downloads_verify")}
                  </button>
                )}
              </div>
              }

              {/* Collapsible surah list */}
              <Collapsible open={showAudioList} onOpenChange={setShowAudioList}>
                <CollapsibleTrigger asChild>
                  <button className="mt-3 flex w-full items-center justify-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
                    {showAudioList ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {showAudioList ? t("downloads_hide_details") : t("downloads_show_details")}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {surahs.length > 0 &&
                  <div className="mt-3 max-h-64 space-y-0.5 overflow-y-auto rounded-lg bg-muted/30 p-1.5">
                      {surahs.map((s, idx) => {
                      const isDownloaded = downloadedAudio.includes(s.number);
                      const isLoading = singleAudioDownloading === s.number;
                      return (
                        <div
                          key={s.number}
                          className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${idx % 2 === 0 ? "bg-background/50" : ""}`}>
                          
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground w-6 text-center">{language === "en" ? s.number : toArabicNumerals(s.number)}</span>
                              <span className="font-arabic text-sm">{language === "en" ? s.englishName : s.name}</span>
                              {isDownloaded && <Check className="h-3 w-3 text-primary" />}
                            </div>
                            <div>
                              {isLoading ?
                            <Loader2 className="h-4 w-4 animate-spin text-primary" /> :
                            isDownloaded ?
                            <button
                              onClick={() => handleDeleteSingleAudio(s.number)}
                              className="text-destructive/50 transition-colors hover:text-destructive">
                              
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button> :

                            <button
                              onClick={() => handleDownloadSingleAudio(s.number)}
                              className="text-primary/50 transition-colors hover:text-primary">
                              
                                  <Download className="h-3.5 w-3.5" />
                                </button>
                            }
                            </div>
                          </div>);

                    })}
                    </div>
                  }
                </CollapsibleContent>
              </Collapsible>
            </motion.div>
          </div>
        </section>


        {/* ─── Storage Management ─── */}
        <section>
          <div className="section-title flex items-center gap-1.5">
            <HardDrive className="h-3.5 w-3.5" />
            {t("storage")}
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="rounded-xl bg-card p-4 shadow-sm space-y-4">
            
            {loadingStats ?
            <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div> :
            storageStats ?
            <>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{t("storage_total")}</span>
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                      {formatBytes(storageStats.total)}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-gradient-to-l from-primary to-primary/70 transition-all" style={{ width: `${Math.min(storageStats.total / (500 * 1024 * 1024) * 100, 100)}%` }} />
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t("storage_quran_text")}</p>
                        <p className="text-[0.625rem] text-muted-foreground">{language === "en" ? storageStats.surahCount : toArabicNumerals(storageStats.surahCount)} {t("storage_surahs_count")}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatBytes(storageStats.quranText)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20">
                        <Music className="h-4 w-4 text-accent-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t("storage_audio")}</p>
                        <p className="text-[0.625rem] text-muted-foreground">{language === "en" ? storageStats.audioCount : toArabicNumerals(storageStats.audioCount)} {t("storage_audio_count")}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatBytes(storageStats.audio)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                        <BookMarked className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t("storage_tafsir")}</p>
                        <p className="text-[0.625rem] text-muted-foreground">{language === "en" ? storageStats.tafsirCount : toArabicNumerals(storageStats.tafsirCount)} {t("storage_tafsir_count")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{formatBytes(storageStats.tafsir)}</span>
                      {storageStats.tafsirCount > 0 &&
                    <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="text-destructive/50 hover:text-destructive transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent dir={isRTL ? "rtl" : "ltr"}>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("storage_confirm_clear_tafsir_title")}</AlertDialogTitle>
                              <AlertDialogDescription>{t("storage_confirm_clear_tafsir_desc")}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex-row-reverse gap-2">
                              <AlertDialogAction onClick={handleClearTafsir} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("downloads_confirm_yes")}</AlertDialogAction>
                              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                    }
                    </div>
                  </div>
                </div>

                {storageStats.total === 0 &&
              <p className="text-center text-xs text-muted-foreground py-2">{t("storage_empty")}</p>
              }

                <Separator />

                {/* Phase C: device storage estimate + persist toggle.
                    `navigator.storage.estimate()` reports the OS-level
                    quota for our origin so users can see how close they
                    are to eviction; `persist()` asks the OS to mark the
                    site's storage as durable so the IDB rows holding
                    downloaded surahs aren't reclaimed under disk
                    pressure. Both are best-effort and silently no-op
                    on browsers that don't expose the Storage API. */}
                <DeviceStorageRow />
              </> :
            null}
          </motion.div>
        </section>

        {/* ─── Reset Progress ─── */}
        <section>
          <div className="section-title flex items-center gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            {t("reset_progress")}
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="rounded-xl bg-card p-4 shadow-sm">
            
            <p className="mb-3 text-xs text-muted-foreground">
              {t("reset_progress_desc")}
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-destructive/10 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20">
                  <RotateCcw className="h-4 w-4" />
                  {t("reset_progress")}
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent dir={isRTL ? "rtl" : "ltr"}>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("reset_progress_confirm_title")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("reset_progress_confirm_desc")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-row-reverse gap-2">
                  <AlertDialogAction
                    onClick={() => {
                      localStorage.removeItem("wise-last-read");
                      localStorage.removeItem("wise-bookmarks");
                      localStorage.removeItem("wise-favorite-surahs");
                      localStorage.removeItem("wise-daily-reading");
                      localStorage.removeItem("wise-streak");
                      localStorage.removeItem("wise-reading-history");
                      void clearAllLocalBookmarks().catch(() => {});
                      toast.success(t("reset_progress_success"));
                      setTimeout(() => window.location.reload(), 500);
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90">

                    {t("reset_progress_confirm_btn")}
                  </AlertDialogAction>
                  <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </motion.div>
        </section>

        {/* ─── Backup & Restore ─── */}
        <section>
          <div className="section-title flex items-center gap-1.5">
            <ArchiveRestore className="h-3.5 w-3.5" />
            {isRTL ? "النسخ الاحتياطي والاستعادة" : "Backup & Restore"}
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.19 }}
            className="rounded-xl bg-card p-4 shadow-sm space-y-4">

            <p className="text-xs text-muted-foreground">
              {isRTL
                ? "احفظ تقدمك (الحفظ، القراءة، الأذكار، الأوراد، قائمة المزامنة) في ملف JSON للاستعادة على أي جهاز. يمكن أيضًا تضمين نص القرآن والتفاسير والملفات الصوتية المحملة."
                : "Save your progress (hifz, reading, azkar, wird, pending sync) to a JSON file and restore it on any device. Downloaded Quran text, tafsir, and audio can optionally be included."}
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => void handleExportBackup(false)}
                disabled={backupBusy}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
                {backupBusy
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Download className="h-4 w-4" />}
                {isRTL ? "تصدير البيانات" : "Export all data"}
              </button>

              <button
                onClick={() => backupImportRef.current?.click()}
                disabled={backupBusy}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-muted py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/80 disabled:opacity-50">
                {backupBusy
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <ArchiveX className="h-4 w-4" />}
                {isRTL ? "استيراد نسخة احتياطية" : "Import backup"}
              </button>
            </div>

            <button
              onClick={() => void handleExportBackup(true, false)}
              disabled={backupBusy}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/5 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50">
              <Download className="h-3.5 w-3.5" />
              <span>
                {isRTL
                  ? "تصدير شامل (نص القرآن والتفاسير)"
                  : "Export with offline Quran text & tafsir"}
                {backupSizeEstimate ? (
                  <span className="ms-1 opacity-70">
                    ≈ {formatBytes(
                      backupSizeEstimate.localStorageBytes +
                        backupSizeEstimate.azkarBytes +
                        backupSizeEstimate.surahsBytes +
                        backupSizeEstimate.tafsirBytes,
                    )}
                  </span>
                ) : null}
              </span>
            </button>

            <button
              onClick={() => void handleExportBackup(true, true)}
              disabled={backupBusy || (backupSizeEstimate?.audioBytes ?? 0) === 0}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/15 disabled:opacity-50">
              <Download className="h-3.5 w-3.5" />
              <span>
                {isRTL
                  ? "تصدير كامل (يضم الصوتيات المحمَّلة)"
                  : "Full export with downloaded audio"}
                {backupSizeEstimate ? (
                  <span className="ms-1 opacity-70">
                    ≈ {formatBytes(backupSizeEstimate.totalBytes)}
                  </span>
                ) : null}
              </span>
            </button>

            {backupSizeEstimate && backupSizeEstimate.audioBytes > 50 * 1024 * 1024 ? (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                {isRTL
                  ? "تنبيه: تضمين الصوتيات ينتج ملفًا كبيرًا قد لا يستورده بعض الأجهزة ذات الذاكرة المحدودة."
                  : "Heads-up: including audio produces a large file that may be hard to import on low-memory devices."}
              </p>
            ) : null}

            {backupSizeLoading ? (
              <p className="text-[11px] text-muted-foreground">
                {isRTL ? "جار حساب الحجم…" : "Estimating size…"}
              </p>
            ) : null}

            <input
              ref={backupImportRef}
              type="file"
              accept=".json,.wqb,application/json,application/octet-stream"
              className="hidden"
              onChange={(e) => void handleImportBackup(e)}
            />
          </motion.div>
        </section>

        {/* Restore confirmation dialog */}
        <AlertDialog
          open={!!pendingBackup || !!pendingBackupFile}
          onOpenChange={(open) => {
            if (!open) {
              setPendingBackup(null);
              setPendingBackupFile(null);
            }
          }}
        >
          <AlertDialogContent dir={isRTL ? "rtl" : "ltr"}>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {isRTL ? "تأكيد استعادة النسخة الاحتياطية" : "Restore backup?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {isRTL
                  ? `سيتم استبدال جميع البيانات الحالية بالنسخة الاحتياطية المؤرخة في ${pendingBackup ? new Date(pendingBackup.exportedAt).toLocaleString() : ""}. لا يمكن التراجع عن هذا الإجراء.`
                  : `All current data will be replaced with the backup from ${pendingBackup ? new Date(pendingBackup.exportedAt).toLocaleString() : ""}. This cannot be undone.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row-reverse gap-2">
              <AlertDialogAction
                onClick={() => void handleConfirmRestore()}
                disabled={backupBusy}
                className="bg-primary text-primary-foreground hover:bg-primary/90">
                {backupBusy
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : (isRTL ? "استعادة" : "Restore")}
              </AlertDialogAction>
              <AlertDialogCancel>{isRTL ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <section>
          <div className="section-title flex items-center gap-1.5">
            <BookMarked className="h-3.5 w-3.5" />
            {language === "ar" ? "الخصوصية والآداب" : "Privacy & Adab"}
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl border border-primary/15 bg-card/60 p-5 shadow-sm space-y-3"
          >
            <p className="font-arabic text-center text-lg text-gradient" dir="rtl">
              ﴿بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ﴾
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground" dir={isRTL ? "rtl" : "ltr"}>
              {language === "ar"
                ? "هذا التطبيق لا يتتبع المستخدمين، ولا يعرض أي إعلانات، ولا يبيع بياناتك لأحد. تبقى قراءاتك ومحفوظاتك وملاحظاتك على جهازك."
                : "This app does not track users, does not show ads, and does not sell your data. Your reading, memorization, and notes stay on your device."}
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground/80" dir={isRTL ? "rtl" : "ltr"}>
              {language === "ar"
                ? "نسأل الله أن يجعل هذا العمل خالصًا لوجهه الكريم، وأن ينفع به القارئ والمطوّر والمسلمين أجمعين."
                : "We pray that this work is sincere for the sake of Allah, and that it benefits the reader, the developer, and the believers."}
            </p>
          </motion.div>
        </section>

        <section>
          <div className="section-title flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5" />
            {t("about")}
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl gradient-hero p-6 text-center shadow-elevated border border-primary/10">
            
            <p className="font-arabic text-2xl font-bold text-gradient mb-1">Wise QURAN</p>
            <button
              data-testid="settings-version-badge-button"
              onClick={() => setShowChangelog(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors cursor-pointer mb-3">
              
              <Sparkles className="h-3 w-3" />
              v{getEffectiveVersion()}
            </button>

            <Separator className="my-3" />
            <p className="text-sm text-muted-foreground mb-2">{t("about_description")}</p>

            {/* What's New button */}
            <Button
              data-testid="settings-whats-new-button"
              variant="outline"
              size="sm"
              className="w-full gap-2 mb-3"
              onClick={() => setShowChangelog(true)}>
              <Sparkles className="h-3.5 w-3.5" />
              {t("whats_new_button")}
            </Button>

            {/* Check for Updates */}
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 mb-3"
              disabled={checkingUpdate}
              onClick={async () => {
                setCheckingUpdate(true);
                const hasUpdate = await checkForUpdate();
                setCheckingUpdate(false);
                if (!hasUpdate) {
                  toast.success(t("up_to_date"), {
                    description: t("up_to_date_desc"),
                    position: "bottom-center"
                  });
                }
              }}>
              
              {checkingUpdate ?
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> :

              <RefreshCw className="h-3.5 w-3.5" />
              }
              {t("check_updates")}
            </Button>

            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={async () => {
                const shareData = {
                  title: 'Wise QURAN',
                  text: t("share_app_text"),
                  url: 'https://quran.thewise.cloud'
                };
                if (navigator.share) {
                  try {
                    await navigator.share(shareData);
                  } catch (error) {
                    console.error("Error sharing app:", error);
                  }
                } else {
                  await navigator.clipboard.writeText(shareData.url);
                  toast.success(t("copied"));
                }
              }}>

              <Share className="h-4 w-4" />
              {t("share_app")}
            </Button>
          </motion.div>
        </section>

        {/* Changelog Sheet */}
        <Sheet open={showChangelog} onOpenChange={setShowChangelog}>
          <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl px-0 [&>button:last-child]:hidden">
            <SheetHeader className="px-6 pb-4">
              <SheetTitle className="text-center font-arabic text-lg">{t("changelog")}</SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-full px-5 pb-8">
              <div className="space-y-8 pb-6" dir={language === "ar" ? "rtl" : "ltr"}>
                {getMergedChangelog().map((entry, entryIdx) => {
                  const cats = language === "en" ? entry.en : entry.ar;
                  const categoryOrder = ["features", "improvements", "fixes"] as const;
                  const categoryConfig = {
                    features: {
                      label: language === "ar" ? "جديد" : "New",
                      colorClass: "text-amber-500",
                      bgClass: "bg-amber-50 dark:bg-amber-950/30",
                      borderClass: "border-amber-200/60 dark:border-amber-800/40",
                      dotClass: "bg-amber-500",
                    },
                    improvements: {
                      label: language === "ar" ? "تحسينات" : "Improved",
                      colorClass: "text-blue-500",
                      bgClass: "bg-blue-50 dark:bg-blue-950/30",
                      borderClass: "border-blue-200/60 dark:border-blue-800/40",
                      dotClass: "bg-blue-500",
                    },
                    fixes: {
                      label: language === "ar" ? "إصلاحات" : "Fixed",
                      colorClass: "text-emerald-500",
                      bgClass: "bg-emerald-50 dark:bg-emerald-950/30",
                      borderClass: "border-emerald-200/60 dark:border-emerald-800/40",
                      dotClass: "bg-emerald-500",
                    },
                  };
                  return (
                    <motion.div
                      key={entry.version}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.04 * entryIdx, duration: 0.3 }}
                      className="space-y-3"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5">v{entry.version}</Badge>
                        <span className="text-xs text-muted-foreground">{entry.date}</span>
                      </div>
                      <div className="space-y-2">
                        {categoryOrder.map((cat) => {
                          const items = cats[cat];
                          if (!items || items.length === 0) return null;
                          const cfg = categoryConfig[cat];
                          return (
                            <div
                              key={cat}
                              className={`rounded-xl border p-3 ${cfg.bgClass} ${cfg.borderClass}`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`text-xs font-semibold uppercase tracking-wider ${cfg.colorClass}`}>
                                  {cfg.label}
                                </span>
                              </div>
                              <ul className="space-y-1.5">
                                {items.map((item, i) => (
                                  <li
                                    key={i}
                                    className="flex items-start gap-2 text-sm text-foreground/85 leading-relaxed"
                                  >
                                    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dotClass}`} />
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>

        {/* Developer Card */}
        <section>
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
            className="relative p-[2px] rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--gold)), hsl(var(--primary)), hsl(var(--accent)), hsl(var(--gold)), hsl(var(--primary)))',
              backgroundSize: '400% 400%',
              animation: 'gradient-border 3s ease infinite'
            }}>
            
            <div className="bg-card rounded-[14px] p-6 text-center relative overflow-hidden">
              {/* Shimmer overlay */}
              <div
                className="absolute inset-0 opacity-[0.07] pointer-events-none"
                style={{
                  background: 'linear-gradient(110deg, transparent 30%, hsl(var(--gold) / 0.6) 50%, transparent 70%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 3s linear infinite'
                }} />

              {/* Floating neutral geometric decorations */}
              {[
              { symbol: '✦', top: '8px', right: '14px', size: 'text-lg', delay: 0 },
              { symbol: '✧', top: '10px', left: '16px', size: 'text-xl', delay: 0.5 },
              { symbol: '◆', bottom: '10px', right: '18px', size: 'text-xs', delay: 1.2 },
              { symbol: '✦', bottom: '14px', left: '20px', size: 'text-sm', delay: 0.8 },
              { symbol: '✧', top: '50%', right: '10px', size: 'text-xs', delay: 1.5 },
              { symbol: '◇', bottom: '8px', left: '48%', size: 'text-sm', delay: 0.3 }].
              map((item, i) =>
              <motion.span
                key={i}
                className={`absolute ${item.size} pointer-events-none select-none`}
                style={{
                  top: item.top,
                  bottom: item.bottom,
                  left: item.left,
                  right: item.right,
                  opacity: 0.25,
                  color: 'hsl(var(--gold))'
                }}
                animate={{ y: [0, -6, 0], opacity: [0.25, 0.45, 0.25] }}
                transition={{
                  duration: 3.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: item.delay
                }}>
                  {item.symbol}
                </motion.span>
              )}

              {/* Open Source badge */}
              <motion.a
                href="https://github.com/iammagdy/WiseQuran"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mb-3 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors"
                style={{
                  borderColor: 'hsl(var(--primary) / 0.4)',
                  color: 'hsl(var(--primary))',
                  background: 'hsl(var(--primary) / 0.06)'
                }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', delay: 0.3 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}>
                <Github size={11} />
                {language === "en" ? "Open Source" : "مصدر مفتوح"}
              </motion.a>

              {/* Developer badge */}
              <div>
                <motion.span
                  className="inline-block mb-2 px-3 py-0.5 font-bold rounded-full text-sm"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--gold)), hsl(42 90% 60%))',
                    color: 'hsl(var(--gold-foreground))'
                  }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.4 }}>
                  {language === "en" ? "Developer ✦" : "المطوّر ✦"}
                </motion.span>
              </div>

              <p
                className="font-bold text-foreground mb-1 text-2xl"
                style={{ textShadow: '0 0 12px hsl(var(--gold) / 0.3)' }}>
                {language === "en" ? "Magdy Saber" : "مجدي صابر"}
              </p>

              <p className="text-xs text-muted-foreground mb-4">
                {language === "en" ? "Made with ❤️" : "صنع بـ ❤️"}
              </p>

              <div className="flex items-center justify-center gap-3 mb-4">
                {[
                { href: 'mailto:contact@magdysaber.com', icon: <Mail size={18} />, title: 'Email' },
                { href: 'https://github.com/iammagdy', icon: <Github size={18} />, title: 'GitHub' },
                { href: 'https://magdysaber.com', icon: <Globe size={18} />, title: 'Website' }].
                map((link, i) =>
                <motion.a
                  key={i}
                  href={link.href}
                  target={link.href.startsWith('mailto') ? undefined : '_blank'}
                  rel={link.href.startsWith('mailto') ? undefined : 'noopener noreferrer'}
                  title={link.title}
                  className="flex items-center justify-center w-10 h-10 rounded-full transition-colors"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--gold) / 0.2), hsl(var(--primary) / 0.15))',
                    color: 'hsl(var(--primary))'
                  }}
                  whileHover={{ scale: 1.15, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}>
                    {link.icon}
                  </motion.a>
                )}
              </div>

              {/* Get in Touch CTA */}
              <motion.a
                href="mailto:contact@magdysaber.com"
                className="inline-flex items-center justify-center gap-2 w-full max-w-[220px] px-5 py-2.5 rounded-full font-semibold text-sm transition-all"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--gold)), hsl(42 90% 60%))',
                  color: 'hsl(var(--gold-foreground))',
                  boxShadow: '0 2px 14px hsl(var(--gold) / 0.35)'
                }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, type: 'spring', stiffness: 200, damping: 18 }}
                whileHover={{ scale: 1.04, boxShadow: '0 4px 20px hsl(var(--gold) / 0.5)' }}
                whileTap={{ scale: 0.97 }}>
                <Mail size={15} />
                {language === "en" ? "Get in Touch" : "تواصل معي"}
              </motion.a>
            </div>
          </motion.div>
        </section>
        </div>
      </div>
    </div>);

}