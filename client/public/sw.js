// Basic service worker for offline shell caching (PWA).
// Network-first for navigation (so a share link still opens fresh from the
// server), with a cache fallback so the app shell loads offline on repeat visits.
// Uploads/downloads and signaling are network-only — never cached here.

const SHELL = "/";
const CACHE = "share-anywhere-shell-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([SHELL, "/manifest.webmanifest", "/icon.svg"]))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept WebSocket/signaling, uploads, downloads, or the API.
  if (
    request.method !== "GET" ||
    url.pathname.startsWith("/socket.io") ||
    url.pathname.startsWith("/upload") ||
    url.pathname.startsWith("/download") ||
    url.pathname.startsWith("/ice-servers") ||
    url.pathname.startsWith("/health")
  ) {
    return;
  }

  // Network-first for HTML navigation so share links always get the latest app.
  if (request.mode === "navigate" || url.pathname === "/") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match(SHELL)))
    );
    return;
  }

  // Stale-while-revalidate for static assets.
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

