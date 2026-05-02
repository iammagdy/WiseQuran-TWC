import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Bell, ClipboardList, Mic, Smartphone, Volume2, Wifi } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { buildAzanSourceList, TAKBIR_URL } from "@/lib/adhan-settings";
import { detectBrowser, getIOSVersion, isIOSVersionAtLeast } from "@/lib/browser-detect";
import { mobileAudioManager } from "@/lib/mobile-audio";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DiagnosticLevel = "info" | "success" | "error";

interface DiagnosticEntry {
  id: string;
  level: DiagnosticLevel;
  message: string;
  createdAt: string;
}

const LOG_KEY = "wise-safari-diagnostics-log";

function StatusCard({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className={cn("rounded-2xl border p-4", ok ? "border-primary/20 bg-primary/5" : "border-border bg-card")}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={cn("text-sm font-semibold", ok ? "text-primary" : "text-foreground")}>{value}</p>
    </div>
  );
}

export default function SafariDiagnosticsPage() {
  const navigate = useNavigate();
  const { language, isRTL } = useLanguage();
  const browser = detectBrowser();
  const iosVersion = getIOSVersion();
  const iosSupported = isIOSVersionAtLeast(14, 5);
  const [logs, setLogs] = useLocalStorage<DiagnosticEntry[]>(LOG_KEY, []);
  const [runningTest, setRunningTest] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    "Notification" in window ? Notification.permission : "denied"
  );

  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const hasSpeechRecognition = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const hasAudioContext = !!(window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
  const hasMediaDevices = !!navigator.mediaDevices?.getUserMedia;
  const hasServiceWorker = "serviceWorker" in navigator;

  const pushLog = useCallback((level: DiagnosticLevel, message: string) => {
    setLogs((prev) => [{
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      level,
      message,
      createdAt: new Date().toISOString(),
    }, ...prev].slice(0, 25));
  }, [setLogs]);

  const diagnosticSummary = useMemo(() => {
    const onlineText = navigator.onLine
      ? (language === "ar" ? "متصل" : "Online")
      : (language === "ar" ? "غير متصل" : "Offline");
    const installText = isStandalone
      ? (language === "ar" ? "مثبّت كتطبيق" : "Installed as app")
      : (language === "ar" ? "يعمل داخل المتصفح" : "Running in browser");
    return { onlineText, installText };
  }, [isStandalone, language]);

  const handleAudioTest = useCallback(async () => {
    setRunningTest("audio");
    try {
      const sources = buildAzanSourceList([TAKBIR_URL], browser === "ios-safari");
      await mobileAudioManager.playWithFallback("preview", sources, { resetTime: true, volume: 0.9 });
      pushLog("success", language === "ar" ? "اختبار الصوت نجح — بدأ التشغيل فورًا" : "Audio test succeeded — playback started immediately.");
    } catch {
      pushLog("error", language === "ar" ? "اختبار الصوت فشل — تحقق من إذن الصوت أو الاتصال" : "Audio test failed — check audio permission or connection.");
    } finally {
      setRunningTest(null);
    }
  }, [browser, language, pushLog]);

  const handleMicTest = useCallback(() => {
    setRunningTest("mic");
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      pushLog("error", language === "ar" ? "واجهة التسميع غير مدعومة على هذا الجهاز" : "Speech recognition is not supported on this device.");
      setRunningTest(null);
      return;
    }

    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = "ar-SA";
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.onstart = () => pushLog("success", language === "ar" ? "تم فتح جلسة الميكروفون بنجاح" : "Microphone session started successfully.");
      recognition.onerror = (event) => {
        pushLog("error", language === "ar" ? `خطأ في الميكروفون: ${event.error}` : `Microphone error: ${event.error}`);
        setRunningTest(null);
      };
      recognition.onend = () => setRunningTest(null);
      recognition.start();
      window.setTimeout(() => {
        try {
          recognition.stop();
        } catch {
          // ignore duplicate stop on Safari
        }
      }, 1800);
    } catch {
      pushLog("error", language === "ar" ? "تعذر بدء اختبار الميكروفون" : "Could not start microphone test.");
      setRunningTest(null);
    }
  }, [language, pushLog]);

  const handleNotificationTest = useCallback(async () => {
    setRunningTest("notifications");
    try {
      if (!("Notification" in window)) {
        pushLog("error", language === "ar" ? "الإشعارات غير مدعومة في هذا المتصفح" : "Notifications are not supported in this browser.");
        return;
      }
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      pushLog(permission === "granted" ? "success" : "info", permission === "granted"
        ? (language === "ar" ? "تم منح إذن الإشعارات" : "Notification permission granted.")
        : (language === "ar" ? `تم إرجاع حالة الإشعار: ${permission}` : `Notification permission returned: ${permission}`));
    } finally {
      setRunningTest(null);
    }
  }, [language, pushLog]);

  return (
    <div className="px-4 pt-6 pb-24" dir={isRTL ? "rtl" : "ltr"}>
      <div className="mb-6 flex items-center gap-3">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} className="rounded-xl glass-card p-2.5 shadow-soft" data-testid="safari-diagnostics-back-button">
          {isRTL ? <ArrowRight className="h-5 w-5 text-foreground" /> : <ArrowLeft className="h-5 w-5 text-foreground" />}
        </motion.button>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold heading-decorated" data-testid="safari-diagnostics-title">{language === "ar" ? "تشخيص Safari" : "Safari Diagnostics"}</h1>
          <p className="text-xs text-muted-foreground" data-testid="safari-diagnostics-subtitle">
            {language === "ar" ? "افحص الصوت والمايك والتثبيت على iPhone Safari" : "Check audio, mic, and install status on iPhone Safari."}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <StatusCard label={language === "ar" ? "المتصفح" : "Browser"} value={browser === "ios-safari" ? "iPhone Safari" : browser} ok={browser === "ios-safari"} />
          <StatusCard label={language === "ar" ? "الاتصال" : "Connection"} value={diagnosticSummary.onlineText} ok={navigator.onLine} />
          <StatusCard label={language === "ar" ? "تثبيت التطبيق" : "Install Mode"} value={diagnosticSummary.installText} ok={isStandalone} />
          <StatusCard label={language === "ar" ? "الإشعارات" : "Notifications"} value={notificationPermission} ok={notificationPermission === "granted"} />
        </div>

        <div className="rounded-2xl glass-card p-4 shadow-soft border border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <Smartphone className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">{language === "ar" ? "تفاصيل الجهاز" : "Device Details"}</p>
          </div>
          <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground">
            <p data-testid="safari-diagnostics-ios-version">{language === "ar" ? "إصدار iOS" : "iOS Version"}: {iosVersion ? `${iosVersion.major}.${iosVersion.minor}` : (language === "ar" ? "غير معروف" : "Unknown")}</p>
            <p>{language === "ar" ? "دعم iOS 14.5+" : "iOS 14.5+ Support"}: {iosSupported === false ? (language === "ar" ? "بحاجة لتحديث" : "Needs update") : (language === "ar" ? "جاهز" : "Ready")}</p>
            <p>{language === "ar" ? "SpeechRecognition" : "SpeechRecognition"}: {hasSpeechRecognition ? "Yes" : "No"}</p>
            <p>{language === "ar" ? "AudioContext" : "AudioContext"}: {hasAudioContext ? "Yes" : "No"}</p>
            <p>{language === "ar" ? "getUserMedia" : "getUserMedia"}: {hasMediaDevices ? "Yes" : "No"}</p>
            <p>{language === "ar" ? "Service Worker" : "Service Worker"}: {hasServiceWorker ? "Yes" : "No"}</p>
          </div>
        </div>

        <div className="rounded-2xl glass-card p-4 shadow-soft border border-border/50 space-y-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">{language === "ar" ? "اختبارات سريعة" : "Quick Tests"}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button data-testid="safari-diagnostics-audio-test-button" className="justify-start gap-2" onClick={handleAudioTest} disabled={runningTest !== null}>
              <Volume2 className="h-4 w-4" />
              {runningTest === "audio" ? (language === "ar" ? "جارٍ الاختبار..." : "Testing...") : (language === "ar" ? "اختبار الصوت" : "Test Audio")}
            </Button>
            <Button data-testid="safari-diagnostics-mic-test-button" variant="outline" className="justify-start gap-2" onClick={handleMicTest} disabled={runningTest !== null}>
              <Mic className="h-4 w-4" />
              {runningTest === "mic" ? (language === "ar" ? "جارٍ الاختبار..." : "Testing...") : (language === "ar" ? "اختبار الميكروفون" : "Test Microphone")}
            </Button>
            <Button data-testid="safari-diagnostics-notification-test-button" variant="outline" className="justify-start gap-2" onClick={handleNotificationTest} disabled={runningTest !== null}>
              <Bell className="h-4 w-4" />
              {runningTest === "notifications" ? (language === "ar" ? "جارٍ الطلب..." : "Requesting...") : (language === "ar" ? "فحص الإشعارات" : "Check Notifications")}
            </Button>
          </div>
          <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground" data-testid="safari-diagnostics-help-box">
            {language === "ar"
              ? "إذا فشل الميكروفون بعد الرفض الأول، افتح Settings > Safari > Microphone واسمح للتطبيق باستخدامه."
              : "If microphone access fails after a previous denial, open Settings > Safari > Microphone and allow access for the app."}
          </div>
        </div>

        <div className="rounded-2xl glass-card p-4 shadow-soft border border-border/50">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">{language === "ar" ? "سجل الفحوصات" : "Diagnostics History"}</p>
            </div>
            <button data-testid="safari-diagnostics-clear-log-button" onClick={() => setLogs([])} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              {language === "ar" ? "مسح السجل" : "Clear log"}
            </button>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="rounded-xl bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground" data-testid="safari-diagnostics-empty-log">
                {language === "ar" ? "لا توجد نتائج بعد — شغّل اختبارًا لبدء التسجيل." : "No results yet — run a test to start logging."}
              </div>
            ) : logs.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-border/40 bg-background/60 px-3 py-3" data-testid={`safari-diagnostics-log-${entry.id}`}>
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className={cn("text-[11px] font-bold uppercase", entry.level === "success" ? "text-primary" : entry.level === "error" ? "text-destructive" : "text-muted-foreground")}>{entry.level}</span>
                  <span className="text-[11px] text-muted-foreground">{new Date(entry.createdAt).toLocaleString(language === "ar" ? "ar-SA" : "en-US")}</span>
                </div>
                <p className="text-sm text-foreground">{entry.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}