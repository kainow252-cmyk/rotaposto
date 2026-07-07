// RotaPosto — Service Worker PWA v3.0
// REGRA: O SW NUNCA intercepta páginas HTML — apenas assets estáticos (/icons/, /static/)
// Motivo: páginas são geradas server-side no Cloudflare Worker; cacheá-las quebra navegação
const CACHE_NAME = 'rotaposto-v3';
const STATIC_ASSETS = [
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
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Removendo cache antigo:', k);
          return caches.delete(k);
        })
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

  // 3. Só cachear se for asset estático real (ícones, imagens, fontes, css, js)
  //    Qualquer coisa que pareça página HTML (sem extensão conhecida): NÃO interceptar
  if (!isStaticAsset(url.pathname)) {
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
        // Asset não disponível e não está em cache — retornar resposta vazia mas válida
        return new Response('', { status: 408, statusText: 'Offline' });
      });
    })
  );
});
