/* Public artwork only. No offline login/app shell or API/media caching. */
'use strict';
const CACHE_PREFIX = 'fromm-viewer-public-art-';
const CACHE_NAME = CACHE_PREFIX + 'v2';
const ARTWORK = [
  'assets/glowme/logo.png', 'assets/glowme/icon-192.png',
  'assets/glowme/icon-512.png', 'assets/glowme/favicon-32.png'
].map(path => new URL(path, self.registration.scope).href);
const allowed = new Set(ARTWORK);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ARTWORK)));
  // No skipWaiting: an installed update never reloads an active player.
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
    .map(key => caches.delete(key)))));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  // Exact URL allowlist (no query strings), same origin, no auth or Range requests.
  // All HTML/JS/CSS, API, signed URLs and media bypass this handler entirely.
  if (request.method !== 'GET' || !allowed.has(request.url) ||
      request.headers.has('authorization') || request.headers.has('range')) return;
  event.respondWith(caches.open(CACHE_NAME).then(async cache => {
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') await cache.put(request, response.clone());
    return response;
  }));
});
