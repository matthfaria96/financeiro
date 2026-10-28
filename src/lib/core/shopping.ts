import { dayMonth, type Day } from './dates';

/** "2 leite", "2x leite", "1,5 kg carne", "3 un pão" → quantidade e nome. */
export function parseItem(text: string): { name: string; quantity: string } {
  const clean = text.trim().replace(/\s+/g, ' ');
  const match = clean.match(/^(\d+(?:[.,]\d+)?\s*(?:x|un|und|kg|g|l|ml|pct|pcts|cx|dz)?)\.?\s+(.+)$/i);
  if (!match) return { name: capitalize(clean), quantity: '' };
  return { name: capitalize(match[2]), quantity: match[1].replace(/\s+/g, ' ').toLowerCase() };
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export const defaultListName = (day: Day) => `Mercado · ${dayMonth(day)}`;

/** Itens da próxima lista: os mesmos, desmarcados e na mesma ordem. */
export function duplicateItems<T extends { name: string; quantity: string; sort_order: number }>(items: T[]): { name: string; quantity: string; checked: boolean; sort_order: number }[] {
  return items
    .toSorted((a, b) => a.sort_order - b.sort_order)
    .map((item, index) => ({ name: item.name, quantity: item.quantity, checked: false, sort_order: index }));
}

/** A lista mais nova primeiro (a aberta mais recente fica no topo). */
export function newestFirst<T extends { created_at: string }>(lists: T[]): T[] {
  return lists.toSorted((a, b) => b.created_at.localeCompare(a.created_at));
}

/** Figurinha do item pelo nome ("Leite integral" → 🥛). Primeira palavra-chave que aparecer ganha. */
const emojiRules: [string[], string][] = [
  [['leite', 'iogurte', 'bebida lactea'], '🥛'], [['queijo', 'mussarela', 'requeijao', 'parmesao'], '🧀'], [['manteiga', 'margarina'], '🧈'],
  [['ovo'], '🥚'], [['pao', 'bisnaguinha', 'torrada'], '🍞'], [['bolo', 'torta'], '🍰'], [['biscoito', 'bolacha', 'cookie'], '🍪'],
  [['arroz'], '🍚'], [['feijao', 'lentilha', 'grao de bico'], '🫘'], [['macarrao', 'massa', 'espaguete', 'lasanha'], '🍝'],
  [['farinha', 'aveia', 'fuba', 'trigo'], '🌾'], [['acucar', 'adocante'], '🍬'], [['sal'], '🧂'], [['oleo', 'azeite'], '🫒'],
  [['cafe'], '☕'], [['cha'], '🍵'], [['chocolate', 'achocolatado', 'nescau', 'toddy'], '🍫'],
  [['frango', 'peito de frango', 'coxa'], '🍗'], [['carne', 'patinho', 'alcatra', 'picanha', 'acem', 'costela', 'bife'], '🥩'],
  [['linguica', 'salsicha', 'bacon', 'presunto', 'salame', 'mortadela'], '🥓'], [['peixe', 'tilapia', 'salmao', 'atum', 'sardinha'], '🐟'],
  [['camarao'], '🦐'], [['banana'], '🍌'], [['maca', 'maçã'], '🍎'], [['laranja', 'mexerica', 'tangerina'], '🍊'], [['limao'], '🍋'],
  [['uva'], '🍇'], [['morango'], '🍓'], [['melancia'], '🍉'], [['melao'], '🍈'], [['abacaxi'], '🍍'], [['manga'], '🥭'], [['pera'], '🍐'],
  [['abacate'], '🥑'], [['mamao', 'kiwi', 'fruta'], '🥝'], [['tomate'], '🍅'], [['batata'], '🥔'], [['cenoura'], '🥕'], [['cebola', 'alho'], '🧅'],
  [['alface', 'rucula', 'couve', 'espinafre', 'verdura', 'salada'], '🥬'], [['brocolis'], '🥦'], [['pepino', 'abobrinha'], '🥒'],
  [['pimentao', 'pimenta'], '🫑'], [['milho', 'pipoca'], '🌽'], [['cogumelo'], '🍄'], [['agua'], '💧'], [['refrigerante', 'coca', 'guarana'], '🥤'],
  [['suco'], '🧃'], [['cerveja'], '🍺'], [['vinho'], '🍷'], [['sorvete'], '🍦'], [['pizza'], '🍕'], [['hamburguer'], '🍔'],
  [['papel higienico', 'papel toalha', 'guardanapo'], '🧻'], [['detergente', 'sabao', 'amaciante', 'desinfetante', 'agua sanitaria', 'limpador', 'multiuso'], '🧴'],
  [['esponja', 'pano'], '🧽'], [['shampoo', 'condicionador', 'sabonete', 'creme', 'desodorante'], '🧼'], [['pasta de dente', 'escova de dente', 'fio dental'], '🪥'],
  [['fralda', 'lenco umedecido'], '👶'], [['racao', 'petisco', 'areia'], '🐾'], [['remedio', 'dipirona', 'vitamina'], '💊'],
  [['saco de lixo', 'lixo'], '🗑️'], [['pilha', 'lampada'], '💡'], [['vela'], '🕯️'], [['flor'], '💐']
];

export function itemEmoji(name: string): string {
  const text = ` ${name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()} `;
  for (const [words, emoji] of emojiRules) {
    // Palavra curta (sal, chá, ovo, pão) só vale inteira (ou no plural); as outras valem pelo começo da palavra.
    if (words.some((word) => (word.length <= 3 ? text.includes(` ${word} `) || text.includes(` ${word}s `) : text.includes(` ${word}`)))) return emoji;
  }
  return '🛒';
}
