const CACHE = 'por-sete-v18';
const SHELL_KEY = '/__por_sete_shell_v17__';
const ASSETS = [
  '/styles.css?v=18',
  '/app.js?v=18',
  '/game-core.js?v=18',
  '/platform.js?v=18',
  '/i18n.js?v=18',
  '/manifest.webmanifest?v=18',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png'
];

async function cloneClean(response) {
  const body = await response.clone().blob();
  const headers = new Headers(response.headers);
  headers.delete('content-encoding');
  headers.delete('content-length');
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function putClean(cache, key, response) {
  if (!response || !response.ok || response.redirected) {
    throw new Error(`Resposta inválida para cache: ${key}`);
  }
  await cache.put(key, await cloneClean(response));
}

async function fetchRequired(url) {
  const response = await fetch(new Request(url, {
    cache: 'reload',
    redirect: 'error'
  }));
  if (!response.ok || response.redirected) {
    throw new Error(`Falha ao pré-carregar ${url}: ${response.status}`);
  }
  return response;
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);

    // Apenas a raiz canônica é usada como shell offline. /index.html nunca é
    // colocado no cache porque o Cloudflare Pages o redireciona para /.
    const shellResponse = await fetchRequired('/');
    await putClean(cache, SHELL_KEY, shellResponse);

    for (const url of ASSETS) {
      await putClean(cache, url, await fetchRequired(url));
    }
  })());
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith('por-sete-') && key !== CACHE)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function navigationResponse(request) {
  // Online: sempre prioriza a rede. Se o servidor seguir um redirecionamento
  // (principalmente /index.html -> / no Cloudflare), reconstrói a Response para
  // remover o histórico interno de redirecionamento que o Safari rejeita quando
  // a resposta é entregue por um Service Worker.
  try {
    const response = await fetch(request);
    return response.redirected ? await cloneClean(response) : response;
  } catch (_) {
    // Offline: qualquer URL de navegação usa o shell canônico já validado.
    const cache = await caches.open(CACHE);
    const shell = await cache.match(SHELL_KEY);
    return shell || new Response('Offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

async function assetResponse(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok && !response.redirected) {
    // Assets descobertos depois da instalação são cacheados apenas quando são
    // respostas finais 2xx sem redirecionamento.
    await cache.put(request, await cloneClean(response));
  }
  return response.redirected ? await cloneClean(response) : response;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(navigationResponse(request));
  } else {
    event.respondWith(assetResponse(request));
  }
});
