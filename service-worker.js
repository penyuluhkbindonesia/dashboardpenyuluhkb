const CACHE_NAME = 'penyuluhkb-pwa-v1';
// Daftar file yang wajib direkam agar aplikasi bisa dibuka saat offline
const ASSETS_TO_CACHE = [
  'index.html',
  'app.js',
  'manifest.json',
  'dashboardpkb.png'
];

// 1. Fase Instalasi: Rekam semua aset penting ke memori HP
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. Fase Aktivasi: Hapus cache versi lama jika ada pembaruan sistem
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Strategi Network First, Fallback to Cache: 
// Coba ambil data terbaru dari internet dulu, kalau gagal/offline, langsung sajikan data rekaman dari memori HP.
self.addEventListener('fetch', (event) => {
  // Hanya tangani permintaan lokal (file internal proyek), abaikan API eksternal (Supabase/Cloudinary)
  if (event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Jika sukses dapat data dari internet, perbarui rekaman cache
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Jika gagal (Offline/Sinyal Jelek), ambil dari rekaman memori HP
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Jika benar-benar tidak ada rekaman sama sekali (kasus langka)
            return new Response("Aplikasi sedang offline dan data ini belum terekam.", {
              headers: { 'Content-Type': 'text/plain' }
            });
          });
        })
    );
  }
});
