// RotaPosto Service Worker v5.0
// Cache inteligente + Auto-update no PWA
// v5: Fix cache - páginas HTML sempre network-first (landing atualizada)

const CACHE_NAME = 'rotaposto-v5';
const STATIC_CACHE = 'rotaposto-static-v5';
const API_CACHE = 'rotaposto-api-v5';

// SOMENTE assets verdadeiramente estáticos (não-HTML) no pré-cache
const STATIC_ASSETS = [
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/logo-rotaposto.png'
];

// Rotas HTML que NUNCA devem ser cacheadas
// (landing muda com frequência, app precisa de auth fresh)
const NO_CACHE_ROUTES = ['/', '/onboarding', '/landing', '/app', '/login'];

// Install: pré-cache apenas assets estáticos + skipWaiting imediato
self.addEventListener('install', event => {
  console.log('[SW] Installing RotaPosto v5...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' }))))
      .then(() => {
        console.log('[SW] v5 instalado — skipWaiting imediato');
        return self.skipWaiting(); // Auto-ativar sem esperar
      })
      .catch(err => console.warn('[SW] Cache install error:', err))
  );
});

// Activate: limpar TODOS os caches antigos + claim imediato
self.addEventListener('activate', event => {
  console.log('[SW] Activating RotaPosto v5 — limpando caches antigos...');
  event.waitUntil(
    caches.keys()
      .then(keys => {
        console.log('[SW] Caches existentes:', keys);
        return Promise.all(
          keys
            .filter(key => key !== STATIC_CACHE && key !== API_CACHE)
            .map(key => {
              console.log('[SW] Deletando cache antigo:', key);
              return caches.delete(key);
            })
        );
      })
      .then(() => self.clients.claim()) // Tomar controle imediato de todas as abas
      .then(() => {
        // Notificar todas as abas que o SW foi atualizado
        return self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(client => {
            client.postMessage({ type: 'SW_UPDATED', version: 'v5' });
            // Forçar reload nas abas abertas para carregar a nova landing
            client.navigate(client.url);
          });
        });
      })
  );
});

// Escutar mensagem de SKIP_WAITING (chamado pelo app para forçar update)
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING' || event.data?.type === 'SKIP_WAITING') {
    console.log('[SW] SKIP_WAITING recebido — ativando novo SW');
    self.skipWaiting();
  }
});

// Fetch: estratégia por tipo de recurso
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Só lidar com GET
  if (request.method !== 'GET') return;

  // Ignorar outros domínios (Firebase, CDNs externas, etc.)
  if (!url.origin.includes('rotaposto') && !url.hostname.includes('localhost')) {
    return;
  }

  const pathname = url.pathname;

  // ─── PÁGINAS HTML: SEMPRE Network First (nunca cache) ───────────────────
  // Isso garante que / sempre serve a landing atualizada
  if (
    pathname === '/' ||
    NO_CACHE_ROUTES.some(route => pathname === route || pathname.startsWith(route + '?'))
  ) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .catch(() => {
          // Fallback offline: só se não conseguir rede
          return new Response(
            '<html><body style="font-family:sans-serif;text-align:center;padding:40px">' +
            '<h2>⛽ RotaPosto</h2><p>Sem conexão. Tente novamente.</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // ─── APIs de postos/preços: Network First com cache fallback (5min TTL) ──
  if (pathname.startsWith('/api/postos') || pathname.startsWith('/api/precos')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // ─── Outros recursos estáticos: Cache First ───────────────────────────────
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
        // Offline fallback para documentos
        if (request.destination === 'document') {
          return new Response(
            '<html><body style="font-family:sans-serif;text-align:center;padding:40px">' +
            '<h2>⛽ RotaPosto</h2><p>Sem conexão. Tente novamente.</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
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
