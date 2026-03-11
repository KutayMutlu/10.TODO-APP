const CACHE_NAME = "kutay-todo-v11";

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
    // Sadece GET isteklerini ve kendi sitemizi işle
    if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) return;

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // Eğer cevap null veya hatalıysa cache'e bak
                if (!networkResponse || networkResponse.status !== 200) {
                    return caches.match(event.request);
                }

                // Cevap sağlamsa cache'e at ve dön
                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });
                return networkResponse;
            })
            .catch(() => {
                // İnternet tamamen kopuksa veya fetch çökerse cache'den getir
                return caches.match(event.request);
            })
    );
});