// public/sw.js
// Service Worker for Web Push notifications.
// Handles: install, activate, push (show notification), notificationclick (open URL).

const CACHE_NAME = "quackcoin-sw-v1";

// ── Lifecycle ────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  // Skip waiting so the new SW activates immediately
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  // Claim all open clients so the SW takes effect immediately
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clean up old caches
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
    ]),
  );
});

// ── Push event ───────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "QuackCoin", body: event.data.text() };
  }

  const title = payload.title ?? "QuackCoin";
  const options = {
    body: payload.body ?? "",
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
    data: { href: payload.href ?? "/" },
    requireInteraction: false,
    tag: payload.tag ?? "quackcoin-notification",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click ───────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const href = event.notification.data?.href ?? "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If a window with the target URL is already open, focus it
        for (const client of clientList) {
          if (client.url === href && "focus" in client) {
            return client.focus();
          }
        }
        // Otherwise open a new tab
        if (self.clients.openWindow) {
          return self.clients.openWindow(href);
        }
      }),
  );
});
