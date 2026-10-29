// Gera as imagens do PWA com o Chrome (remote debugging): telas de abertura do iPhone/iPad, ícones dos atalhos
// e as capturas da janela de instalação do Android.
// Uso: Chrome com --remote-debugging-port=9333 e o app em `npx vite preview --port 4317`, depois
//   node scripts/pwa-assets.mjs 9333 http://localhost:4317
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const [port, base] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const pending = new Map();
ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d.result); pending.delete(d.id); } });
const send = (method, params = {}) => new Promise((r) => { const n = ++id; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
await send('Page.enable');

const icon = `data:image/png;base64,${readFileSync('static/icon-512.png').toString('base64')}`;
const shot = async (file, width, height, scale, url, wait = 600, mobile = true, jpeg = false) => {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile });
  await send('Page.navigate', { url });
  await sleep(wait);
  const { data } = await send('Page.captureScreenshot', jpeg ? { format: 'jpeg', quality: 88 } : { format: 'png' });
  writeFileSync(file, Buffer.from(data, 'base64'));
  console.log('ok', file);
};

// Telas de abertura (iOS): mesmo fundo do app, ícone no centro e o nome embaixo. [largura CSS, altura CSS, escala]
const splash = (w, h) => `data:text/html,${encodeURIComponent(`<!doctype html><html><body style="margin:0;height:100vh;display:grid;place-items:center;
  background:radial-gradient(${w}px ${h * 0.6}px at 50% 0%, rgba(43,212,164,.22), transparent 62%), linear-gradient(180deg,#0b1714,#060a09 60%);
  font-family:-apple-system,'SF Pro Display',system-ui;color:#f4f7f6">
  <div style="display:flex;flex-direction:column;align-items:center;gap:${Math.round(w * 0.05)}px;margin-top:-6vh">
  <img src="${icon}" style="width:${Math.round(Math.min(w, h) * 0.3)}px;border-radius:22.5%;box-shadow:0 18px 60px rgba(43,212,164,.28)">
  <div style="font-weight:700;font-size:${Math.round(Math.min(w, h) * 0.065)}px;letter-spacing:-.02em">Financeiro</div></div></body></html>`)}`;
const devices = [
  [440, 956, 3], [402, 874, 3], [420, 912, 3], [430, 932, 3], [393, 852, 3], [428, 926, 3], [390, 844, 3], [375, 812, 3],
  [414, 896, 3], [414, 896, 2], [375, 667, 2], [414, 736, 3], [1024, 1366, 2], [834, 1194, 2], [820, 1180, 2], [810, 1080, 2], [744, 1133, 2]
];
mkdirSync('static/splash', { recursive: true });
const links = [];
for (const [w, h, s] of devices) {
  const name = `splash/${w * s}x${h * s}.jpg`;
  await shot(`static/${name}`, w, h, s, splash(w, h), 400, true, true);
  links.push(`<link rel="apple-touch-startup-image" media="(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${s}) and (orientation: portrait)" href="%sveltekit.assets%/${name}" />`);
}
writeFileSync('scripts/splash-links.html', links.join('\n') + '\n'); // cole no src/app.html

// Ícones dos atalhos (96 px): símbolo branco sobre a cor do app.
const glyph = (path, color) => `data:text/html,${encodeURIComponent(`<!doctype html><body style="margin:0;width:96px;height:96px;display:grid;place-items:center;background:linear-gradient(160deg,${color},#06140f)">
  <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${path}</svg></body>`)}`;
mkdirSync('static/shortcuts', { recursive: true });
await shot('static/shortcuts/import.png', 96, 96, 1, glyph('<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>', '#20b98d'), 300, false);
await shot('static/shortcuts/new.png', 96, 96, 1, glyph('<path d="M12 5v14"/><path d="M5 12h14"/>', '#3987e5'), 300, false);
await shot('static/shortcuts/notes.png', 96, 96, 1, glyph('<path d="m3 6 2 2 4-4"/><path d="m3 14 2 2 4-4"/><path d="M13 6h8"/><path d="M13 14h8"/>', '#ff9f1c'), 300, false);

// Capturas para a janela de instalação (dados fictícios da demonstração).
mkdirSync('static/screenshots', { recursive: true });
await shot('static/screenshots/inicio.png', 390, 844, 2, `${base}/?demo&captura#/`, 7000);
await shot('static/screenshots/lancamentos.png', 390, 844, 2, `${base}/?demo&captura#/transacoes`, 7000);
await shot('static/screenshots/computador.png', 1440, 900, 1, `${base}/?demo&captura#/`, 7000, false);
process.exit(0);
