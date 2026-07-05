// RotaPosto Service Worker v15.0
// v15: ASSETS sempre network-first — garante sincronização em tempo real no TWA
//      Toda mudança de código/imagem é refletida imediatamente sem precisar de reset
//      _worker.js NUNCA entra em cache
//      SW se auto-atualiza silenciosamente a cada abertura

const VERSION = 'v15.0';
const CACHE_STATIC = 'rp-static-v15';
const CACHE_API    = 'rp-api-v15';

// Apenas pré-cacheia ícones do manifest (necessários offline)
const PRECACHE = [
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// ── INSTALL: pré-cache mínimo + ativar IMEDIATAMENTE ─────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then(cache => cache.addAll(PRECACHE.map(u => new Request(u, { cache: 'reload' }))))
      .catch(() => {})
      .then(() => self.skipWaiting())  // ativa sem esperar aba fechar
  );
});

// ── ACTIVATE: limpa TODOS os caches antigos + assume controle imediato ────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE_STATIC && k !== CACHE_API)
          .map(k => {
            console.log('[SW v15] Deletando cache antigo:', k);
            return caches.delete(k);
          })
      ))
      .then(() => self.clients.claim())
      .then(() => {
        return self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(client => {
            // Avisa app que SW atualizou → app vai recarregar
            client.postMessage({ type: 'SW_UPDATED', version: VERSION });
            // Limpa cache SP padrão do localStorage
            client.postMessage({ type: 'CLEAR_SP_CACHE' });
          });
        });
      })
  );
});

// ── AUTO-VERIFICAÇÃO: checa versão no servidor a cada 5 min ───────────────
function verificarVersaoServidor() {
  fetch('/api/sw-version', { cache: 'no-store' })
    .then(r => r.json())
    .then(data => {
      if (data.version && data.version !== VERSION) {
        console.log('[SW] Versão desatualizada:', VERSION, '→', data.version, '— se auto-destruindo');
        caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
        self.registration.unregister();
        self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(c => c.postMessage({ type: 'SW_UPDATED', version: data.version }));
        });
      }
    })
    .catch(() => {});
}

self.addEventListener('activate', () => {
  setTimeout(verificarVersaoServidor, 3000);
  setInterval(verificarVersaoServidor, 5 * 60 * 1000);
});

// ── MESSAGE: comandos do app ──────────────────────────────────────────────
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

  // Só origem própria
  const isOwn = url.hostname.includes('rotaposto')
    || url.hostname === 'localhost'
    || url.hostname.includes('gensparksite.com');
  if (!isOwn) return;

  const path = url.pathname;

  // ── _worker.js: NUNCA cachear ──────────────────────────────────────────
  if (path.includes('_worker.js') || path.includes('worker.js')) {
    event.respondWith(
      fetch(req, { cache: 'no-store' }).catch(() => caches.match(req))
    );
    return;
  }

  // ── PÁGINAS HTML: SEMPRE busca na rede ────────────────────────────────
  const isHtmlPage = path === '/' || path === '/app' || path === '/onboarding'
    || path === '/landing' || path === '/admin' || path === '/parcerias'
    || path === '/parcerias/empresa' || path === '/reset' || path === '/launcher'
    || !path.includes('.');

  if (isHtmlPage) {
    event.respondWith(
      fetch(req, { cache: 'no-store' }).catch(() =>
        new Response(
          '<!DOCTYPE html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>' +
          '<body style="font-family:sans-serif;text-align:center;padding:60px 20px;background:#fff">' +
          '<div style="font-size:48px">⛽</div>' +
          '<h2 style="color:#FF6D00;font-weight:800">RotaPosto</h2>' +
          '<p style="color:#666">Sem conexão com a internet.</p>' +
          '<button onclick="location.reload()" style="margin-top:20px;padding:12px 28px;background:#FF6D00;color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer">Tentar novamente</button>' +
          '</body></html>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        )
      )
    );
    return;
  }

  // ── APIs: network-first com cache de fallback ─────────────────────────
  if (path.startsWith('/api/')) {
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

  // ── ASSETS ESTÁTICOS: network-first ───────────────────────────────────
  // v15: SEMPRE busca na rede primeiro — garante que imagens/JS/CSS
  // atualizados aparecem imediatamente, sem precisar limpar cache manual.
  // Só usa cache se estiver offline.
  event.respondWith(
    fetch(req, { cache: 'no-store' })
      .then(res => {
        if (res.ok) {
          // Salva no cache para uso offline
          const clone = res.clone();
          caches.open(CACHE_STATIC).then(c => c.put(req, clone));
        }
        return res;
      })
      .catch(() =>
        // Offline: usa cache se disponível
        caches.match(req).then(cached =>
          cached || new Response('', { status: 404 })
        )
      )
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
      data: data.url ? { url: data.url } : undefined
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/app';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      const existing = clients.find(c => c.url.includes('/app'));
      if (existing) { existing.focus(); existing.navigate(url); }
      else self.clients.openWindow(url);
    })
  );
});
