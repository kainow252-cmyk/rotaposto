// RotaPosto Service Worker v2.0
// Cache inteligente para funcionamento offline

const CACHE_NAME = 'rotaposto-v2';
const STATIC_CACHE = 'rotaposto-static-v2';
const API_CACHE = 'rotaposto-api-v2';

// Assets estáticos para cache
const STATIC_ASSETS = [
  '/app',
  '/landing',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/logo-rotaposto.png'
];

// Install: pré-cache assets estáticos
self.addEventListener('install', event => {
  console.log('[SW] Installing RotaPosto v2...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('[SW] Cache install error:', err))
  );
});

// Activate: limpar caches antigos
self.addEventListener('activate', event => {
  console.log('[SW] Activating RotaPosto v2...');
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== API_CACHE)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch: estratégia inteligente por tipo de recurso
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar extensões do browser e outros domínios não-relevantes
  if (!url.origin.includes('rotaposto') && !url.pathname.startsWith('/api') && !url.pathname.startsWith('/app') && !url.pathname.startsWith('/landing') && !url.pathname.startsWith('/icons') && !url.pathname.startsWith('/static')) {
    return;
  }

  // APIs de postos: Network First com cache fallback (5min TTL)
  if (url.pathname.startsWith('/api/postos') || url.pathname.startsWith('/api/precos')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE).then(cache => {
              cache.put(request, clone);
            });
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Outros recursos: Cache First
  event.respondWith(
    caches.match(request)
      .then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.ok && request.method === 'GET') {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then(cache => cache.put(request, clone));
          }
          return response;
        });
      })
      .catch(() => {
        // Offline fallback para páginas
        if (request.destination === 'document') {
          return caches.match('/app');
        }
      })
  );
});

// Push notifications
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  
  const options = {
    body: data.body || 'Novo alerta de preço!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/app' },
    actions: [
      { action: 'open', title: 'Ver postos', icon: '/icons/icon-96x96.png' },
      { action: 'dismiss', title: 'Dispensar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'RotaPosto ⛽', options)
  );
});

// Clique na notificação
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(clientList => {
        const url = event.notification.data?.url || '/app';
        for (const client of clientList) {
          if (client.url.includes('/app') && 'focus' in client) {
            return client.focus();
          }
        }
        return clients.openWindow(url);
      })
  );
});
