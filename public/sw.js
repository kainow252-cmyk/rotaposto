// RotaPosto — Service Worker PWA v5.0 (+ Push Notifications)
// REGRA: O SW NUNCA intercepta páginas HTML — apenas assets estáticos (/icons/, /static/)
// Motivo: páginas são geradas server-side no Cloudflare Worker; cacheá-las quebra navegação
const CACHE_NAME = 'rotaposto-v5.0';
const STATIC_ASSETS = [
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-512x512-maskable.png'
];

// Extensões que indicam asset estático (não HTML)
const STATIC_EXTS = ['.png','.jpg','.jpeg','.gif','.svg','.ico',
                     '.woff','.woff2','.ttf','.otf',
                     '.css','.js','.webp','.avif'];

function isStaticAsset(pathname) {
  return STATIC_EXTS.some(ext => pathname.endsWith(ext)) ||
         pathname.startsWith('/icons/') ||
         pathname.startsWith('/static/');
}

// Install: pré-cachear apenas ícones estáticos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(
        STATIC_ASSETS.map(url => cache.add(url).catch(() => {}))
      )
    )
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
    ).then(() => self.clients.claim())
  );
});

// Fetch: interceptar APENAS assets estáticos conhecidos
// TUDO que é página HTML passa direto sem interceptação
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 1. Recursos de outros domínios: nunca interceptar
  if (url.hostname !== self.location.hostname) {
    return;
  }

  // 2. API: nunca interceptar
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 3. Só cachear se for asset estático real (ícones, imagens, fontes, css, js, manifest)
  //    Qualquer coisa que pareça página HTML (sem extensão conhecida): NÃO interceptar
  const isManifest = url.pathname === '/manifest.json' || url.pathname === '/parcerias/manifest.json';
  if (!isStaticAsset(url.pathname) && !isManifest) {
    // Página HTML — deixa o browser ir direto à rede, sem SW
    return;
  }

  // 4. Asset estático: cache-first (ícones, imagens) — falha silenciosa
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        return new Response('', { status: 408, statusText: 'Offline' });
      });
    })
  );
});

// ── Push Notifications ────────────────────────────────────────────────────────
self.addEventListener('push', event => {
  let data = { title: 'RotaPosto', body: 'Nova atualização disponível!', icon: '/icons/icon-192x192.png', url: '/' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch(e) {
    if (event.data) data.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: data.tag || 'rotaposto-notif',
      data: { url: data.url || '/' },
      vibrate: [200, 100, 200],
      requireInteraction: false
    })
  );
});

// ── Clique na notificação → abre o app ───────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      // Se já tem janela aberta, foca nela
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Senão abre nova aba
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
