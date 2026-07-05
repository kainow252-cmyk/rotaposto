// RotaPosto Service Worker v14.0
// v14: limpeza automática de cache de SP padrão no localStorage
//      _worker.js NUNCA entra em cache — sempre busca da rede
//      SW se auto-atualiza silenciosamente a cada abertura do app
//      Reload seguro no TWA (postMessage → app decide recarregar)

const VERSION = 'v14.0';
const CACHE_STATIC = 'rp-static-v14';
const CACHE_API    = 'rp-api-v14';

const PRECACHE = [
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// ── INSTALL: pré-cache + ativar IMEDIATAMENTE ─────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then(cache => cache.addAll(PRECACHE.map(u => new Request(u, { cache: 'reload' }))))
      .catch(() => {})
      .then(() => self.skipWaiting())  // ativa sem esperar aba fechar
  );
});

// ── ACTIVATE: limpa caches antigos + assume controle imediato ─────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE_STATIC && k !== CACHE_API)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
      .then(() => {
        // Avisa todas as abas que o SW atualizou → app faz reload
        return self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(client => {
            client.postMessage({ type: 'SW_UPDATED', version: VERSION });
            // v14: pede ao app para limpar cache de SP padrão do localStorage
            client.postMessage({ type: 'CLEAR_SP_CACHE' });
          });
        });
      })
  );
});

// ── AUTO-VERIFICAÇÃO: checa versão no servidor a cada 5 min ───────────────
// Se servidor retornar versão diferente, se auto-destrói para forçar update
function verificarVersaoServidor() {
  fetch('/api/sw-version', { cache: 'no-store' })
    .then(r => r.json())
    .then(data => {
      if (data.version && data.version !== VERSION) {
        console.log('[SW] Versão desatualizada:', VERSION, '→', data.version, '— se auto-destruindo');
        // Limpar todos os caches
        caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
        // Desregistrar este SW → browser vai baixar o novo
        self.registration.unregister();
        // Avisar app para recarregar
        self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(c => c.postMessage({ type: 'SW_UPDATED', version: data.version }));
        });
      }
    })
    .catch(() => {}); // sem internet — ok, tenta na próxima
}

// Verificar imediatamente ao ativar e depois a cada 5 minutos
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

  // ── _worker.js: NUNCA cachear — sempre buscar da rede ────────────────────
  // Este é o arquivo principal do app. Se ficar em cache, o app nunca atualiza.
  if (path.includes('_worker.js') || path.includes('worker.js')) {
    event.respondWith(
      fetch(req, { cache: 'no-store' }).catch(() =>
        caches.match(req)  // fallback offline: usa cache se tiver
      )
    );
    return;
  }

  // ── PÁGINAS HTML: SEMPRE busca na rede ───────────────────────────────────
  const isHtmlPage = path === '/' || path === '/app' || path === '/onboarding'
    || path === '/landing' || path === '/admin' || path === '/parcerias'
    || path === '/parcerias/empresa' || !path.includes('.');

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

  // ── APIs: network-first com cache de fallback ─────────────────────────────
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

  // ── Assets estáticos (ícones, fontes, imagens): cache-first ──────────────
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
