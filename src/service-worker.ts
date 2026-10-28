/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { build, files, version } from '$service-worker';

// Guarda o app (código e ícones) no aparelho: abre na hora e funciona sem internet.
// Os dados continuam vindo do Supabase (outra origem, nunca passam por aqui).
const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE = `financeiro-${version}`;
const ASSETS = [...build, ...files];

sw.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => sw.skipWaiting()));
});

sw.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => sw.clients.claim())
  );
});

sw.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== sw.location.origin) return;
  // Arquivos com versão no nome: do cache. Página: da rede (atualiza), com o cache como reserva.
  if (ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(request).then((hit) => hit ?? fetch(request)));
    return;
  }
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
        return response;
      })
      .catch(async () => (await caches.match(request)) ?? (await caches.match(`${url.pathname.replace(/[^/]*$/, '')}index.html`)) ?? Response.error())
  );
});
