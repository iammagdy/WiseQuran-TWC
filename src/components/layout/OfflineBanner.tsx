import { useEffect, useState } from "react";
import { WifiOff, CloudAlert } from "lucide-react";
import { useSyncQueueContext } from "@/contexts/SyncQueueContext";
import { getLastFlushMs } from "@/lib/syncQueue";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";

// How long after the last successful flush we consider sync "behind"
// while queued writes are still present. Tuned so a transient offline
// dip (e.g. 30 s in a tunnel) doesn't constantly flash the banner.
const SYNC_BEHIND_THRESHOLD_MS = 2 * 60 * 1000;

function formatRelative(ms: number, language: "ar" | "en"): string {
  const delta = Math.max(0, Date.now() - ms);
  const mins = Math.round(delta / 60000);
  if (mins < 1) return language === "ar" ? "الآن" : "just now";
  if (mins < 60) return language === "ar" ? `قبل ${mins} د` : `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return language === "ar" ? `قبل ${hours} س` : `${hours}h ago`;
  const days = Math.round(hours / 24);
  return language === "ar" ? `قبل ${days} يوم` : `${days}d ago`;
}

export default function OfflineBanner() {
  const { pendingCount } = useSyncQueueContext();
  const { language } = useLanguage();
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [, forceTick] = useState(0);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    // Tick every 30 s so the "2 minutes ago" relative label stays fresh
    // without re-rendering the rest of the tree.
    const interval = window.setInterval(() => forceTick((n) => n + 1), 30_000);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
      window.clearInterval(interval);
    };
  }, []);

  const lastFlushMs = getLastFlushMs();
  const syncBehind =
    isSupabaseConfigured &&
    pendingCount > 0 &&
    (lastFlushMs === null || Date.now() - lastFlushMs > SYNC_BEHIND_THRESHOLD_MS);

  if (online && !syncBehind) return null;

  const label = !online
    ? language === "ar"
      ? "أنت غير متصل بالإنترنت"
      : "You're offline"
    : language === "ar"
      ? "المزامنة متأخرة"
      : "Sync is behind";

  const detail = lastFlushMs
    ? language === "ar"
      ? `آخر مزامنة: ${formatRelative(lastFlushMs, "ar")}`
      : `Last sync ${formatRelative(lastFlushMs, "en")}`
    : language === "ar"
      ? "لم تتم المزامنة بعد"
      : "Not synced yet";

  const Icon = !online ? WifiOff : CloudAlert;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-40 flex items-center justify-center gap-2 border-b border-amber-500/30 bg-amber-500/15 px-3 py-1.5 text-[0.6875rem] font-semibold text-amber-900 dark:text-amber-200"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{label}</span>
      <span className="text-amber-800/70 dark:text-amber-200/70">· {detail}</span>
    </div>
  );
}
