const CACHE_NAME = 'petcare-v2';
const urlsToCache = [
  '/',
  '/index.html'
];

// URLs que NUNCA devem ser cacheadas (sempre buscar do servidor)
const noCacheUrls = ['/manifest.json', '/api/'];

// Install Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
  // Força a ativação imediata do novo service worker
  self.skipWaiting();
});

// Fetch - Cache First Strategy (exceto para URLs dinâmicas)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Nunca cachear manifest.json ou APIs - sempre buscar do servidor
  if (noCacheUrls.some(noCache => url.pathname.includes(noCache))) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - retorna a resposta do cache
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// Activate - Limpar caches antigos
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Força o service worker a assumir o controle imediatamente
      return self.clients.claim();
    })
  );
});
