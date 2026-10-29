import type { Account, Bill, Entry } from '$lib/data/types';
import { addMonths, clampedDay, lastDay, monthOf, today, type Day, type Month } from '$lib/core/dates';
import { BillCycle } from '$lib/core/billCycle';
import { store } from '$lib/data/store.svelte';
import { blankEntry } from './mirrors';

/**
 * Demonstração pesada (`?demo&muito`): 3 anos, 10 contas, ~18 mil lançamentos e 25 contas fixas,
 * para medir o app sob muitos dados. Tudo fictício; entra direto no `store` (sem passar pelo importador).
 */
const MONTHS = 36;

/** Sorteio repetível (a mesma demonstração a cada abertura). */
function random(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type AccountSeed = [id: string, name: string, bank: Account['bank'], kind: Account['kind'], closing: number, due: number, person: string, anchor: number | null];
const accountSeeds: AccountSeed[] = [
  ['st-nu', 'Nubank conta', 'nubank', 'checking', 2, 10, 'p-eu', 842_310], ['st-inter', 'Inter conta', 'inter', 'checking', 2, 10, 'p-esposa', 516_480],
  ['st-itau', 'Itaú conta', 'itau', 'checking', 2, 10, 'p-eu', 129_950], ['st-nu-card', 'Nubank cartão', 'nubank', 'creditCard', 3, 10, 'p-eu', null],
  ['st-inter-card', 'Inter cartão', 'inter', 'creditCard', 13, 20, 'p-esposa', null], ['st-c6-card', 'C6 cartão', 'c6', 'creditCard', 5, 12, 'p-eu', null],
  ['st-itau-card', 'Itaú cartão', 'itau', 'creditCard', 25, 5, 'p-eu', null], ['st-caixinha', 'Caixinha Nubank', 'nubank', 'savings', 2, 10, 'p-eu', 2_450_000],
  ['st-tesouro', 'Tesouro Direto', 'xp', 'savings', 2, 10, 'p-eu', 1_830_000], ['st-cash', 'Dinheiro', 'other', 'cash', 2, 10, 'p-eu', 32_000]
];

// [título, categoria, estabelecimento (id do catálogo) ou '', valor médio (R$), vezes por mês]
type Spend = [string, string, string, number, number];
const cardSpends: Spend[] = [
  ['Ifd*Restaurante Sabor', 'alim-delivery', 'mer-ifood', 62, 6], ['Ifd*Pizzaria Bella', 'alim-delivery', 'mer-ifood', 88, 3], ['Ifd*Sushi House', 'alim-delivery', 'mer-ifood', 140, 1],
  ['Rappi*Hamburgueria', 'alim-delivery', 'mer-rappi', 74, 2], ['Uber* Trip', 'carro-apps', 'mer-uber', 26, 9], ['99 Pop', 'carro-apps', 'mer-99', 21, 4],
  ['Carrefour Hiper', 'alim-mercado', 'mer-carrefour', 520, 2], ['Assai Atacadista', 'alim-mercado', 'mer-assai', 410, 2], ['Pao de Acucar', 'alim-mercado', 'mer-pao-de-acucar', 180, 3],
  ['Hortifruti Bom Preco', 'alim-mercado', '', 65, 4], ['Acougue Boi Gordo', 'alim-mercado', '', 120, 2], ['Posto Shell Centro', 'carro-combustivel', 'mer-shell', 230, 3],
  ['Posto Ipiranga', 'carro-combustivel', 'mer-ipiranga', 210, 2], ['Sem Parar', 'carro-pedagio', 'mer-sem-parar', 48, 1], ['Estapar Shopping', 'carro-estacionamento', '', 22, 3],
  ['Drogasil', 'saude-farmacia', 'mer-drogasil', 84, 3], ['Drogaria Sao Paulo', 'saude-farmacia', '', 66, 2], ['Amazon Marketplace', 'compras-online', 'mer-amazon', 150, 3],
  ['Mercadolivre*Loja', 'compras-online', 'mer-mercado-livre', 120, 3], ['Shopee*Variedades', 'compras-online', 'mer-shopee', 58, 3], ['Renner Shopping', 'compras-roupas', '', 260, 1],
  ['Zara Brasil', 'compras-roupas', '', 340, 0.5], ['Cinemark', 'lazer-passeios', '', 86, 1], ['Outback', 'alim-restaurante', '', 230, 1], ['Mcdonalds', 'alim-restaurante', 'mer-mcdonalds', 48, 2],
  ['Starbucks', 'alim-padaria', 'mer-starbucks', 32, 3], ['Padaria Pao Quente', 'alim-padaria', '', 28, 6], ['Boticario', 'cuidados-beleza', '', 110, 1], ['Petz', 'pets', '', 190, 1],
  ['Leroy Merlin', 'casa-manutencao', '', 280, 0.5], ['Tok Stok', 'casa-itens', '', 320, 0.3], ['Steam Games', 'lazer-jogos', '', 75, 0.5], ['Apple.Com/Bill', 'ass-apps', 'mer-apple', 19.9, 1],
  ['Google Storage', 'ass-apps', 'mer-google', 9.99, 1], ['Livraria Cultura', 'edu-cursos', '', 89, 0.5], ['Barbearia Navalha', 'cuidados-beleza', '', 55, 1]
];
const cashSpends: Spend[] = [['Feira', 'alim-mercado', '', 85, 4], ['Pastel e caldo de cana', 'alim-padaria', '', 30, 3], ['Banca de jornal', 'outros', '', 15, 2], ['Estacionamento rua', 'carro-estacionamento', '', 12, 4]];
const pixSpends: Spend[] = [
  ['Transferência enviada pelo Pix - JOAO PEREIRA', 'pix-pessoas', '', 180, 3], ['Transferência enviada pelo Pix - MARIA SOUZA', 'pix-pessoas', '', 90, 3],
  ['Transferência enviada pelo Pix - DIARISTA ANA', 'casa', '', 220, 4], ['Compra no débito - PADARIA PAO QUENTE', 'alim-padaria', '', 25, 6], ['Compra no débito - MERCADINHO DA ESQUINA', 'alim-mercado', '', 70, 6],
  ['Pagamento de boleto efetuado - CLINICA SAUDE', 'saude-consultas', '', 280, 0.4], ['Tarifa de manutenção', 'taxas-banco', '', 29.9, 1]
];
// Compras parceladas no cartão: [título, categoria, valor total (R$), parcelas]
const bigBuys: [string, string, number, number][] = [
  ['Notebook Loja Exemplo', 'compras-eletronicos', 4200, 10], ['Geladeira Casa Bela', 'casa-itens', 3600, 12], ['Celular Loja Exemplo', 'compras-eletronicos', 2800, 8],
  ['Sofa Moveis Conforto', 'casa-itens', 3100, 10], ['Passagem Aerea Voe Bem', 'lazer-viagens', 2400, 6], ['Curso Online Aprenda', 'edu-cursos', 1500, 5],
  ['Bicicleta Pedal Forte', 'lazer-passeios', 1900, 6], ['Tv Smart 55 Loja Exemplo', 'compras-eletronicos', 3300, 10], ['Dentista Sorriso', 'saude-consultas', 1800, 4], ['Pneus Roda Firme', 'carro-manutencao', 2200, 4]
];
// Contas fixas: [nome, valor (R$), dia, padrão no extrato, categoria, forma, variável, mês do ano (anual)]
type BillSeed = [string, number, number, string, string, NonNullable<Bill['method']>, boolean, number | null];
const billSeeds: BillSeed[] = [
  ['Aluguel', 2350, 6, 'imobiliaria casa boa', 'casa-moradia', 'account', false, null], ['Condomínio', 690, 8, 'condominio jardim', 'casa-moradia', 'account', false, null],
  ['Escola', 1290, 15, 'colegio pequeno saber', 'edu-escola', 'account', false, null], ['Inglês', 420, 12, 'escola idiomas', 'edu-cursos', 'account', false, null],
  ['Plano de saúde', 980, 20, 'plano saude vida', 'saude-plano', 'account', false, null], ['Vivo Fibra', 129.9, 8, 'vivo fibra', 'casa-internet', 'account', false, null],
  ['Celular Claro', 69.9, 18, 'claro movel', 'casa-internet', 'account', false, null], ['Netflix', 55.9, 3, 'netflix', 'ass-streaming', 'card', false, null],
  ['Spotify', 34.9, 9, 'spotify', 'ass-streaming', 'card', false, null], ['Disney+', 43.9, 13, 'disney plus', 'ass-streaming', 'card', false, null],
  ['Max', 39.9, 22, 'max streaming', 'ass-streaming', 'card', false, null], ['Smart Fit', 119.9, 23, 'smart fit', 'cuidados-academia', 'card', false, null],
  ['Seguro do carro', 210, 28, 'porto seguro', 'carro-seguro', 'account', false, null], ['Diarista', 600, 27, 'diarista ana mensal', 'casa', 'account', false, null],
  ['Luz', 238, 9, 'enel', 'casa-luz', 'account', true, null], ['Água', 96, 12, 'sabesp', 'casa-agua', 'account', true, null], ['Gás', 85, 16, 'comgas', 'casa-gas', 'account', true, null],
  ['Clube', 160, 5, 'clube recreativo', 'lazer-passeios', 'account', false, null], ['IPVA do carro', 1853.28, 15, 'ipva', 'carro-impostos', 'account', false, 1],
  ['IPTU da casa', 1045.73, 10, 'iptu', 'taxas-impostos', 'account', false, 2], ['Licenciamento', 174.08, 20, 'licenciamento', 'carro-impostos', 'account', false, 3],
  ['Matrícula da escola', 1290, 25, 'matricula escolar', 'edu-escola', 'account', false, 1], ['Seguro residencial', 389.9, 5, 'seguro residencial', 'casa', 'account', false, 8],
  ['Anuidade do conselho', 540, 30, 'anuidade conselho', 'taxas', 'account', false, 3], ['Revisão do carro', 890, 14, 'revisao concessionaria', 'carro-manutencao', 'account', false, 10]
];

interface Ctx {
  rand: () => number;
  cat: (key: string) => string | null;
  now: Day;
  rows: Partial<Entry>[];
  n: number;
}

const cents = (ctx: Ctx, reais: number, spread = 0.25) => Math.round(reais * (1 + (ctx.rand() * 2 - 1) * spread) * 100);
const dayIn = (month: Month, d: number) => clampedDay(month, Math.max(1, Math.round(d)));

function push(ctx: Ctx, account: AccountSeed, date: Day, amount: number, title: string, key: string, extra: Partial<Entry> = {}) {
  if (date > ctx.now) return;
  ctx.n += 1;
  ctx.rows.push({ ...blankEntry(), id: `st-e${ctx.n}`, account_id: account[0], date, amount_cents: amount, title, original_title: title, import_key: `st-${ctx.n}`,
    category_id: ctx.cat(key), person_id: account[6], created_at: `${date}T12:00:00.000Z`, ...extra });
}

/** Quantas vezes no mês (fração vira sorteio: 0,5 = metade dos meses). */
const times = (ctx: Ctx, perMonth: number) => Math.floor(perMonth) + (ctx.rand() < perMonth % 1 ? 1 : 0);

function spends(ctx: Ctx, account: AccountSeed, month: Month, list: Spend[], scale: number, extra: (date: Day) => Partial<Entry> = () => ({}), price = 1) {
  for (const [title, key, merchant, reais, perMonth] of list) {
    for (let k = times(ctx, perMonth * scale); k > 0; k--) {
      const date = dayIn(month, 1 + ctx.rand() * 27);
      push(ctx, account, date, -cents(ctx, reais * price), title, key, { merchant_id: merchant || null, ...extra(date) });
    }
  }
}

function checkingMonth(ctx: Ctx, month: Month, index: number) {
  const [nu, inter, itau] = accountSeeds;
  push(ctx, nu, dayIn(month, 5), 1_700_000 + index * 5_000, 'Transferência recebida pelo Pix - EMPRESA EXEMPLO LTDA - SALARIO', 'salario');
  push(ctx, inter, dayIn(month, 5), 1_100_000 + index * 3_000, 'Pix recebido - Escola Aprender Ltda', 'salario');
  if (month.endsWith('-12')) push(ctx, nu, dayIn(month, 20), 1_700_000, 'Transferência recebida pelo Pix - EMPRESA EXEMPLO LTDA - 13 SALARIO', 'salario');
  if (ctx.rand() < 0.45) push(ctx, itau, dayIn(month, 10 + ctx.rand() * 15), cents(ctx, 1600, 0.5), 'Transferência recebida pelo Pix - ESTUDIO FREELA DESIGN', 'outras-receitas');
  if (ctx.rand() < 0.2) push(ctx, nu, dayIn(month, 17), cents(ctx, 320, 0.4), 'Reembolso recebido - PLANO SAUDE', 'outras-receitas');
  push(ctx, nu, lastDay(month), cents(ctx, 38, 0.3), 'Rendimento da conta', 'rendimentos');
  push(ctx, nu, dayIn(month, 25), -100_000, 'Aplicação RDB', 'investimentos');
  push(ctx, nu, dayIn(month, 14), -20_000, 'Saque 24h - Banco24Horas', 'saque');
  spends(ctx, nu, month, pixSpends, 1);
  spends(ctx, inter, month, pixSpends, 0.8);
  spends(ctx, itau, month, pixSpends.slice(3), 0.5);
  push(ctx, accountSeeds[9], dayIn(month, 14), 20_000, 'Saque 24h', 'saque');
  spends(ctx, accountSeeds[9], month, cashSpends, 1);
  push(ctx, accountSeeds[7], dayIn(month, 25), 100_000, 'Aplicação RDB', 'investimentos');
  push(ctx, accountSeeds[8], dayIn(month, 7), cents(ctx, 900, 0.4), 'Aplicação Tesouro Selic', 'investimentos');
}

/** Cada conta fixa paga no mês, com o texto que casa com o padrão dela. */
function billsMonth(ctx: Ctx, month: Month) {
  const nuCard = accountSeeds[3];
  billSeeds.forEach(([, reais, day, pattern, key, method, variable, yearly], i) => {
    if (yearly !== null && Number(month.slice(5)) !== yearly) return;
    const account = method === 'card' ? nuCard : accountSeeds[i % 3];
    const title = method === 'card' ? pattern.toUpperCase() : `Pagamento de boleto efetuado - ${pattern.toUpperCase()}`;
    const date = dayIn(month, day);
    const due = method === 'card' ? new BillCycle(nuCard[4], nuCard[5]).dueDate(date) : null;
    push(ctx, account, date, -Math.round(reais * 100 * (variable ? 0.75 + ctx.rand() * 0.5 : 1)), title, key, due ? { bill_due_date: due } : {});
  });
}

function cardMonth(ctx: Ctx, month: Month) {
  accountSeeds.filter((a) => a[3] === 'creditCard').forEach((card, i) => {
    const cycle = new BillCycle(card[4], card[5]);
    spends(ctx, card, month, cardSpends, [1.5, 1.2, 1, 0.8][i], (date) => ({ bill_due_date: cycle.dueDate(date) }), 0.3);
    // Uma compra parcelada a cada dois meses, mais ou menos: parcela n/N na fatura n (como os bancos que repetem a data da compra).
    for (let k = times(ctx, 0.6); k > 0; k--) {
      const [title, key, total, parts] = bigBuys[Math.floor(ctx.rand() * bigBuys.length)];
      const date = dayIn(month, 1 + ctx.rand() * 27);
      const first = cycle.dueDate(date);
      const parcel = Math.round((total * 100) / parts);
      for (let p = 1; p <= parts; p++) {
        const due = clampedDay(addMonths(monthOf(first), p - 1), card[5]);
        if (due > addMonths(monthOf(ctx.now), 1) + '-31') break;
        push(ctx, card, date, -parcel, `${title} - Parcela ${p}/${parts}`, key, { installment_current: p, installment_total: parts, bill_due_date: due });
      }
    }
  });
}

/** Fatura paga: o pagamento entra no cartão e sai da conta no dia do vencimento (só faturas que já venceram). */
function cardPayments(ctx: Ctx) {
  const totals = new Map<string, number>();
  for (const row of ctx.rows) {
    if (!row.bill_due_date || row.bill_due_date >= ctx.now) continue;
    const key = `${row.account_id}|${row.bill_due_date}`;
    totals.set(key, (totals.get(key) ?? 0) - (row.amount_cents ?? 0));
  }
  for (const [key, total] of totals) {
    const [accountId, due] = key.split('|');
    const card = accountSeeds.find((a) => a[0] === accountId)!;
    const payer = card[2] === 'inter' ? accountSeeds[1] : card[2] === 'itau' ? accountSeeds[2] : accountSeeds[0];
    push(ctx, card, due, total, 'Pagamento recebido', 'pagamento-fatura', { bill_due_date: due });
    push(ctx, payer, due, -total, `Pagamento de fatura - ${card[1]}`, 'pagamento-fatura');
  }
}

export function stressEntries(now: Day = today()): Partial<Entry>[] {
  const ctx: Ctx = { rand: random(20261029), cat: (key) => store.categoryByKey.get(key)?.id ?? null, now, rows: [], n: 0 };
  const months = Array.from({ length: MONTHS }, (_, i) => addMonths(monthOf(now), i - MONTHS + 1));
  months.forEach((month, index) => {
    checkingMonth(ctx, month, index);
    billsMonth(ctx, month);
    cardMonth(ctx, month);
  });
  cardPayments(ctx);
  return ctx.rows;
}

function stressAccounts(now: Day): Partial<Account>[] {
  return accountSeeds.map(([id, name, bank, kind, closing, due, person, anchor], i) => ({
    id, name, bank, kind, external_id: '', color: '', last_digits: String(1200 + i * 731).slice(-4), archived: false, sort_order: i, closing_day: closing, due_day: due,
    workspace_id: person === 'p-esposa' ? 'w-esposa' : 'w-meu', default_person_id: person, investment_source_id: null,
    anchor_balance_cents: anchor, anchor_date: anchor === null ? null : now, anchor_batch_id: null, prev_anchor_balance_cents: null, prev_anchor_date: null
  }));
}

function stressBills(): Partial<Bill>[] {
  return billSeeds.map(([name, reais, day, pattern, key, method, variable, yearly]) => ({
    name, amount_cents: Math.round(reais * 100), day_of_month: day, match_pattern: pattern, active: true, category_id: store.categoryByKey.get(key)?.id ?? null,
    account_id: null, person_id: null, workspace_id: 'w-meu', method, variable, frequency: yearly === null ? 'monthly' : 'yearly', month_of_year: yearly
  }));
}

/** Semeia a demonstração pesada (chamado no lugar de `seedDemo` quando o endereço tem `&muito`). */
export async function seedStress() {
  const now = today();
  await store.insert('accounts', stressAccounts(now));
  await store.insert('entries', stressEntries(now));
  await store.insert('bills', stressBills());
}
