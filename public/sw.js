// RotaPosto — Service Worker PWA v1.0
const CACHE_NAME = 'rotaposto-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install: pré-cachear assets essenciais
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: limpar caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first, fallback para cache
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ignorar requisições de API e recursos externos
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname !== self.location.hostname
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cachear respostas GET bem-sucedidas de assets estáticos
        if (
          event.request.method === 'GET' &&
          (url.pathname.startsWith('/icons/') ||
           url.pathname.startsWith('/static/') ||
           url.pathname === '/manifest.json')
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
