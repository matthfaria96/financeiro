/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { build, files, version } from '$service-worker';

// Guarda o app (código e ícones) no aparelho: abre na hora e funciona sem internet.
// Os dados continuam vindo do Supabase (outra origem, nunca passam por aqui).
const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE = `financeiro-${version}`;
const SHARED = 'financeiro-recebidos';
// Fora do cache: telas de abertura e capturas da instalação (o iPhone só busca a do próprio tamanho, uma vez) e arquivos
// ocultos como o .nojekyll do GitHub Pages, que o servidor não entrega: um único arquivo faltando derruba a instalação inteira.
const ASSETS = [...build, ...files.filter((file) => !/\/(splash|screenshots)\//.test(file) && !/\/\.[^/]*$/.test(file))];

sw.addEventListener('install', (event) => {
  // Um por um: se algum falhar, o resto continua guardado e o app instala mesmo assim.
  event.waitUntil(caches.open(CACHE).then((cache) => Promise.allSettled(ASSETS.map((asset) => cache.add(asset)))).then(() => sw.skipWaiting()));
});

sw.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE && key !== SHARED).map((key) => caches.delete(key)))).then(() => sw.clients.claim())
  );
});

sw.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  // "Compartilhar" do Android (share_target do manifesto): guarda os arquivos e abre o app para importar.
  if (request.method === 'POST' && url.origin === sw.location.origin && url.pathname.endsWith('/receber')) {
    event.respondWith((async () => {
      const form = await request.formData();
      const received = form.getAll('files').filter((item): item is File => item instanceof File);
      const cache = await caches.open(SHARED);
      await Promise.all(received.map((file, index) => cache.put(`recebido/${Date.now()}-${index}`,
        new Response(file, { headers: { 'x-name': encodeURIComponent(file.name), 'content-type': file.type || 'application/octet-stream' } }))));
      return Response.redirect(`${url.pathname.replace(/receber$/, '')}?abrir=recebidos#/`, 303);
    })());
    return;
  }
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
