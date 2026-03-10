const CACHE_NAME = "kutay-todo-v2"; // Versiyonu v2 yaptık

// Yükleme anında temel dosyaları önbelleğe al
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                "/",
                "/index.html",
                "/manifest.json",
                "/logo.png"
            ]);
        })
    );
    self.skipWaiting(); // Yeni versiyonun hemen aktif olmasını sağlar
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
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // İnternet varsa, gelen dosyayı cache'e de kopyala (Dinamik Önbellek)
                const resClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, resClone);
                });
                return response;
            })
            .catch(() => caches.match(event.request).then((res) => res)) // İnternet yoksa cache'den dön
    );
});