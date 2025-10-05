const CACHE_NAME = 'bushopper-cache-v1';
const urlsToCache = [
  'icon.png',
  "https://data.busrouter.sg/v1/routes.min.geojson",
  "https://data.busrouter.sg/v1/services.min.json",
  "https://data.busrouter.sg/v1/stops.min.geojson",
  "c.css",
  "copy.svg",
  "/",
  "j.js",
  "loading.svg",
  "lta.woff2",
  "restart.svg"
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
  );
});
