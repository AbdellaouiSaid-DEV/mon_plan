// Service worker : garde l'application en cache pour qu'elle marche SANS internet.
// Stratégie : on sert le cache tout de suite (rapide) et on le rafraîchit en arrière-plan.
const VERSION = "monplan-v2.2.0";          // changer ce numéro à chaque mise à jour
const FILES = ["./","index.html","css/style.css","js/data.js","js/utils.js","js/state.js","js/charts.js","js/notify.js","js/xlsx.js","js/views.js","js/app.js","manifest.webmanifest",
               "icons/icon-192.png","icons/icon-512.png","icons/maskable-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(caches.open(VERSION).then(async cache => {
    const hit = await cache.match(req, { ignoreSearch: true });
    const reseau = fetch(req).then(r => { if (r.ok) cache.put(req, r.clone()); return r; }).catch(() => null);
    return hit || (await reseau) || cache.match("index.html");
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window" }).then(l => l.length ? l[0].focus() : self.clients.openWindow("./")));
});
