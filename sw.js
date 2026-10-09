// Cache applicatif minimal : l'application fonctionne hors ligne, les données restent en local.
var CACHE = 'gestion-locative-v5';
var FICHIERS = ['./', './index.html', './manifest.webmanifest', './icone-192.png', './icone-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FICHIERS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (noms) {
    return Promise.all(noms.map(function (n) { return n === CACHE ? null : caches.delete(n); }));
  }).then(function () { return self.clients.claim(); }));
});

// Réseau d'abord, cache en secours : une nouvelle version est prise en compte au rechargement.
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(function (rep) {
      var copie = rep.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copie); });
      return rep;
    }).catch(function () {
      return caches.match(e.request).then(function (r) { return r || caches.match('./index.html'); });
    })
  );
});
