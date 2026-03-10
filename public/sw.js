const CACHE_NAME = "kutay-todo-v4";

// Yükleme anında temel dosyaları önbelleğe al
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                "/",
                "/index.html",
                "/manifest.json",
                "/logo.png",
                "/sounds/add.mp3",
                "/sounds/delete.mp3",
                "/sounds/warn.mp3"
            ]);
        })
    );
    self.skipWaiting();
});

// Aktivasyon anında eski cache'leri temizle
self.addEventListener("activate", (event) => {
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
    return self.clients.claim(); // Kontrolü hemen ele al
});

// İNTERNET YOKSA ÖNBELLEKTEN GETİR (NETWORK-FIRST STRATEJİSİ)
self.addEventListener("fetch", (event) => {
    // Sadece kendi sitemizden gelen istekleri (sesler dahil) yakala
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse; // Varsa hafızadan getir
            }
            return fetch(event.request).then((response) => {
                // Ses dosyası veya resimse, gelecekte kullanmak üzere hafızaya at
                if (event.request.url.includes('/sounds/')) {
                    const resClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, resClone);
                    });
                }
                return response;
            });
        })
    );
});