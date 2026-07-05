import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useServiceWorkerUpdate } from "@/hooks/useServiceWorkerUpdate";
import { useLanguage } from "@/contexts/LanguageContext";

export default function UpdateNotification() {
  const { updateAvailable, isUpdating, applyUpdate } = useServiceWorkerUpdate();
  const { t } = useLanguage();

  return (
    <AnimatePresence>
      {updateAvailable && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-20 left-4 right-4 z-50 rounded-xl border border-border bg-card p-4 shadow-elevated"
        >
          {isUpdating ? (
            <div className="space-y-3 text-center">
              <p className="text-sm font-semibold text-foreground">{t("updating")}</p>
              <Progress value={90} variant="gradient" size="sm" />
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{t("update_available")}</p>
                <p className="text-xs text-muted-foreground">{t("update_description")}</p>
              </div>
              <Button size="sm" variant="gradient" onClick={applyUpdate} className="shrink-0 gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" />
                {t("update")}
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
