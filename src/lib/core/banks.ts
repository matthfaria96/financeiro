import { fold } from './text';

/** Bancos e cartões conhecidos: nome, código COMPE (usado no OFX), cores do cartão e como achar o arquivo. */
export const bankIds = [
  'nubank', 'inter', 'itau', 'bradesco', 'santander', 'bb', 'caixa', 'c6', 'btg', 'xp', 'mercadopago', 'picpay',
  'pagbank', 'pan', 'neon', 'original', 'will', 'digio', 'sicoob', 'sicredi', 'banrisul', 'safra', 'brb', 'porto', 'other'
] as const;

export type Bank = (typeof bankIds)[number];

export interface BankInfo {
  id: Bank;
  name: string;
  /** Nome curto que vai escrito no cartão. */
  label: string;
  codes: number[];
  /** Trechos (sem acento, minúsculos) que identificam o banco no texto do arquivo. */
  patterns: string[];
  colors: [string, string];
  /** Cor do texto do cartão (bancos de fundo claro usam texto escuro). */
  ink: string;
  /** Cor do brilho do cartão. */
  accent: string;
  checking: string;
  card: string;
}

const white = '#FFFFFF';
const glow = 'rgba(255,255,255,0.1)';

export const banks: Record<Bank, BankInfo> = {
  nubank: {
    id: 'nubank', name: 'Nubank', label: 'Nubank', codes: [260], patterns: ['nu pagamentos', 'nubank', 'nu financeira'],
    colors: ['#9B1FE8', '#5A0A9E'], ink: white, accent: glow,
    checking: 'App › Extrato › ícone de compartilhar › Exportar extrato › OFX (ou CSV)',
    card: 'App › Fatura › Exportar fatura › CSV (ou OFX)'
  },
  inter: {
    id: 'inter', name: 'Inter', label: 'inter', codes: [77], patterns: ['banco inter', 'inter&co', 'bancointer', 'inter s.a', 'inter s/a'],
    colors: ['#FF8A1F', '#E85D04'], ink: white, accent: glow,
    checking: 'App › Extrato › Exportar › OFX (ou CSV)',
    card: 'App › Cartões › Fatura › Exportar › CSV (PDF também funciona)'
  },
  itau: {
    id: 'itau', name: 'Itaú', label: 'Itaú', codes: [341], patterns: ['itau unibanco', 'itaucard', 'banco itau', 'itau'],
    colors: ['#F7860F', '#D35F00'], ink: '#0B2D7A', accent: 'rgba(11,45,122,0.14)',
    checking: 'Site (internet banking) › Conta corrente › Extrato › Salvar em OFX (Money) ou Excel/CSV',
    card: 'Site › Cartões › Fatura › Salvar em OFX ou PDF (no app: Cartão › Fatura › Compartilhar PDF)'
  },
  bradesco: {
    id: 'bradesco', name: 'Bradesco', label: 'Bradesco', codes: [237], patterns: ['bradesco', 'bradescard'],
    colors: ['#E1173F', '#9E0A28'], ink: white, accent: glow,
    checking: 'Site (internet banking) › Saldos e extratos › Extrato › Salvar como OFX (Money)',
    card: 'Site › Cartões › Fatura › Exportar OFX ou PDF'
  },
  santander: {
    id: 'santander', name: 'Santander', label: 'Santander', codes: [33], patterns: ['santander'],
    colors: ['#EC0000', '#A30000'], ink: white, accent: glow,
    checking: 'Site (internet banking) › Conta › Extrato › Exportar › OFX ou Excel/CSV',
    card: 'App ou site › Cartões › Fatura › Baixar PDF (OFX quando o site oferecer)'
  },
  bb: {
    id: 'bb', name: 'Banco do Brasil', label: 'BB', codes: [1], patterns: ['banco do brasil', 'bb.com.br', 'ourocard'],
    colors: ['#FCE94B', '#F4C700'], ink: '#2639A8', accent: 'rgba(38,57,168,0.12)',
    checking: 'App ou site › Extrato › Salvar/Exportar › OFX ou CSV',
    card: 'App › Cartões › Fatura › Exportar › OFX ou PDF'
  },
  caixa: {
    id: 'caixa', name: 'Caixa', label: 'CAIXA', codes: [104], patterns: ['caixa economica federal', 'caixa economica', 'caixa.gov.br', 'cartao caixa'],
    colors: ['#1C6DD0', '#00387A'], ink: white, accent: 'rgba(247,148,29,0.8)',
    checking: 'Internet Banking Caixa › Extrato › Gerar arquivo OFX (ou PDF)',
    card: 'App Cartões Caixa › Fatura › Baixar PDF'
  },
  c6: {
    id: 'c6', name: 'C6 Bank', label: 'C6', codes: [336], patterns: ['c6 bank', 'banco c6', 'c6bank', 'c6 carbon'],
    colors: ['#323232', '#0A0A0A'], ink: white, accent: 'rgba(255,255,255,0.08)',
    checking: 'App › Extrato › Exportar extrato › OFX ou CSV (PDF também funciona)',
    card: 'App › Cartões › Fatura › Exportar › CSV (ou PDF)'
  },
  btg: {
    id: 'btg', name: 'BTG Pactual', label: 'btg', codes: [208], patterns: ['btg pactual', 'banco btg'],
    colors: ['#14336B', '#061630'], ink: white, accent: glow,
    checking: 'App › Conta › Extrato › Exportar › OFX, CSV ou PDF',
    card: 'App › Cartão › Fatura › Exportar › CSV ou PDF'
  },
  xp: {
    id: 'xp', name: 'XP', label: 'XP', codes: [348, 102], patterns: ['banco xp', 'xp investimentos', 'cartao xp'],
    colors: ['#2A2A2A', '#000000'], ink: '#FFC709', accent: 'rgba(255,199,9,0.12)',
    checking: 'App › Conta › Extrato › Exportar › OFX ou PDF',
    card: 'App › Cartão › Fatura › Exportar › PDF'
  },
  mercadopago: {
    id: 'mercadopago', name: 'Mercado Pago', label: 'Mercado Pago', codes: [323], patterns: ['mercado pago', 'mercadopago'],
    colors: ['#00B1EA', '#0070B8'], ink: white, accent: glow,
    checking: 'Site › Seu dinheiro › Extrato › Baixar relatório › CSV',
    card: 'App › Cartão de crédito › Fatura › Baixar PDF'
  },
  picpay: {
    id: 'picpay', name: 'PicPay', label: 'PicPay', codes: [380], patterns: ['picpay'],
    colors: ['#21C25E', '#0B8A3E'], ink: white, accent: glow,
    checking: 'App › Carteira › Extrato › Exportar › PDF ou CSV',
    card: 'App › Cartão › Fatura › Baixar PDF'
  },
  pagbank: {
    id: 'pagbank', name: 'PagBank', label: 'PagBank', codes: [290], patterns: ['pagbank', 'pagseguro internet'],
    colors: ['#1BB99A', '#0A7A63'], ink: white, accent: 'rgba(255,214,10,0.25)',
    checking: 'App ou site › Extrato › Exportar › OFX, CSV ou PDF',
    card: 'App › Cartão › Fatura › Baixar PDF'
  },
  pan: {
    id: 'pan', name: 'Banco Pan', label: 'pan', codes: [623], patterns: ['banco pan', 'bancopan'],
    colors: ['#18B4EC', '#0067A8'], ink: white, accent: glow,
    checking: 'App › Extrato › Exportar › PDF',
    card: 'App › Cartão › Fatura › Baixar PDF'
  },
  neon: {
    id: 'neon', name: 'Neon', label: 'neon', codes: [735, 536], patterns: ['neon pagamentos', 'banco neon', 'neon.com.br'],
    colors: ['#00C2FF', '#0062D6'], ink: white, accent: glow,
    checking: 'App › Extrato › Exportar › PDF ou CSV',
    card: 'App › Cartão › Fatura › Baixar PDF'
  },
  original: {
    id: 'original', name: 'Original', label: 'original', codes: [212], patterns: ['banco original'],
    colors: ['#00A859', '#006B38'], ink: white, accent: glow,
    checking: 'App › Extrato › Exportar › OFX ou PDF',
    card: 'App › Cartão › Fatura › Baixar PDF'
  },
  will: {
    id: 'will', name: 'Will Bank', label: 'will', codes: [280], patterns: ['will bank', 'willbank', 'will financeira'],
    colors: ['#FFE600', '#F5C400'], ink: '#1A1A1A', accent: 'rgba(0,0,0,0.08)',
    checking: 'App › Extrato › Exportar › PDF',
    card: 'App › Cartão › Fatura › Baixar PDF'
  },
  digio: {
    id: 'digio', name: 'Digio', label: 'digio', codes: [335], patterns: ['digio'],
    colors: ['#103A8C', '#041A4A'], ink: white, accent: 'rgba(56,217,245,0.18)',
    checking: 'App › Extrato › Exportar › PDF',
    card: 'App › Fatura › Baixar PDF'
  },
  sicoob: {
    id: 'sicoob', name: 'Sicoob', label: 'Sicoob', codes: [756], patterns: ['sicoob', 'bancoob'],
    colors: ['#00AE9D', '#003641'], ink: white, accent: 'rgba(201,210,0,0.25)',
    checking: 'Sicoob Internet Banking › Extrato › Exportar › OFX ou CSV',
    card: 'App Sicoob Cartões › Fatura › Baixar PDF'
  },
  sicredi: {
    id: 'sicredi', name: 'Sicredi', label: 'Sicredi', codes: [748], patterns: ['sicredi'],
    colors: ['#4CB01E', '#22700C'], ink: white, accent: glow,
    checking: 'Internet Banking › Extrato › Exportar › OFX ou PDF',
    card: 'App › Cartões › Fatura › Baixar PDF'
  },
  banrisul: {
    id: 'banrisul', name: 'Banrisul', label: 'Banrisul', codes: [41], patterns: ['banrisul'],
    colors: ['#0A63B4', '#003468'], ink: white, accent: glow,
    checking: 'Home Banking › Extrato › Exportar › OFX ou PDF',
    card: 'App › Cartões › Fatura › Baixar PDF'
  },
  safra: {
    id: 'safra', name: 'Safra', label: 'Safra', codes: [422], patterns: ['banco safra', 'safrapay'],
    colors: ['#1C2C4C', '#0A1326'], ink: '#D4B26A', accent: 'rgba(212,178,106,0.14)',
    checking: 'Site › Extrato › Exportar › OFX ou Excel/CSV',
    card: 'App › Cartões › Fatura › Baixar PDF'
  },
  brb: {
    id: 'brb', name: 'BRB', label: 'BRB', codes: [70], patterns: ['banco de brasilia', 'brb'],
    colors: ['#0A5BB0', '#00336E'], ink: white, accent: glow,
    checking: 'Internet Banking › Extrato › Exportar › OFX ou PDF',
    card: 'App › Cartão › Fatura › Baixar PDF'
  },
  porto: {
    id: 'porto', name: 'Porto Bank', label: 'Porto', codes: [], patterns: ['porto bank', 'porto seguro cartoes', 'portoseguro cartao'],
    colors: ['#0046C0', '#00246A'], ink: white, accent: glow,
    checking: 'App Porto › Conta › Extrato › Baixar PDF',
    card: 'App Porto › Cartão › Fatura › Baixar PDF'
  },
  other: {
    id: 'other', name: 'Outro banco', label: '', codes: [], patterns: [],
    colors: ['#3A4A55', '#1E272E'], ink: white, accent: glow,
    checking: 'Procure “Exportar”, “Salvar” ou “Compartilhar” no extrato e escolha OFX (às vezes chamado “Money”) ou CSV',
    card: 'Na fatura, procure “Exportar” ou “Baixar”: CSV ou OFX; se só tiver PDF, também funciona'
  }
};

/** Os bancos na ordem em que aparecem na tela (os mais usados primeiro, "Outro" no fim). */
export const bankList: BankInfo[] = bankIds.map((id) => banks[id]);

export const bankName = Object.fromEntries(bankList.map((bank) => [bank.id, bank.name])) as Record<Bank, string>;

/** Banco salvo no banco de dados, mesmo que seja um código antigo ou desconhecido. */
export function bankInfo(id: string): BankInfo {
  return banks[id as Bank] ?? banks.other;
}

export function bankFromCode(raw: string): Bank {
  const code = Number(raw.replace(/\D/g, ''));
  if (!code) return 'other';
  return bankList.find((bank) => bank.codes.includes(code))?.id ?? 'other';
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const matchers = bankList
  .filter((bank) => bank.patterns.length)
  .map((bank) => ({ id: bank.id, regex: new RegExp(`(?<![\\p{L}\\p{N}])(?:${bank.patterns.map(escape).join('|')})(?![\\p{L}\\p{N}])`, 'u') }));

/**
 * Banco citado num texto (cabeçalho do arquivo, nome do arquivo). Vale o que aparece primeiro:
 * o nome do próprio banco costuma estar no topo, e outros bancos só aparecem depois, nas transferências.
 */
export function bankFromText(text: string): Bank {
  const folded = fold(text.replace(/[_-]+/g, ' '));
  let best: { id: Bank; at: number } | null = null;
  for (const { id, regex } of matchers) {
    const at = folded.search(regex);
    if (at >= 0 && (!best || at < best.at)) best = { id, at };
  }
  return best?.id ?? 'other';
}
