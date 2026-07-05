export async function showAppNotification(title: string, options: NotificationOptions = {}) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return false;
  }

  const payload: NotificationOptions = {
    badge: "/icons/icon-192.png",
    icon: "/icons/icon-192.png",
    ...options,
  };

  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.showNotification(title, payload);
        return true;
      }
    }
  } catch {
    // Fallback to page notifications below.
  }

  try {
    new Notification(title, payload);
    return true;
  } catch {
    return false;
  }
}