import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
  build: { target: 'es2022', cssMinify: true },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' }
});
