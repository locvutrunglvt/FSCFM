const CACHE_NAME = 'fscfm-v3';
const CDN_CACHE = 'fscfm-cdn-v3';
const DATA_CACHE = 'fscfm-data-v2';

// Core app files
const APP_FILES = [
  './',
  './index.html',
  './manifest.json'
];

// CDN resources to cache
const CDN_FILES = [
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.datatables.net/1.13.4/css/dataTables.bootstrap5.min.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css',
  'https://code.jquery.com/jquery-3.6.0.min.js',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
  'https://cdn.datatables.net/1.13.4/js/jquery.dataTables.min.js',
  'https://cdn.datatables.net/1.13.4/js/dataTables.bootstrap5.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/proj4@2.9.2/dist/proj4.min.js'
];

// Install: cache all core resources
self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES)),
      caches.open(CDN_CACHE).then(cache => {
        return Promise.allSettled(CDN_FILES.map(url =>
          cache.add(url).catch(err => console.warn('Failed to cache:', url, err))
        ));
      })
    ]).then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME && k !== CDN_CACHE && k !== DATA_CACHE && k !== 'fscfm-tiles-v1').map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy: Network-first for API, Cache-first for CDN, Network-first for app
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Supabase API calls: network-first, cache response for offline
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      caches.open(DATA_CACHE).then(cache =>
        fetch(event.request.clone()).then(response => {
          if (response.ok && event.request.method === 'GET') {
            cache.put(event.request, response.clone());
          }
          return response;
        }).catch(() => cache.match(event.request))
      )
    );
    return;
  }

  // Map tiles: cache-first for offline (Google, Esri, OSM tiles)
  if (url.hostname.match(/^mt\d\.google\.com$/) || url.hostname.includes('arcgisonline.com') || url.hostname.includes('tile.openstreetmap.org')) {
    event.respondWith(
      caches.open('fscfm-tiles-v1').then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(response => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          }).catch(() => cached || new Response('', { status: 404 }));
        })
      )
    );
    return;
  }

  // CDN resources: cache-first (they have versioned URLs)
  if (url.hostname !== location.hostname) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CDN_CACHE).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => cached);
      })
    );
    return;
  }

  // App files: network-first, fallback to cache
  event.respondWith(
    fetch(event.request).then(response => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
      }
      return response;
    }).catch(() => caches.match(event.request))
  );
});

// Listen for messages to update cache
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
