const CACHE_NAME = "kutay-todo-v14";

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
    if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) return;

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // Eğer cevap gelirse cache'i güncelle ve dön
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
                }
                return networkResponse;
            })
            .catch(() => {
                // İNTERNET YOKSA: Hafızadaki yedeği dene
                return caches.match(event.request).then(cached => {
                    if (cached) return cached;

                    // EĞER HİÇBİR ŞEY BULUNAMAZSA (BEYAZ EKRAN ÖNLEYİCİ):
                    // Tarayıcıya küçük bir mesaj dön, beyaz ekran yerine "Bağlantı yok" yazsın
                    return new Response(
                        '<html><body style="background:#1a1a1a;color:white;display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;">' +
                        '<div style="text-align:center;"><h2>Bağlantı Bekleniyor...</h2><p>Lütfen internete bağlanın.</p></div></body></html>',
                        { headers: { 'Content-Type': 'text/html' } }
                    );
                });
            })
    );
});