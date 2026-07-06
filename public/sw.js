// RotaPosto — Service Worker PWA v2.0
// IMPORTANTE: Nunca cachear páginas HTML dinâmicas (/, /app, /onboarding)
// Apenas cachear assets estáticos (icons, static files, manifest)
const CACHE_NAME = 'rotaposto-v2';
const STATIC_ASSETS = [
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-512x512-maskable.png'
];

// Install: pré-cachear apenas ícones estáticos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        STATIC_ASSETS.map(url => cache.add(url).catch(() => {}))
      );
    })
  );
  self.skipWaiting(); // Ativar imediatamente
});

// Activate: limpar TODOS os caches antigos (rotaposto-v1, etc.)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Removendo cache antigo:', k);
          return caches.delete(k);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first para TUDO
// Páginas HTML (/, /app, /onboarding) NUNCA são cacheadas
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ignorar requisições de API e recursos externos
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname !== self.location.hostname
  ) {
    return; // deixar passar direto (sem interceptar)
  }

  // Páginas HTML dinâmicas: NUNCA cachear, sempre network
  const isDynamicPage = (
    url.pathname === '/' ||
    url.pathname === '/app' ||
    url.pathname === '/onboarding' ||
    url.pathname === '/landing' ||
    url.pathname === '/manifest.json'
  );
  if (isDynamicPage) {
    return; // deixar o browser buscar direto da rede
  }

  // Outros assets estáticos: network-first com fallback para cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (
          event.request.method === 'GET' &&
          response.ok &&
          (url.pathname.startsWith('/icons/') ||
           url.pathname.startsWith('/static/'))
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
