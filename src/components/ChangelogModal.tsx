import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronDown } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { APP_VERSION, changelog, type ChangelogEntry } from "@/data/changelog";
import { useLanguage } from "@/contexts/LanguageContext";

interface ChangelogModalProps {
  open: boolean;
  newEntries: ChangelogEntry[];
  onDismiss: () => void;
}

const AUTO_DISMISS_SECONDS = 5;

export default function ChangelogModal({ open, newEntries, onDismiss }: ChangelogModalProps) {
  const [showAll, setShowAll] = useState(false);
  const [countdown, setCountdown] = useState(AUTO_DISMISS_SECONDS);
  const { t, language } = useLanguage();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const displayEntries = showAll ? changelog : newEntries;

  useEffect(() => {
    if (!open) {
      setCountdown(AUTO_DISMISS_SECONDS);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    setCountdown(AUTO_DISMISS_SECONDS);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [open, onDismiss]);

  const progressPct = ((AUTO_DISMISS_SECONDS - countdown) / AUTO_DISMISS_SECONDS) * 100;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={onDismiss}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 20 }}
            className="bg-card rounded-3xl shadow-elevated border border-border/50 w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mx-auto mb-3">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h2 className="font-bold text-lg">{t("app_updated_title")}</h2>
              <p className="text-xs text-muted-foreground mt-1">{t("whats_new")} {APP_VERSION}</p>
            </div>

            <div className="px-6 mb-3">
              <div className="flex items-center justify-between text-[0.65rem] text-muted-foreground mb-1">
                <span>{t("update_auto_dismiss")}</span>
                <span>{countdown}s</span>
              </div>
              <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.9, ease: "linear" }}
                />
              </div>
            </div>

            <div className="h-px bg-border/50 mx-6" />

            <div className="max-h-[40vh] overflow-y-auto px-6 py-4 space-y-4">
              {displayEntries.map((entry, idx) => (
                <motion.div
                  key={entry.version}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * idx }}
                  className="space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono text-xs">v{entry.version}</Badge>
                    <span className="text-xs text-muted-foreground">{entry.date}</span>
                  </div>
                  <ul className="space-y-1.5" dir={language === "ar" ? "rtl" : "ltr"}>
                    {(language === "en" ? entry.changesEn : entry.changes).map((change, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        {change}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}

              {!showAll && changelog.length > newEntries.length && (
                <button
                  onClick={() => setShowAll(true)}
                  className="flex w-full items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                  {t("show_all_changelog")}
                </button>
              )}
            </div>

            <p className="text-center text-[0.65rem] text-muted-foreground pb-4 px-6">
              {language === "ar" ? "اضغط في أي مكان للإغلاق" : "Tap anywhere to dismiss"}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
