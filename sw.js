// Service worker : met l'application en cache pour qu'elle marche SANS internet.
const VERSION = "monplan-v1.0.1";           // changer ce numéro à chaque mise à jour
const FILES = ["./","index.html","css/style.css","js/data.js","js/app.js","manifest.webmanifest",
               "icons/icon-192.png","icons/icon-512.png","icons/maskable-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).catch(() => caches.match("index.html"))));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type:"window"}).then(list => list.length ? list[0].focus() : self.clients.openWindow("./")));
});
