import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** Site estático (GitHub Pages). BASE_PATH = "/financeiro" enquanto não houver subdomínio próprio. */
const base = process.env.BASE_PATH ?? '';

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({ pages: 'build', assets: 'build', strict: true }),
    paths: { base, relative: true },
    // Rotas no "#" (…/#/transacoes): funciona no GitHub Pages sem servidor e sem página 404.
    router: { type: 'hash' },
    serviceWorker: { register: true }
  }
};
