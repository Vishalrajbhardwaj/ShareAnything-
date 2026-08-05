// Wrapper around the Notification API with a graceful fallback when browser
// support is missing or permission is denied.

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function requestNotificationPermission() {
  if (!notificationsSupported()) return Promise.resolve("unsupported");
  if (Notification.permission === "granted") return Promise.resolve("granted");
  if (Notification.permission === "denied") return Promise.resolve("denied");
  try {
    return Notification.requestPermission();
  } catch {
    return Promise.resolve("denied");
  }
}

// Show a system notification. Returns true if it was actually shown.
export function notify(title, options = {}) {
  if (!notificationsSupported()) return false;
  if (Notification.permission !== "granted") return false;
  try {
    const n = new Notification(title, {
      icon: "/icon.svg",
      badge: "/icon.svg",
      ...options,
    });
    // Auto-close after a few seconds so pending notifications don't pile up.
    setTimeout(() => n.close?.(), 5000);
    return true;
  } catch {
    return false;
  }
}
