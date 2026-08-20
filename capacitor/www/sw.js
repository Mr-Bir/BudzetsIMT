/*
 * Finanšu pārvaldnieks (BudzetsIMT)
 * Copyright (c) 2026 Mārtiņš Barons. Visas tiesības paturētas.
 * Skatīt LICENSE failu repozitorija saknē.
 */
const CACHE_NAME = 'finanses-shell-v75';
const SHELL_FILES = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './changelog.js',
  './manifest.json',
  './privatuma-politika.html',
  './lietosanas-noteikumi.html',
  './privacy-policy.html',
  './terms-of-use.html',
  './js/i18n.js',
  './js/capacitor-core.js',
  './js/firebase-auth/index.js',
  './js/firebase-auth/web.js',
  './js/firebase-auth/definitions.js',
  './js/local-notifications/index.js',
  './js/local-notifications/web.js',
  './js/local-notifications/definitions.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => {
            console.log('SW: Deleting old cache:', k);
            return caches.delete(k);
          })
      ).then(() => {
        // Notify all clients about the update
        return self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({ type: 'CACHE_UPDATED' });
          });
        });
      });
    })
  );
  self.clients.claim();
});

// Only cache same-origin app-shell requests. Firebase/Firestore requests go to a
// different origin and are left untouched here — Firestore has its own offline
// support (persistentLocalCache in app.js), separate from this app-shell cache.
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      const network = fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
