const CACHE_NAME = "kutay-todo-v1";
const urlsToCache = [
    "/",
    "/index.html",
    "/manifest.json",
    "/logo192.png",
    "/logo512.png"
    // Buraya build sonrası oluşan ana JS ve CSS dosyaların otomatik eklenir 
    // ya da basitçe "/" üzerinden tüm statik dosyaları yakalayabiliriz.
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(urlsToCache);
        })
    );
});

self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});