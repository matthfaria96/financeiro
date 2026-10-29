// Uso: Chrome com --remote-debugging-port=9333, depois `node scripts/overflow.mjs 9333 http://localhost:4317` (acha o que passa da tela em 390 px).
// Em 390 px, acha elementos que passam da largura da tela (causa de rolagem lateral).
const [port, base] = process.argv.slice(2);
const routes = ['/', '/transacoes', '/transacoes/todos', '/notas', '/notas/lista/nb-mercado', '/notas/lista/nb-mercado/historico', '/notas/desejos', '/mais/carro/car-1', '/mais', '/mais/contas', '/mais/categorias', '/mais/estabelecimentos', '/mais/pessoas', '/mais/importacoes', '/mais/compartilhar', '/mais/ajustes', '/mais/projetos', '/mais/projetos/prj-apto', '/relatorios', '/relatorios/planilha', '/contas/x', '/a-pagar'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const p = new Map();
ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); if (d.id && p.has(d.id)) { p.get(d.id)(d.result); p.delete(d.id); } });
const send = (method, params = {}) => new Promise((r) => { const n = ++id; p.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await send('Page.navigate', { url: `${base}/?demo#/` }); await sleep(6000);
const probe = `(() => { const W = document.documentElement.clientWidth; const bad = [];
  for (const el of document.querySelectorAll('main *, [role=dialog] *')) { const r = el.getBoundingClientRect(); if (!r.width) continue;
    let p = el.parentElement, clipped = false; while (p) { const o = getComputedStyle(p).overflowX; if ((o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') && p !== document.body && p.tagName !== 'MAIN') { clipped = true; break; } p = p.parentElement; }
    if (!clipped && (r.right > W + 1 || r.left < -1)) bad.push((el.className && typeof el.className === 'string' ? el.tagName.toLowerCase() + '.' + el.className.split(' ')[0] : el.tagName.toLowerCase()) + ' ' + Math.round(r.left) + '→' + Math.round(r.right) + ' "' + (el.textContent || '').trim().slice(0, 30) + '"'); }
  return { scroll: document.documentElement.scrollWidth > W + 1, bad: [...new Set(bad)].slice(0, 6) }; })()`;
for (const route of routes) {
  await send('Runtime.evaluate', { expression: `location.hash = '#${route}'` }); await sleep(1500);
  const r = (await send('Runtime.evaluate', { expression: probe, returnByValue: true })).result.value;
  if (r.scroll || r.bad.length) console.log(route, r.scroll ? '(ROLA PARA O LADO)' : '', '\n   ' + r.bad.join('\n   '));
  if (route === '/a-pagar') await send('Runtime.evaluate', { expression: `document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))` });
}
console.log('fim'); ws.close();
