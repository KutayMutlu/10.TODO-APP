const CACHE_NAME = "kutay-todo-v13";

// İnternet varken bu dosyaları MUTLAKA hafızaya al
const PRE_CACHE_ASSETS = [
    "/",
    "/index.html",
    "/manifest.json",
    "/logo.png",
    "/sounds/add.mp3",
    "/sounds/delete.mp3",
    "/sounds/warn.mp3"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log("Dosyalar önbelleğe alınıyor...");
            return cache.addAll(PRE_CACHE_ASSETS);
        })
    );
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
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // 1. Önce hafızaya bak, varsa ver
            if (cachedResponse) {
                return cachedResponse;
            }

            // 2. Hafızada yoksa internetten çek
            return fetch(event.request)
                .then((networkResponse) => {
                    if (!networkResponse || networkResponse.status !== 200) {
                        return networkResponse;
                    }
                    // İnternetten gelen yeni dosyayı da hafızaya ekle (dinamik js dosyaları için)
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
                    return networkResponse;
                })
                .catch(() => {
                    // 3. İnternet yoksa ve hafızada da yoksa Safari'yi kırmamak için boş response dön
                    return new Response("Çevrimdışı mod: Dosya bulunamadı.", {
                        status: 200, // 404 yerine 200 dönmek Safari'yi sakinleştirir
                        headers: { 'Content-Type': 'text/plain' }
                    });
                });
        })
    );
});