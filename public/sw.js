const CACHE_NAME = "kutay-todo-v17";

// Bu liste, uygulamanın çalışması için gereken "omurga"
const PRE_CACHE_RESOURCES = [
    "/",
    "/index.html",
    "/manifest.json",
    "/logo.png"
];

self.addEventListener("install", (event) => {
    // SW kurulurken bu dosyaları zorla indirir
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log("Kritik dosyalar önbelleğe alınıyor...");
            return cache.addAll(PRE_CACHE_RESOURCES);
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
            // 1. Eğer hafızada varsa (internete hiç sormadan) anında ver
            if (cachedResponse) {
                return cachedResponse;
            }

            // 2. Hafızada yoksa internetten iste
            return fetch(event.request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const cacheCopy = networkResponse.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, cacheCopy));
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // 3. İnternet yoksa ve hafızada da yoksa ana sayfayı döndür
                    if (event.request.mode === 'navigate') {
                        return caches.match("/");
                    }
                });
        })
    );
});