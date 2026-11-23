// Safety Map service worker: offline app shell and Web Push.
const CACHE = "sm-shell-v1";
const SHELL = ["/app", "/manifest.webmanifest", "/icons/icon-192.png", "/img/relief.jpg", "/img/calm.jpg", "/img/detail.jpg", "/img/globe-tex.jpg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  // Network first for pages, cache first for built assets and images.
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).catch(() => caches.match("/app")));
    return;
  }
  if (url.pathname.startsWith("/_astro/") || url.pathname.startsWith("/img/") || url.pathname.startsWith("/icons/")) {
    e.respondWith(
      caches.match(e.request).then(
        (hit) =>
          hit ||
          fetch(e.request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
            return res;
          }),
      ),
    );
  }
});

self.addEventListener("push", (e) => {
  let data = {};
  try {
    data = e.data ? e.data.json() : {};
  } catch {}
  const title = data.title || "Nieuwe melding in je buurt";
  e.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "Bekijk de kaart. Bij nood: bel 112.",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.id || "safety-map",
      data: { url: data.id ? `/app#/melding/${data.id}` : "/app#/kaart" },
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/app";
  e.waitUntil(
    self.clients.matchAll({ type: "window" }).then((list) => {
      for (const c of list) if ("focus" in c) return c.navigate(url).then((w) => w && w.focus());
      return self.clients.openWindow(url);
    }),
  );
});
