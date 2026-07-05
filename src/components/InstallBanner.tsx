import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Share, MoveVertical as MoreVertical, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { detectBrowser, getInstallInstructions } from "@/lib/browser-detect";
import { useLanguage } from "@/contexts/LanguageContext";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallBanner() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const browserType = detectBrowser();
  const instructions = getInstallInstructions(browserType);
  const { t, isRTL } = useLanguage();

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if ((navigator as any).standalone === true) return;
    if (localStorage.getItem("wise-install-dismissed")) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShow(true), 2000);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const dismiss = useCallback(() => {
    setShow(false);
    localStorage.setItem("wise-install-dismissed", "1");
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") dismiss();
    setDeferredPrompt(null);
  }, [deferredPrompt, dismiss]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed bottom-20 left-3 right-3 z-50 rounded-xl border border-border bg-card p-4 shadow-lg"
        >
          <button
            onClick={dismiss}
            className="absolute top-3 left-3 rounded-full p-2 bg-muted/80 hover:bg-muted text-foreground transition-colors shadow-sm border border-border/50"
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
