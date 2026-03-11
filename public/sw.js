const CACHE_NAME = "kutay-todo-v16";

// Safari'nin "install" anında dondurmaması için eventleri temiz tutuyoruz
self.addEventListener("install", (event) => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    // Sadece GET isteklerini işle (POST veya harici istekleri engelleme)
    if (event.request.method !== 'GET') return;

    // Sadece kendi sitemizin dosyalarını cache'le (Google Fonts vb. dışarıda kalsın)
    if (!event.request.url.startsWith(self.location.origin)) return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // 1. STRATEJİ: Önce Önbellek (Cache-First)
            // Bu sayede internet olmasa da uygulama anında açılır.
            if (cachedResponse) {
                // Arka planda dosyayı güncelle (Stale-While-Revalidate)
                fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse));
                    }
                }).catch(() => {/* Sessizce fail ol */ });

                return cachedResponse;
            }

            // 2. STRATEJİ: Önbellekte yoksa İnternetten çek
            return fetch(event.request)
                .then((networkResponse) => {
                    if (!networkResponse || networkResponse.status !== 200) {
                        return networkResponse;
                    }
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
                    return networkResponse;
                })
                .catch(() => {
                    // 3. İNTERNET YOK + ÖNBELLEKTE YOK = Safari Hata Engelleyici
                    // Safari'ye asla null dönmüyoruz, bir Response objesi dönüyoruz.
                    return new Response(
                        '<html><head><meta charset="UTF-8"></head><body style="background:#1a1a1a;color:white;display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;text-align:center;">' +
                        '<div><h2>Çevrimdışı Mod</h2><p>Bu sayfa henüz kaydedilmemiş. Lütfen internet varken bir kez açın.</p></div></body></html>',
                        { headers: { 'Content-Type': 'text/html' } }
                    );
                });
        })
    );
});