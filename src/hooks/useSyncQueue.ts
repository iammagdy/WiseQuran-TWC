import { useEffect, useState, useCallback } from "react";
import { flushSyncQueue, getSyncQueueCount, subscribeToQueueChanges } from "@/lib/syncQueue";
import { isSupabaseConfigured } from "@/lib/supabase";

export function useSyncQueue() {
  const [pendingCount, setPendingCount] = useState(0);
  const [flushing, setFlushing] = useState(false);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const count = await getSyncQueueCount();
      setPendingCount(count);
    } catch {
      setPendingCount(0);
    }
  }, []);

  const flush = useCallback(async () => {
    if (!isSupabaseConfigured || !navigator.onLine) return;
    setFlushing(true);
    try {
      await flushSyncQueue();
      await refresh();
    } finally {
      setFlushing(false);
    }
  }, [refresh]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    void refresh();

    if (navigator.onLine) {
      void flush();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        void flush();
      }
    };

    // Phase C: SW posts WISE_FLUSH_QUEUE when Background Sync wakes
    // it on connectivity recovery. We can't run Supabase JS in the SW
    // (no auth session), so we drain from the page on receipt.
    const handleSwMessage = (ev: MessageEvent) => {
      const data = ev.data as { type?: string } | null;
      if (data?.type === "WISE_FLUSH_QUEUE" && navigator.onLine) {
        void flush();
      }
    };

    window.addEventListener("online", flush);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleSwMessage);
    }
    const unsubscribe = subscribeToQueueChanges(refresh);

    return () => {
      window.removeEventListener("online", flush);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", handleSwMessage);
      }
      unsubscribe();
    };
  }, [flush, refresh]);

  return { pendingCount, flushing, refresh, flush };
}
