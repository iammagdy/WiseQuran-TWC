import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Menu, MoreVertical, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { detectBrowser, getInstallInstructions, isDesktopDevice, isInAppWebview } from "@/lib/browser-detect";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// ─── Engagement tracking ──────────────────────────────────────────────────────
// Show the install prompt only after the user has visited at least this many times.
const MIN_SESSIONS = 3;
const SESSIONS_KEY = "wise-install-sessions";
// After dismissing, wait 7 days before showing again.
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
const SNOOZED_UNTIL_KEY = "wise-install-snoozed-until";
// Backwards compat: old banner used a permanent dismiss flag.
const LEGACY_DISMISSED_KEY = "wise-install-dismissed";

function isInstalled(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isSnoozed(): boolean {
  // Honour the old permanent-dismiss flag.
  if (localStorage.getItem(LEGACY_DISMISSED_KEY)) return true;
  const until = Number(localStorage.getItem(SNOOZED_UNTIL_KEY) ?? 0);
  return Date.now() < until;
}

function recordSession(): number {
  const prev = Number(localStorage.getItem(SESSIONS_KEY) ?? 0);
  const next = prev + 1;
  localStorage.setItem(SESSIONS_KEY, String(next));
  return next;
}

function snooze() {
  localStorage.setItem(SNOOZED_UNTIL_KEY, String(Date.now() + SNOOZE_MS));
}

// Called when the user accepts the install — push snooze 1 year ahead so the
// banner effectively never reappears (named to reflect intent, not duration).
function dismissForever() {
  localStorage.setItem(SNOOZED_UNTIL_KEY, String(Date.now() + 365 * 24 * 60 * 60 * 1000));
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function InstallBanner() {
  const { installPromptEnabled } = useFeatureFlags();
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const browserType = detectBrowser();
  const instructions = getInstallInstructions(browserType);
  const { t, isRTL } = useLanguage();

  useEffect(() => {
    if (!installPromptEnabled) { setShow(false); return; }
    if (isInstalled()) return;
    if (isSnoozed()) return;
    // Suppress on contexts where install can't actually happen: regular
    // desktop browsers (no value-add for the user) and in-app browsers
    // that strip `beforeinstallprompt` and Add-to-Home-Screen entirely
    // (Facebook, Instagram, Twitter, TikTok, etc.).
    if (isDesktopDevice()) return;
    if (isInAppWebview()) return;

    const sessionCount = recordSession();
    const eligible = sessionCount >= MIN_SESSIONS;

    // Pick up the event captured early in main.tsx (before the splash-screen delay).
    const earlyPrompt = (window as Window & { __installPromptEvent?: BeforeInstallPromptEvent })
      .__installPromptEvent ?? null;
    if (earlyPrompt) {
      setDeferredPrompt(earlyPrompt);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (eligible) {
        setTimeout(() => setShow(true), 1500);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);

    if (eligible) {
      // Show if we already have the event (captured early) or if the browser never
      // fires it (iOS Safari, Firefox — show manual-install instructions).
      if (earlyPrompt || browserType !== "chromium") {
        setTimeout(() => setShow(true), 1500);
      }
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [installPromptEnabled]);

  const dismiss = useCallback(() => {
    setShow(false);
    snooze();
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      dismissForever();
    } else {
      snooze();
    }
    setShow(false);
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed bottom-20 start-3 end-3 z-50 rounded-xl border border-border bg-card p-4 shadow-lg"
        >
          <button
            onClick={dismiss}
            className="absolute top-3 start-3 rounded-full p-2 bg-muted/80 hover:bg-muted text-foreground transition-colors shadow-sm border border-border/50"
            aria-label={t("close")}
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3" dir={isRTL ? "rtl" : "ltr"}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{t("install_app")}</p>
              <p className="text-xs text-muted-foreground">{t("install_subtitle")}</p>
            </div>
            {deferredPrompt ? (
              <Button size="sm" onClick={handleInstall} className="shrink-0">
                {t("install")}
              </Button>
            ) : (
              <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                {browserType === "ios-safari" && <Share className="h-3.5 w-3.5" />}
                {browserType === "chromium" && <MoreVertical className="h-3.5 w-3.5" />}
                {browserType === "firefox" && <Menu className="h-3.5 w-3.5" />}
                <span>{instructions.step1}</span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
