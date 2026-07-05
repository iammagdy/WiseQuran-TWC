import { useState, useEffect, useCallback, useRef } from "react";
import { useLocalStorage } from "./useLocalStorage";

interface ReminderSettings {
  enabled: boolean;
  time: string; // HH:MM format
  lastNotified?: string; // ISO date
}

const DEFAULT_SETTINGS: ReminderSettings = {
  enabled: false,
  time: "20:00", // 8 PM default
};

export function useReadingReminder() {
  const [settings, setSettings] = useLocalStorage<ReminderSettings>(
    "wise-reading-reminder",
    DEFAULT_SETTINGS
  );
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  // Check notification permission
  useEffect(() => {
    if ("Notification" in window) {
      setPermissionGranted(Notification.permission === "granted");
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      return false;
    }

    if (Notification.permission === "granted") {
      setPermissionGranted(true);
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      const granted = permission === "granted";
      setPermissionGranted(granted);
      return granted;
    }

    return false;
  }, []);

  const enableReminder = useCallback(async (time: string) => {
    const granted = await requestPermission();
    if (granted) {
      setSettings({ enabled: true, time });
      return true;
    }
    return false;
  }, [requestPermission, setSettings]);

  const disableReminder = useCallback(() => {
    setSettings((prev) => ({ ...prev, enabled: false }));
  }, [setSettings]);

  const updateTime = useCallback((time: string) => {
    setSettings((prev) => ({ ...prev, time }));
  }, [setSettings]);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Check and send notification
  useEffect(() => {
    if (!settings.enabled || !permissionGranted) return;

    const showNotification = () => {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("📖 حان وقت القراءة", {
          body: "لا تنسَ وردك اليومي من القرآن الكريم",
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          tag: "reading-reminder",
          requireInteraction: false,
        });
      }
    };

    const checkAndNotify = () => {
      const current = settingsRef.current;
      const now = new Date();
      const todayKey = now.toISOString().slice(0, 10);
      const [targetH, targetM] = current.time.split(":").map(Number);

      if (current.lastNotified?.startsWith(todayKey)) return;

      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const targetMinutes = targetH * 60 + targetM;

      if (Math.abs(currentMinutes - targetMinutes) <= 1) {
        showNotification();
        setSettings((prev) => ({ ...prev, lastNotified: now.toISOString() }));
      }
    };

    const interval = setInterval(checkAndNotify, 60000);
    checkAndNotify();

    return () => clearInterval(interval);
  }, [settings.enabled, settings.time, permissionGranted, setSettings]);

  return {
    enabled: settings.enabled,
    time: settings.time,
    permissionGranted,
    enableReminder,
    disableReminder,
    updateTime,
    requestPermission,
  };
}
