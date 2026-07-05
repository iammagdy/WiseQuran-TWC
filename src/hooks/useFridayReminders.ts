import { useEffect } from "react";
import { showAppNotification } from "@/lib/notifications";
import { logger } from "@/lib/logger";

const ENABLED_KEY = "wise-friday-reminder-enabled";
const LAST_FIRED_KEY = "wise-friday-reminder-last-fired";
const SW_SCHEDULED_KEY = "wise-friday-reminder-sw-scheduled";

/**
 * Ask the service worker to pre-schedule a "Jumuʿah" showNotification for
 * the upcoming Friday at 07:00 local time. Because the SW keeps running
 * even when the tab is closed, this gets reminders to users who don't
 * leave the PWA open on Fridays. Falls back silently when the environment
 * lacks SW / messaging support — the in-tab interval below still covers
 * the case where the app is open.
 */
/**
 * Tells the SW to drop any pending Friday reminder timer. Call when the
 * user disables the toggle so an already-scheduled reminder doesn't fire.
 */
export async function cancelFridayReminderInSW(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({ type: "CANCEL_FRIDAY_REMINDER" });
    localStorage.removeItem(SW_SCHEDULED_KEY);
  } catch (err) {
    logger.debug("[friday] sw cancel skipped:", err);
  }
}

async function scheduleFridayReminderInSW(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  const today = new Date();
  const day = today.getDay();
  const daysUntilFriday = day === 5 ? 0 : (5 - day + 7) % 7;
  const target = new Date(today);
  target.setDate(target.getDate() + daysUntilFriday);
  target.setHours(7, 0, 0, 0);
  if (target.getTime() <= Date.now()) {
    // Already past 7am today and it's Friday; schedule next week.
    target.setDate(target.getDate() + 7);
  }

  const key = `${target.toISOString().split("T")[0]}`;
  if (localStorage.getItem(SW_SCHEDULED_KEY) === key) return;

  try {
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({
      type: "SCHEDULE_FRIDAY_REMINDER",
      fireAt: target.getTime(),
      key,
      title: "جمعة مباركة",
      body: "افتح وضع الجمعة لقراءة سورة الكهف والإكثار من الصلاة على النبي ﷺ",
    });
    localStorage.setItem(SW_SCHEDULED_KEY, key);
  } catch (err) {
    logger.debug("[friday] sw schedule skipped:", err);
  }
}

function getTodayKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isFridayNow() {
  return new Date().getDay() === 5;
}

/**
 * Phase C: register Periodic Background Sync where the browser supports
 * it. The SW responds to the `wise-reminders` tag by re-rehydrating the
 * adhan timer and broadcasting `WISE_REARM_REMINDERS` back to clients,
 * which causes the hook below to call `scheduleFridayReminderInSW()`
 * with a fresh `fireAt`. This guards against multi-day closed-tab
 * windows where the SW's `setTimeout` could otherwise be evicted.
 *
 * On unsupported browsers (Safari, Firefox, and Chromium without the
 * site permission) the call returns false and the existing in-tab
 * `setInterval` keeps doing the work whenever the app is open.
 */
export async function registerReminderPeriodicSync(): Promise<boolean> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return false;
  try {
    const reg = (await navigator.serviceWorker.ready) as ServiceWorkerRegistration & {
      periodicSync?: { register: (tag: string, opts?: { minInterval: number }) => Promise<void> };
    };
    if (!reg.periodicSync) return false;
    // Permissions API gate — periodic-sync requires an explicit grant
    // and silently rejects without it.
    const perms = (navigator as Navigator & {
      permissions?: { query: (d: { name: string }) => Promise<PermissionStatus> };
    }).permissions;
    if (perms) {
      try {
        const status = await perms.query({ name: "periodic-background-sync" });
        if (status.state !== "granted") return false;
      } catch {
        return false;
      }
    }
    await reg.periodicSync.register("wise-reminders", {
      minInterval: 12 * 60 * 60 * 1000, // ~twice a day; browser may throttle.
    });
    return true;
  } catch (err) {
    logger.debug("[friday] periodic-sync register skipped:", err);
    return false;
  }
}

export function useFridayReminders() {
  useEffect(() => {
    const checkReminder = () => {
      const enabled = localStorage.getItem(ENABLED_KEY) === "true";
      if (!enabled || !isFridayNow()) return;

      const now = new Date();
      const currentHour = now.getHours();
      const today = getTodayKey();
      const lastFired = localStorage.getItem(LAST_FIRED_KEY);

      if (currentHour < 7 || lastFired === today) return;

      showAppNotification("جمعة مباركة", {
        body: "افتح وضع الجمعة لقراءة سورة الكهف والإكثار من الصلاة على النبي ﷺ",
        dir: "rtl",
        lang: "ar",
        tag: `wise-friday-reminder-${today}`,
      }).then((shown) => {
        if (shown) {
          localStorage.setItem(LAST_FIRED_KEY, today);
        }
      });
    };

    checkReminder();
    // Try to pre-schedule via the SW so users still get the reminder
    // even if the PWA tab is closed by Friday morning.
    if (localStorage.getItem(ENABLED_KEY) === "true") {
      void scheduleFridayReminderInSW();
      void registerReminderPeriodicSync();
    }
    const interval = window.setInterval(checkReminder, 60_000);

    // SW periodic-sync wakeup: clear the cached "already scheduled"
    // marker so the next post resends a fresh `fireAt` to the SW.
    const handleSwMessage = (ev: MessageEvent) => {
      const data = ev.data as { type?: string } | null;
      if (data?.type === "WISE_REARM_REMINDERS") {
        if (localStorage.getItem(ENABLED_KEY) === "true") {
          localStorage.removeItem(SW_SCHEDULED_KEY);
          void scheduleFridayReminderInSW();
        }
      }
    };
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleSwMessage);
    }

    return () => {
      window.clearInterval(interval);
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", handleSwMessage);
      }
    };
  }, []);
}