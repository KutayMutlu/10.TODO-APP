const CACHE_NAME = "kutay-todo-final-v18";

self.addEventListener("install", (event) => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(keys.map(key => caches.delete(key)));
        })
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cached) => {
            // 1. Eğer hafızada varsa anında ver (Beyaz ekranı %100 önler)
            if (cached) return cached;

            // 2. Yoksa internetten çek ve çekmişken hafızaya at
            return fetch(event.request).then((response) => {
                if (!response || response.status !== 200) return response;

                const copy = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
                return response;
            }).catch(() => {
                // İnternet de yok hafıza da yoksa: Ana sayfayı zorla yükle
                return caches.match("/");
            });
        })
    );
});