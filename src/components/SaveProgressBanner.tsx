import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

const DISMISSED_KEY = "wise-save-progress-dismissed";

export default function SaveProgressBanner() {
  const { user, loading } = useAuth();
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (user) { setShow(false); return; }
    if (localStorage.getItem(DISMISSED_KEY)) return;
    const timer = setTimeout(() => setShow(true), 5000);
    return () => clearTimeout(timer);
  }, [user, loading]);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(DISMISSED_KEY, "1");
  };

  return (
    <AnimatePresence>
      {show && !user && (
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed bottom-24 left-3 right-3 z-40 rounded-xl border border-primary/20 bg-card p-4 shadow-lg"
          dir={isRTL ? "rtl" : "ltr"}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/15">
              <CloudUpload className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground leading-snug">
                {isRTL ? "احفظ تقدمك عبر أجهزتك" : "Save progress across devices"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2.5">
                {isRTL ? "سجّل الدخول لمزامنة بياناتك" : "Sign in to sync your data"}
              </p>
              <Button
                size="sm"
                className="text-xs px-3"
                onClick={() => navigate("/signin")}
              >
                {isRTL ? "تسجيل الدخول" : "Sign In"}
              </Button>
            </div>
            <button
              onClick={dismiss}
              className="shrink-0 rounded-full p-1.5 bg-muted/80 hover:bg-muted text-muted-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
