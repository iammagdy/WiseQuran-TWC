import { useState, useEffect, useCallback, useRef } from "react";

export function useServiceWorkerUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let isChecking = false;

    const performCheck = async () => {
      if (!navigator.onLine || isChecking) return;
      isChecking = true;

      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) return;

        setRegistration(reg);

        if (reg.waiting) {
          setUpdateAvailable(true);
          return;
        }

        // Clean up previous listener before adding new one
        abortRef.current?.abort();
        abortRef.current = new AbortController();

        // Force check for new SW
        await reg.update();

        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          });
        }, { signal: abortRef.current.signal });
      } catch {
        // Offline or failed — silently ignore
      } finally {
        isChecking = false;
      }
    };

    // Initial check
    performCheck();

    // Check on visibility change (app returning from background)
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        performCheck();
      }
    };

    // Listen for SW update event from registerSW in main.tsx
    const onSWUpdate = () => setUpdateAvailable(true);
    window.addEventListener("sw-update-available", onSWUpdate);

    window.addEventListener("online", performCheck);
    document.addEventListener("visibilitychange", onVisibilityChange);

    // Periodic check every 30 minutes
    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") performCheck();
    }, 30 * 60 * 1000);

    return () => {
      window.removeEventListener("online", performCheck);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("sw-update-available", onSWUpdate);
      clearInterval(intervalId);
      abortRef.current?.abort();
    };
  }, []);

  const applyUpdate = useCallback(() => {
    if (isUpdating) return;
    setIsUpdating(true);

    const doReload = () => window.location.reload();

    if (registration?.waiting) {
      let reloaded = false;
      const onControllerChange = () => {
        if (reloaded) return;
        reloaded = true;
        navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
        doReload();
      };

      navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

      // Fallback: if controllerchange never fires within 4s, force reload anyway
      setTimeout(() => {
        if (!reloaded) {
          reloaded = true;
          navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
          doReload();
        }
      }, 4000);

      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    } else {
      // No waiting SW — just reload to pick up any cached updates
      setTimeout(doReload, 300);
    }
  }, [registration, isUpdating]);

  const checkForUpdate = useCallback(async (): Promise<boolean> => {
    if (!("serviceWorker" in navigator) || !navigator.onLine) return false;

    try {
      const reg = registration || (await navigator.serviceWorker.getRegistration());
      if (!reg) return false;

      setRegistration(reg);

      // Cache-bust manifest to ensure fresh check
      await fetch(`/manifest.json?v=${Date.now()}`, {
        cache: 'no-cache',
        headers: { 'Cache-Control': 'no-cache' }
      });

      await reg.update();

      if (reg.waiting) {
        setUpdateAvailable(true);
        return true;
      }

      return new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => resolve(false), 15000);

        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) { clearTimeout(timeout); resolve(false); return; }

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed") {
              clearTimeout(timeout);
              setUpdateAvailable(true);
              resolve(true);
            }
          });
        }, { once: true });
      });
    } catch {
      return false;
    }
  }, [registration]);

  return { updateAvailable, isUpdating, applyUpdate, checkForUpdate };
}
