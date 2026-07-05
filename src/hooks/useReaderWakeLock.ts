import { useEffect, useRef } from "react";

const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000;

export function useReaderWakeLock(active: boolean) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active) return;
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;

    let cancelled = false;
    let inFlight: Promise<void> | null = null;

    const release = () => {
      const lock = wakeLockRef.current;
      wakeLockRef.current = null;
      if (lock) lock.release().catch(() => {});
    };

    const acquire = (): Promise<void> => {
      if (cancelled || wakeLockRef.current || document.hidden) return Promise.resolve();
      if (inFlight) return inFlight;
      inFlight = (async () => {
        try {
          const lock = await navigator.wakeLock.request("screen");
          if (cancelled || wakeLockRef.current || document.hidden) {
            lock.release().catch(() => {});
            return;
          }
          wakeLockRef.current = lock;
          lock.addEventListener("release", () => {
            if (wakeLockRef.current === lock) wakeLockRef.current = null;
          });
        } catch {
          // ignore — not supported, denied, or page hidden
        } finally {
          inFlight = null;
        }
      })();
      return inFlight;
    };

    const scheduleRelease = () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = setTimeout(() => {
        release();
      }, INACTIVITY_TIMEOUT_MS);
    };

    const handleInteraction = () => {
      acquire();
      scheduleRelease();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        release();
      } else {
        acquire();
        scheduleRelease();
      }
    };

    acquire();
    scheduleRelease();

    window.addEventListener("pointerdown", handleInteraction, { passive: true });
    window.addEventListener("touchstart", handleInteraction, { passive: true });
    window.addEventListener("scroll", handleInteraction, { passive: true });
    window.addEventListener("keydown", handleInteraction);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
      window.removeEventListener("scroll", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      release();
    };
  }, [active]);
}
