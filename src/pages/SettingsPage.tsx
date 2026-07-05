import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toArabicNumerals } from "@/lib/utils";
import { motion } from "framer-motion";
import { Moon, Sun, Trash2, Download, Check, ChevronDown, ChevronUp, Volume2, Loader as Loader2, Target, Type, Palette, Info, Bell, BellOff, Mic, BookOpen, Smartphone, Share, CircleCheck as CheckCircle, RotateCcw, Star, Clock, Pause, MoveVertical as MoreVertical, Menu, HardDrive, FileText, Music, BookMarked, Mail, Github, Globe, Sparkles, RefreshCw, Play, Square, User, LogOut, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ADHAN_VOICES, ADHAN_STORAGE_KEY, DEFAULT_ADHAN_SETTINGS, TAKBIR_URL, type AdhanSettings } from "@/lib/adhan-settings";
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
import { clearAllData, getAllDownloadedSurahs, getAllDownloadedAudio, clearAllAudio, deleteAudio, getAudio, getStorageStats, clearAllTafsir } from "@/lib/db";
import { downloadAllSurahs, fetchSurahList, type SurahMeta } from "@/lib/quran-api";
import { downloadSurahAudio, formatBytes, verifyAndRepairDownloads } from "@/lib/quran-audio";
import { RECITERS, DEFAULT_RECITER, getReciterAyahAudioUrl, getReciterAudioUrl } from "@/lib/reciters";
import { TAFSIR_EDITIONS, DEFAULT_TAFSIR } from "@/data/tafsir-editions";
import { TRANSLATION_EDITIONS, DEFAULT_TRANSLATION } from "@/data/translation-editions";
import { toast } from "sonner";
import { isRamadanNow, isRamadanTabVisible, hideRamadanTab, showRamadanTab } from "@/hooks/useRamadan";
import { APP_VERSION, changelog } from "@/data/changelog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useServiceWorkerUpdate } from "@/hooks/useServiceWorkerUpdate";
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

export default function SettingsPage() {
  const { theme, toggleTheme, uiScale, setUIScale } = useTheme();
  const { t, language, setLanguage, isRTL } = useLanguage();
  const { user, signOut } = useAuth();
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
      const stats = await getStorageStats();
      setStorageStats(stats);
    } catch {/* ignore */}
    setLoadingStats(false);
  }, []);

  // Adhan voice preview
  const [previewingAdhan, setPreviewingAdhan] = useState<string | null>(null);
  const adhanPreviewRef = useRef<HTMLAudioElement | null>(null);

  const stopAdhanPreview = useCallback(() => {
    if (adhanPreviewRef.current) {
      adhanPreviewRef.current.pause();
      adhanPreviewRef.current.src = "";
      adhanPreviewRef.current = null;
    }
    setPreviewingAdhan(null);
  }, []);

  const toggleAdhanPreview = useCallback((voiceId: string, src: string) => {
    if (previewingAdhan === voiceId) {
      stopAdhanPreview();
      return;
    }
    stopAdhanPreview();
    const audio = new Audio(src);
    audio.volume = Math.max(0, Math.min(1, adhanSettings.adhanVolume / 100));
    adhanPreviewRef.current = audio;
    setPreviewingAdhan(voiceId);
    audio.play().catch(() => {
      setPreviewingAdhan(null);
      toast.error(language === "ar" ? "تعذّر تشغيل الأذان. تحقق من اتصالك بالإنترنت." : "Could not play adhan. Check your internet connection.");
    });
    audio.addEventListener("ended", () => {
      adhanPreviewRef.current = null;
      setPreviewingAdhan(null);
    });
  }, [previewingAdhan, stopAdhanPreview, adhanSettings.adhanVolume]);

  // Preview reciter audio
  const [previewingReciter, setPreviewingReciter] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const stopPreview = useCallback(() => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.src = "";
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
    const audio = new Audio();
    previewAudioRef.current = audio;
    // Silent unlock for iOS/Safari
    audio.play().catch(() => {});

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

    audio.addEventListener("canplay", () => {
      clearTimeout(timeoutId);
      setPreviewLoading(null);
      setPreviewingReciter(r.id);
      audio.play().catch(() => {
        setPreviewingReciter(null);
      });
    }, { once: true });

    audio.addEventListener("ended", () => {
      setPreviewingReciter(null);
    }, { once: true });

    audio.addEventListener("error", () => {
      clearTimeout(timeoutId);
      setPreviewLoading(null);
      setPreviewingReciter(null);
      toast.error(t("settings_toast_preview_error"));
    }, { once: true });

    // Set src after listeners are attached
    audio.src = url;
    audio.preload = "auto";

    audio.load();
  }, [previewingReciter, stopPreview]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, []);

  // PWA Install
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const browserType = detectBrowser();
  const installInstructions = getInstallInstructions(browserType, language);
  const isIOS = browserType === "ios-safari";
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
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setIsInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
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
    getAllDownloadedSurahs().then(setDownloadedSurahs);
    getAllDownloadedAudio(reciterId).then(setDownloadedAudio);
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
    const updated = await getAllDownloadedSurahs();
    setDownloadedSurahs(updated);
    setDownloading(false);
    refreshStorageStats();
    if (updated.length === 114) {
      toast.success(t("settings_toast_quran_downloaded"));
    }
  };

  const handleClear = async () => {
    await clearAllData();
    setDownloadedSurahs([]);
    setDownloadedAudio([]);
    refreshStorageStats();
    toast.success(t("settings_toast_data_cleared"));
  };

  const handleDownloadAllAudio = async () => {
    setAudioDownloading(true);
    const total = 114;
    for (let i = 1; i <= total; i++) {
      if (!downloadedAudio.includes(i)) {
        try {await downloadSurahAudio(reciterId, i);} catch {/* continue */}
      }
      setAudioDownloadProgress(Math.round(i / total * 100));
    }
    const updated = await getAllDownloadedAudio(reciterId);
    setDownloadedAudio(updated);
    setAudioDownloading(false);
    refreshStorageStats();
    toast.success(t("settings_toast_audio_downloaded"));
  };

  const handleClearAllAudio = async () => {
    await clearAllAudio();
    setDownloadedAudio([]);
    refreshStorageStats();
    toast.success(t("settings_toast_audio_cleared"));
  };

  const handleDownloadSingleAudio = async (num: number) => {
    setSingleAudioDownloading(num);
    try {
      const size = await downloadSurahAudio(reciterId, num);
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
    await deleteAudio(reciterId, num);
    const updated = await getAllDownloadedAudio(reciterId);
    setDownloadedAudio(updated);
    refreshStorageStats();
  };

  const handleClearTafsir = async () => {
    await clearAllTafsir();
    refreshStorageStats();
    toast.success(t("settings_toast_tafsir_cleared"));
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
    <div className="px-4 pt-6 pl-[5px] pb-[20px]" dir={isRTL ? "rtl" : "ltr"}>
      <h1 className="mb-1 text-2xl font-bold heading-decorated">{t("settings_title")}</h1>
      <p className="mb-6 text-sm text-muted-foreground">{t("settings_subtitle")}</p>

      <div className="space-y-6">
        {/* ─── Account ─── */}
        <section>
          <div className="section-title flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            {isRTL ? "الحساب" : "Account"}
          </div>
          <FadeSection className="rounded-xl bg-card shadow-sm overflow-hidden">
            {user ? (
              <div className="px-4 py-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary uppercase">
                      {user.email?.[0] ?? "U"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{user.email}</p>
                    <p className="text-xs text-muted-foreground">{isRTL ? "حساب نشط" : "Active account"}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                  onClick={async () => { await signOut(); }}
                >
                  <LogOut className="h-4 w-4 me-2" />
                  {isRTL ? "تسجيل الخروج" : "Sign Out"}
                </Button>
              </div>
            ) : (
              <div className="px-4 py-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{isRTL ? "غير مسجّل" : "Not signed in"}</p>
                    <p className="text-xs text-muted-foreground">{isRTL ? "سجّل الدخول لحفظ تقدمك عبر أجهزتك" : "Sign in to save progress across devices"}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => navigate("/signin")}
                >
                  <LogIn className="h-4 w-4 me-2" />
                  {isRTL ? "تسجيل الدخول" : "Sign In"}
                </Button>
              </div>
            )}
          </FadeSection>
        </section>

        {/* ─── Language ─── */}
        <section>
          <div className="section-title flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" />
            {t("language")}
          </div>
          <FadeSection className="rounded-xl bg-card shadow-sm overflow-hidden">
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
          </FadeSection>
        </section>

        {/* ─── Translation ─── */}
        <section>
          <div className="section-title flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" />
            {t("translation_section")}
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.01 }}
            className="rounded-xl bg-card shadow-sm overflow-hidden">

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
                      <span className="flex-1 text-right">{t.name}</span>
                      <span className="text-xs text-muted-foreground">{t.language}</span>
                    </button>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </motion.div>
        </section>

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
                          onClick={() => toggleAdhanPreview(voice.id, voice.file)}
                          className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors shrink-0 ${
                            previewingAdhan === voice.id
                              ? "bg-primary/15 text-primary"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {previewingAdhan === voice.id
                            ? <><Square className="h-3 w-3" /> {language === "ar" ? "إيقاف" : "Stop"}</>
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
                      {language === "ar" ? toArabicNumerals(String(adhanSettings.adhanVolume)) : adhanSettings.adhanVolume}%
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

            {/* Chime volume */}
            {(adhanSettings.preReminderMinutes > 0 || adhanSettings.postReminderMinutes > 0) && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    {language === "ar" ? "مستوى صوت التذكيرات" : "Reminder Chime Volume"}
                  </p>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {language === "ar" ? toArabicNumerals(String(adhanSettings.reminderVolume)) : adhanSettings.reminderVolume}%
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
                onClick={() => {
                  const voice = ADHAN_VOICES.find((v) => v.id === adhanSettings.voiceId) ?? ADHAN_VOICES[0];
                  const src = adhanSettings.takbirOnlyMode
                    ? TAKBIR_URL
                    : voice.file;
                  const audio = new Audio(src);
                  audio.volume = Math.max(0, Math.min(1, adhanSettings.adhanVolume / 100));
                  audio.play().catch(() => {
                    toast.error(language === "ar" ? "تعذّر تشغيل الأذان. تحقق من اتصالك بالإنترنت." : "Could not play adhan. Check your internet connection.");
                  });
                }}
                className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors"
              >
                <Play className="h-3.5 w-3.5" />
                {language === "ar" ? "اختبر الأذان الآن" : "Test Adhan Now"}
              </button>
              <button
                onClick={() => {
                  if (!("Notification" in window) || Notification.permission !== "granted") {
                    toast.error(language === "ar" ? "يرجى منح إذن الإشعارات أولاً" : "Please grant notification permission first");
                    return;
                  }
                  new Notification(language === "ar" ? "حان وقت الصلاة 🕌" : "Prayer Time 🕌", {
                    body: language === "ar" ? "هذا اختبار للإشعارات" : "This is a test notification",
                    icon: "/icons/icon-192.png",
                  });
                }}
                className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors"
              >
                <Bell className="h-3.5 w-3.5" />
                {language === "ar" ? "اختبر الإشعار" : "Test Notification"}
              </button>
            </div>
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
                    {t("downloads_downloading")} {language === "en" ? `${downloadProgress}%` : toArabicNumerals(`${downloadProgress}%`)}
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
                    {t("downloads_downloading_audio")} {language === "en" ? `${audioDownloadProgress}%` : toArabicNumerals(`${audioDownloadProgress}%`)}
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

        {/* ─── Install PWA ─── */}
        {!isInstalled &&
        <section>
            <div className="section-title flex items-center gap-1.5">
              <Smartphone className="h-3.5 w-3.5" />
              {t("install_app")}
            </div>
            <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-xl bg-card p-5 shadow-sm">

              {isIOS ?
            <div className="space-y-3 text-center">
                  <p className="text-sm text-foreground">{t("install_app_ios_intro")}</p>
                  <div className="flex flex-col items-center gap-2 rounded-lg bg-muted/50 p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-medium">1.</span>
                      <span>{installInstructions.step1}</span>
                      <Share className="h-4 w-4" />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-medium">2.</span>
                      <span>{installInstructions.step2}</span>
                    </div>
                  </div>
                </div> :
            deferredPrompt ?
            <div className="text-center space-y-3">
                  <p className="text-sm text-muted-foreground">{t("install_subtitle")}</p>
                  <button
                onClick={handleInstall}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">

                    <Download className="h-4 w-4" />
                    {t("install_app")}
                  </button>
                </div> :

            <div className="space-y-3 text-center">
                  <p className="text-sm text-foreground">{t("install_app_intro")}</p>
                  <div className="flex flex-col items-center gap-2 rounded-lg bg-muted/50 p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-medium">1.</span>
                      <span>{installInstructions.step1}</span>
                      {browserType === "chromium" && <MoreVertical className="h-4 w-4" />}
                      {browserType === "firefox" && <Menu className="h-4 w-4" />}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-medium">2.</span>
                      <span>{installInstructions.step2}</span>
                    </div>
                  </div>
                </div>
            }
            </motion.div>
          </section>
        }

        {isInstalled &&
        <section>
            <div className="section-title flex items-center gap-1.5">
              <Smartphone className="h-3.5 w-3.5" />
              {t("install_app")}
            </div>
            <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-xl bg-card p-5 shadow-sm">

              <div className="flex items-center justify-center gap-2 text-sm text-primary">
                <CheckCircle className="h-4 w-4" />
                <span>{t("install_app_already")}</span>
              </div>
            </motion.div>
          </section>
        }

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

        {/* ─── Ramadan Tab Visibility ─── */}
        {isRamadanNow() &&
        <section>
            <div className="section-title flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5" />
              {t("ramadan_tab")}
            </div>
            <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.17 }}
            className="rounded-xl bg-card p-4 shadow-sm">

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg">🌙</span>
                  <span className="text-sm font-medium">{t("ramadan_show_tab")}</span>
                </div>
                <Switch
                checked={isRamadanTabVisible()}
                onCheckedChange={(checked) => {
                  if (checked) {
                    showRamadanTab();
                  } else {
                    hideRamadanTab();
                  }
                  toast.success(checked ? t("ramadan_tab_shown") : t("ramadan_tab_hidden"));
                  setTimeout(() => window.location.reload(), 500);
                }} />

              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {t("ramadan_show_tab_desc")}
              </p>
            </motion.div>
          </section>
        }

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
              onClick={() => setShowChangelog(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors cursor-pointer mb-3">
              
              <Sparkles className="h-3 w-3" />
              v{APP_VERSION}
            </button>

            <Separator className="my-3" />
            <p className="text-sm text-muted-foreground mb-2">{t("about_description")}</p>

            {/* What's New button */}
            <Button
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
          <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl px-0 [&>button:last-child]:hidden">
            <SheetHeader className="px-6 pb-4">
              <SheetTitle className="text-center font-arabic text-lg">{t("changelog")}</SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-full px-6 pb-8">
              <div className="space-y-6">
                {changelog.map((entry) =>
                <div key={entry.version} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-mono text-xs">v{entry.version}</Badge>
                      <span className="text-xs text-muted-foreground">{entry.date}</span>
                    </div>
                    <ul className="space-y-1.5 pr-4" dir={language === "ar" ? "rtl" : "ltr"}>
                      {(language === "en" ? entry.changesEn : entry.changes).map((change, i) =>
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          {change}
                        </li>
                    )}
                    </ul>
                  </div>
                )}
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
              

              {/* Floating Ramadan emojis */}
              {[
              { emoji: '🏮', top: '6px', right: '12px', size: 'text-xl', delay: 0 },
              { emoji: '🌙', top: '8px', left: '14px', size: 'text-2xl', delay: 0.5 },
              { emoji: '⭐', bottom: '8px', right: '16px', size: 'text-sm', delay: 1.2 },
              { emoji: '✨', bottom: '12px', left: '18px', size: 'text-base', delay: 0.8 },
              { emoji: '🕌', top: '50%', right: '8px', size: 'text-sm', delay: 1.5 },
              { emoji: '🏮', bottom: '6px', left: '50%', size: 'text-lg', delay: 0.3 }].
              map((item, i) =>
              <motion.span
                key={i}
                className={`absolute ${item.size} pointer-events-none select-none`}
                style={{
                  top: item.top,
                  bottom: item.bottom,
                  left: item.left,
                  right: item.right,
                  opacity: 0.35
                }}
                animate={{ y: [0, -8, 0] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: item.delay
                }}>
                
                  {item.emoji}
                </motion.span>
              )}

              {/* Developer badge */}
              <motion.span
                className="inline-block mb-2 px-3 py-0.5 font-bold rounded-full text-sm bg-accent"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--gold)), hsl(42 90% 60%))',
                  color: 'hsl(var(--gold-foreground))'
                }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.4 }}>
                
                {language === "en" ? "Developer ✦" : "المطوّر ✦"}
              </motion.span>

              <p
                className="font-bold text-foreground mb-1 text-2xl"
                style={{ textShadow: '0 0 12px hsl(var(--gold) / 0.3)' }}>

                {language === "en" ? "Magdy Saber" : "مجدي صابر"}
              </p>

              <p className="text-xs text-muted-foreground mb-4">
                {language === "en" ? "Made with ❤️ in Ramadan 🌙" : "صنع بـ ❤️ في رمضان 🌙"}
              </p>

              <div className="flex items-center justify-center gap-3">
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
                  className="flex items-center justify-center w-10 h-10 rounded-full text-gold-foreground transition-colors"
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
            </div>
          </motion.div>
        </section>
      </div>
    </div>);

}