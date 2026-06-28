// RotaPosto Service Worker v6.0
// Auto-update silencioso + Cache inteligente + PWA install
// v6: skipWaiting imediato + reload automático nas abas abertas

const VERSION = 'v6';
const CACHE_STATIC = 'rp-static-v6';
const CACHE_API    = 'rp-api-v6';

const PRECACHE = [
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// ── INSTALL: pré-cache + ativar imediatamente sem esperar ──────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then(cache => cache.addAll(PRECACHE.map(u => new Request(u, { cache: 'reload' }))))
      .catch(() => {})  // não falhar se ícone não existir
      .then(() => self.skipWaiting())  // ativar IMEDIATAMENTE (sem esperar aba fechar)
  );
});

// ── ACTIVATE: limpar caches antigos + assumir controle de TODAS as abas ───
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE_STATIC && k !== CACHE_API)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())  // controlar abas abertas imediatamente
      .then(() => {
        // ── Auto-reload silencioso em todas as abas ──────────────────────
        // Quando novo SW ativa, recarrega todas as páginas automaticamente
        // para garantir que o usuário sempre veja a versão mais recente
        return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      })
      .then(clients => {
        clients.forEach(client => {
          // Navegar de volta pra mesma URL (reload silencioso)
          client.navigate(client.url);
        });
      })
  );
});

// ── MESSAGE: receber comandos do app ──────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING' || event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'GET_VERSION') {
    event.ports[0]?.postMessage({ version: VERSION });
  }
});

// ── FETCH: estratégia por tipo de recurso ─────────────────────────────────
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Só GET
  if (req.method !== 'GET') return;

  // Só origem própria (ignora Firebase, Google, CDNs)
  const isOwn = url.hostname.includes('rotaposto') || url.hostname === 'localhost';
  if (!isOwn) return;

  const path = url.pathname;

  // ── PÁGINAS HTML: sempre busca na rede (nunca serve cache desatualizado) ─
  const isHtmlPage = path === '/' || path === '/app' || path === '/onboarding'
    || path === '/landing' || path === '/admin' || !path.includes('.');

  if (isHtmlPage) {
    event.respondWith(
      fetch(req, { cache: 'no-store' }).catch(() =>
        new Response(
          '<!DOCTYPE html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>' +
          '<body style="font-family:sans-serif;text-align:center;padding:60px 20px;background:#fff">' +
          '<div style="font-size:48px">⛽</div>' +
          '<h2 style="color:#FF6D00;font-weight:800">RotaPosto</h2>' +
          '<p style="color:#666">Sem conexão com a internet.</p>' +
          '<p style="color:#999;font-size:14px">Verifique sua conexão e tente novamente.</p>' +
          '<button onclick="location.reload()" style="margin-top:20px;padding:12px 28px;background:#FF6D00;color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer">Tentar novamente</button>' +
          '</body></html>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        )
      )
    );
    return;
  }

  // ── APIs de postos/preços: network-first com cache de 5 min ──────────────
  if (path.startsWith('/api/postos') || path.startsWith('/api/precos') || path.startsWith('/api/geocode')) {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_API).then(c => c.put(req, clone));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // ── Assets estáticos (ícones, manifest, imagens): cache-first ────────────
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_STATIC).then(c => c.put(req, clone));
        }
        return res;
      }).catch(() => new Response('', { status: 404 }));
    })
  );
});

// ── PUSH: notificações ────────────────────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'RotaPosto', body: event.data.text() }; }

  event.waitUntil(
    self.registration.showNotification(data.title || 'RotaPosto ⛽', {
      body: data.body || 'Novo alerta de preço!',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      vibrate: [200, 100, 200],
      data: { url: data.url || '/app' }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      const url = event.notification.data?.url || '/app';
      for (const c of list) {
        if (c.url.includes('/app') && 'focus' in c) return c.focus();
      }
      return clients.openWindow(url);
    })
  );
});
