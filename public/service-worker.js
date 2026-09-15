// Worker de migração para instalações antigas do Por Sete.
// Versões antigas registravam /service-worker.js e algumas podiam conservar
// /index.html no cache. Ao receber esta atualização, este worker limpa apenas
// caches do Por Sete, deixa de servir navegação em cache, desregistra o registro
// legado e tenta recarregar as janelas para que a versão atual registre /sw.js.
self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(key => key.startsWith('por-sete-')).map(key => caches.delete(key))
    );

    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

    // claim() não é indispensável à recuperação; se um WebKit específico o
    // rejeitar durante a migração, a limpeza/desinstalação e o reload continuam.
    try { await self.clients.claim(); } catch (_) {}
    try { await self.registration.unregister(); } catch (_) {}

    await Promise.all(
      windows.map(client => client.navigate(client.url).catch(() => null))
    );
  })());
});

// Enquanto este worker temporário ainda controla uma página, ele é estritamente
// network-only: nunca devolve uma resposta antiga do Cache Storage.
self.addEventListener('fetch', event => {
  if (event.request.method === 'GET') {
    event.respondWith(fetch(event.request));
  }
});
