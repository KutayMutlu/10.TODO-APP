const CACHE_NAME = "kutay-todo-v10";

self.addEventListener("install", (event) => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
        })
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    // Sadece kendi sitemizin isteklerini ve GET metotlarını yakala
    if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) return;

    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(event.request).then((cachedResponse) => {
                const fetchPromise = fetch(event.request).then((networkResponse) => {
                    // Eğer internetten gelen cevap sağlamsa, cache'i güncelle
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => {
                    // Tamamen çevrimdışıysak ve cache'de yoksa hata verme, sessiz kal
                });

                // Varsa cache'den dön, yoksa internetten geleni bekle
                return cachedResponse || fetchPromise;
            });
        })
    );
});