import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronDown, Star, Zap, X, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { type ChangelogEntry } from "@/data/changelog";
import { getMergedChangelog, getEffectiveVersion } from "@/lib/changelog-overrides";
import { useLanguage } from "@/contexts/LanguageContext";

interface ChangelogModalProps {
  open: boolean;
  newEntries: ChangelogEntry[];
  onDismissTemporary: () => void;
  onDismissPermanent: () => void;
}

const categoryConfig = {
  features: {
    icon: Star,
    colorClass: "text-amber-500",
    bgClass: "bg-amber-50 dark:bg-amber-950/30",
    borderClass: "border-amber-200/60 dark:border-amber-800/40",
    labelAr: "جديد",
    labelEn: "New",
  },
  improvements: {
    icon: Zap,
    colorClass: "text-blue-500",
    bgClass: "bg-blue-50 dark:bg-blue-950/30",
    borderClass: "border-blue-200/60 dark:border-blue-800/40",
    labelAr: "تحسينات",
    labelEn: "Improved",
  },
  fixes: {
    icon: CheckCircle2,
    colorClass: "text-emerald-500",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/30",
    borderClass: "border-emerald-200/60 dark:border-emerald-800/40",
    labelAr: "إصلاحات",
    labelEn: "Fixed",
  },
} as const;

type CategoryKey = keyof typeof categoryConfig;

function CategorySection({
  category,
  items,
  index,
  language,
}: {
  category: CategoryKey;
  items: string[];
  index: number;
  language: string;
}) {
  const config = categoryConfig[category];
  const Icon = config.icon;
  const label = language === "ar" ? config.labelAr : config.labelEn;
  const isRTL = language === "ar";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 * index, duration: 0.35, ease: "easeOut" }}
      className={`rounded-xl border p-3 ${config.bgClass} ${config.borderClass}`}
    >
      <div className="flex items-center gap-2 mb-2.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/70 dark:bg-white/10 shadow-sm">
          <Icon className={`h-3.5 w-3.5 ${config.colorClass}`} />
        </div>
        <span className={`text-xs font-semibold uppercase tracking-wider ${config.colorClass}`}>
          {label}
        </span>
      </div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: isRTL ? 8 : -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.08 * index + 0.04 * i, duration: 0.3 }}
            className="flex items-start gap-2 text-sm text-foreground/85 leading-relaxed"
          >
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${config.colorClass.replace("text-", "bg-")}`} />
            {item}
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}

export function VersionBlock({
  entry,
  language,
  entryIndex,
}: {
  entry: ChangelogEntry;
  language: string;
  entryIndex: number;
}) {
  const categories = language === "ar" ? entry.ar : entry.en;
  const categoryOrder: CategoryKey[] = ["features", "improvements", "fixes"];
  let sectionIndex = 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * entryIndex, duration: 0.3 }}
      className="space-y-2.5"
    >
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5">
          v{entry.version}
        </Badge>
        <span className="text-xs text-muted-foreground">{entry.date}</span>
      </div>
      <div className="space-y-2">
        {categoryOrder.map((cat) => {
          const items = categories[cat];
          if (!items || items.length === 0) return null;
          const idx = sectionIndex++;
          return (
            <CategorySection
              key={cat}
              category={cat}
              items={items}
              index={entryIndex * 3 + idx}
              language={language}
            />
          );
        })}
      </div>
    </motion.div>
  );
}

export default function ChangelogModal({
  open,
  newEntries,
  onDismissTemporary,
  onDismissPermanent,
}: ChangelogModalProps) {
  const [showAll, setShowAll] = useState(false);
  const { language } = useLanguage();
  const isRTL = language === "ar";

  const mergedChangelog = getMergedChangelog();
  const effectiveVersion = getEffectiveVersion();
  const displayEntries = showAll ? mergedChangelog : newEntries;

  const labelGotIt = language === "ar" ? "حسناً، شكراً! لن يظهر مجدداً" : "Got it, don't show again";
  const labelLater = language === "ar" ? "لاحقاً" : "Later";
  const labelWhatsNew = language === "ar" ? `ما الجديد في الإصدار ${effectiveVersion}` : `What's new in ${effectiveVersion}`;
  const labelShowAll = language === "ar" ? "عرض كل سجل التحديثات" : "Show full history";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 40 }}
            transition={{ type: "spring", damping: 22, stiffness: 260 }}
            dir={isRTL ? "rtl" : "ltr"}
            className="bg-card rounded-3xl shadow-2xl border border-border/50 w-full max-w-sm overflow-hidden"
          >
            <div className="relative px-6 pt-6 pb-4">
              <button
                onClick={onDismissTemporary}
                className={`absolute top-4 ${isRTL ? "left-4" : "right-4"} flex h-7 w-7 items-center justify-center rounded-full bg-muted/60 hover:bg-muted transition-colors`}
                aria-label="Close"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>

              <div className="flex flex-col items-center text-center gap-3">
                <motion.div
                  initial={{ scale: 0.6, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", damping: 14, stiffness: 200, delay: 0.1 }}
                  className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-sm"
                >
                  <Sparkles className="h-7 w-7 text-primary" />
                </motion.div>
                <div>
                  <motion.h2
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="font-bold text-lg tracking-tight"
                  >
                    {labelWhatsNew}
                  </motion.h2>
                </div>
              </div>
            </div>

            <div className="h-px bg-border/40 mx-6" />

            <div className="max-h-[52vh] overflow-y-auto px-5 py-4 space-y-5 overscroll-contain">
              {displayEntries.map((entry, idx) => (
                <VersionBlock
                  key={entry.version}
                  entry={entry}
                  language={language}
                  entryIndex={idx}
                />
              ))}

              {!showAll && mergedChangelog.length > newEntries.length && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  onClick={() => setShowAll(true)}
                  className="flex w-full items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                  {labelShowAll}
                </motion.button>
              )}
            </div>

            <div className="h-px bg-border/40 mx-6" />

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className={`px-5 py-4 flex flex-col gap-2.5 ${isRTL ? "items-stretch" : "items-stretch"}`}
            >
              <button
                onClick={onDismissPermanent}
                className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 active:scale-[0.98] transition-all"
              >
                {labelGotIt}
              </button>
              <button
                onClick={onDismissTemporary}
                className="w-full rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
              >
                {labelLater}
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
