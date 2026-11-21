"use strict";
const prefix = "ultimos-50-metros-shell-";
const cacheName = prefix + "__VERSION__";
const assets = __ASSETS__.map(file => new URL(file, self.registration.scope).href);
self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll(assets.map(url => new Request(url, {cache:"reload"})));
  })());
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith(prefix) && name !== cacheName) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const isHome = url.origin + url.pathname === self.registration.scope;
  const key = isHome ? assets[0] : url.origin + url.pathname;
  if (!assets.includes(key)) return;
  event.respondWith(caches.open(cacheName).then(async cache =>
    (await cache.match(key)) || fetch(event.request)));
});
