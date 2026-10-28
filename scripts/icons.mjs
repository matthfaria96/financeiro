// Gera src/lib/ui/icons.ts só com os ícones usados (Lucide, licença ISC). Rodar: node scripts/icons.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const map = {
  // categorias (nomes herdados do app nativo)
  airplane: 'plane', 'arrow.down.circle': 'circle-arrow-down', 'arrow.left.arrow.right': 'arrow-left-right',
  'arrow.triangle.swap': 'repeat', bag: 'shopping-bag', banknote: 'banknote', bolt: 'zap', book: 'book-open',
  briefcase: 'briefcase', 'building.2': 'building-2', 'building.columns': 'landmark', car: 'car', 'car.side': 'car-taxi-front',
  cart: 'shopping-cart', 'chart.line.uptrend.xyaxis': 'trending-up', comb: 'scissors', creditcard: 'credit-card',
  'cross.case': 'briefcase-medical', 'cup.and.saucer': 'coffee', desktopcomputer: 'monitor', 'doc.plaintext': 'file-text',
  'doc.text': 'file-text', drop: 'droplet', dumbbell: 'dumbbell', 'figure.and.child.holdinghands': 'baby', flame: 'flame',
  'fork.knife': 'utensils', fuelpump: 'fuel', gamecontroller: 'gamepad-2', graduationcap: 'graduation-cap', hammer: 'hammer',
  heart: 'heart', 'heart.text.square': 'heart-pulse', house: 'house', icloud: 'cloud', parkingsign: 'square-parking',
  pawprint: 'paw-print', percent: 'percent', pills: 'pill', 'play.rectangle': 'tv-minimal-play', 'questionmark.circle': 'circle-help',
  'road.lanes': 'milestone', shield: 'shield', shippingbox: 'package', sofa: 'sofa', stethoscope: 'stethoscope',
  theatermasks: 'drama', ticket: 'ticket', tram: 'tram-front', tshirt: 'shirt', tv: 'tv', wifi: 'wifi', 'wrench.and.screwdriver': 'wrench',
  gift: 'gift', leaf: 'leaf', music: 'music', umbrella: 'umbrella', tag: 'tag',
  // interface
  home: 'layout-grid', transactions: 'circle-dollar-sign', reports: 'chart-pie', calendar: 'calendar-days', more: 'ellipsis',
  plus: 'plus', import: 'download', export: 'upload', search: 'search', 'chevron-left': 'chevron-left', 'chevron-right': 'chevron-right',
  'chevron-down': 'chevron-down', 'chevron-up': 'chevron-up', check: 'check', 'check-circle': 'circle-check', circle: 'circle',
  x: 'x', trash: 'trash-2', pencil: 'pencil', folder: 'folder', file: 'file-text', image: 'image', sparkles: 'sparkles', wand: 'wand-sparkles',
  users: 'users', user: 'user', settings: 'settings', logout: 'log-out', alert: 'triangle-alert', info: 'info', 'arrow-right': 'arrow-right',
  move: 'arrow-right-left', cloud: 'cloud', refresh: 'refresh-cw', lock: 'lock', mail: 'mail', pin: 'pin', activity: 'activity',
  clock: 'clock', list: 'list', filter: 'filter', store: 'store', history: 'history', layers: 'layers', ban: 'ban', copy: 'copy',
  link: 'link', wallet: 'wallet', piggy: 'piggy-bank', bank: 'landmark', card: 'credit-card', cash: 'banknote', invest: 'trending-up',
  receipt: 'receipt', eye: 'eye', 'eye-off': 'eye-off', star: 'star', heartFill: 'heart', person: 'user-round', child: 'baby', people: 'users-round', 'trending-up': 'trending-up', 'trending-down': 'trending-down', grip: 'grip-horizontal', menu: 'menu',
  share: 'share-2', gauge: 'gauge', 'list-checks': 'list-checks', 'external-link': 'external-link', 'square-check': 'square-check', square: 'square',
  table: 'table-2', 'copy-plus': 'copy-plus', basket: 'shopping-basket', flag: 'flag', 'calendar-check': 'calendar-check'
};

const icons = {};
const missing = [];
for (const [key, name] of Object.entries(map)) {
  const file = `node_modules/lucide-static/icons/${name}.svg`;
  if (!existsSync(file)) { missing.push(name); continue; }
  const svg = readFileSync(file, 'utf8');
  icons[key] = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/\s*\n\s*/g, '').trim();
}
if (missing.length) { console.error('faltando:', missing.join(', ')); process.exit(1); }
writeFileSync('src/lib/ui/icons.ts', `// Gerado por scripts/icons.mjs a partir do Lucide (ISC). Não editar à mão.\nexport const icons: Record<string, string> = ${JSON.stringify(icons, null, 1)};\n`);
console.log(Object.keys(icons).length, 'ícones');
