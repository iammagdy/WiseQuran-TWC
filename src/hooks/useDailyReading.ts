import { useLocalStorage } from "./useLocalStorage";
import { useCallback, useEffect, useRef } from "react";
import { useDeviceId } from "./useDeviceId";
import { enqueuedSupabaseWrite } from "@/lib/syncQueue";
import { isSupabaseConfigured } from "@/lib/supabase";

interface DailyReadingData {
  date: string;
  count: number;
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

// Coalesce rapid-fire ayah increments into at most one Supabase write
// every 30 s per device/day. Swipes through Surah al-Baqarah used to
// enqueue hundreds of upserts; the debounce keeps the queue and our
// DB row-updates at a sane rate while still flushing promptly when
// the user stops reading.
const SYNC_DEBOUNCE_MS = 30_000;

export function useDailyReading() {
  const [goal, setGoal] = useLocalStorage<number>("wise-daily-goal", 10);
  const [data, setData] = useLocalStorage<DailyReadingData>("wise-daily-reading", {
    date: getTodayKey(),
    count: 0,
  });
  const deviceId = useDeviceId();

  // Keep a ref always pointing at the latest data so rapid increment calls
  // never read stale closure values between React re-renders.
  const dataRef = useRef(data);
  dataRef.current = data;

  const today = getTodayKey();
  const todayCount = data.date === today ? data.count : 0;

  const pendingSyncRef = useRef<number | null>(null);

  const flushSync = useCallback((snapshot?: DailyReadingData) => {
    if (pendingSyncRef.current !== null) {
      window.clearTimeout(pendingSyncRef.current);
      pendingSyncRef.current = null;
    }
    if (!isSupabaseConfigured) return;
    const toWrite = snapshot ?? dataRef.current;
    enqueuedSupabaseWrite(
      "device_daily_reading",
      "upsert",
      { device_id: deviceId, date: toWrite.date, count: toWrite.count, updated_at: new Date().toISOString() },
      { onConflict: "device_id,date" }
    );
  }, [deviceId]);

  const scheduleSync = useCallback(() => {
    if (!isSupabaseConfigured) return;
    if (pendingSyncRef.current !== null) return; // already scheduled
    pendingSyncRef.current = window.setTimeout(() => {
      pendingSyncRef.current = null;
      const snapshot = dataRef.current;
      enqueuedSupabaseWrite(
        "device_daily_reading",
        "upsert",
        { device_id: deviceId, date: snapshot.date, count: snapshot.count, updated_at: new Date().toISOString() },
        { onConflict: "device_id,date" }
      );
    }, SYNC_DEBOUNCE_MS);
  }, [deviceId]);

  // Make sure an in-flight debounce doesn't lose the final write if the
  // tab is backgrounded or closed mid-reading session.
  useEffect(() => {
    const onHide = () => {
      if (pendingSyncRef.current !== null) flushSync();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") onHide();
    };
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [flushSync]);

  const increment = useCallback(
    (n: number) => {
      const currentDate = getTodayKey();
      const prev = dataRef.current;
      const dayRolledOver = prev.date !== currentDate;
      // On rollover, flush yesterday's final count BEFORE we overwrite
      // `dataRef`, otherwise we'd upsert the new-day snapshot under the
      // stale date and lose yesterday's progress in Supabase.
      if (dayRolledOver) {
        flushSync(prev);
      }
      const newCount = dayRolledOver ? n : prev.count + n;
      const next: DailyReadingData = { date: currentDate, count: newCount };
      dataRef.current = next;
      setData(next);
      scheduleSync();
    },
    [setData, scheduleSync, flushSync]
  );

  return { goal, setGoal, todayCount, increment };
}
