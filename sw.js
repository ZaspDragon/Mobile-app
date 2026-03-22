const CACHE = 'chadwell-mobile-v2';
const ASSETS = ['./', './index.html', './styles.css', './app.js', './manifest.json'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('fetch', event => {
  event.respondWith(caches.match(event.request).then(r => r || fetch(event.request)));
});
