// RotaPosto — Service Worker REMOVIDO
// Este arquivo garante que qualquer SW antigo seja imediatamente desregistrado.
// O site agora funciona como site web normal, sem cache offline.

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => caches.delete(key)))
    ).then(() => self.clients.matchAll({ includeUncontrolled: true }))
     .then(clients => clients.forEach(client => client.postMessage({ type: 'SW_REMOVED' })))
     .then(() => self.registration.unregister())
  );
});
