const CACHE_NAME = "kutay-todo-v12";

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
        fetch(event.request)
            .then((response) => {
                if (!response || response.status !== 200) {
                    return caches.match(event.request).then(cached => cached || response);
                }
                const copy = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
                return response;
            })
            .catch(async () => {
                const cached = await caches.match(event.request);
                // Eğer her şey biterse ve cache'de yoksa, Safari'yi kırmamak için boş bir cevap dön
                return cached || new Response("", { status: 404, statusText: "Not Found" });
            })
    );
});