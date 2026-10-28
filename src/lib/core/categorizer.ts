import { bankCategoryMap, categorySeeds, UNCATEGORIZED, type CategoryKind } from './catalog';
import { displayName, fold } from './text';

/** Regra vinda de um estabelecimento: "quando a descrição tiver X…". */
export interface UserRule {
  id: string;
  pattern: string;
  categoryKey?: string | null;
  personId?: string | null;
  rename?: string | null;
}

export type SuggestionSource = { type: 'rule'; id: string } | { type: 'keyword' } | { type: 'bank' } | { type: 'sign' } | { type: 'none' };

export interface Suggestion {
  categoryKey: string;
  personId: string | null;
  displayName: string;
  source: SuggestionSource;
}

export const isConfident = (suggestion: Suggestion) => suggestion.source.type !== 'none';

/** Categorias que só descrevem o meio (Pix, TED), não o que foi pago: só valem se nada mais casar. */
const genericKeys = new Set(['pix-pessoas', 'outras-receitas']);

export function defaultKeywords(): Record<string, string[]> {
  return Object.fromEntries(categorySeeds.map((seed) => [seed.key, seed.keywords]));
}

/** Decide categoria, pessoa e nome, nesta ordem: estabelecimentos do usuário (o trecho mais longo vence)
 *  → palavras-chave → categoria que o banco mandou → sinal. */
export class Categorizer {
  private rules: UserRule[];
  private specific: [string, string[]][];
  private generic: [string, string[]][];

  constructor(rules: UserRule[], private keywords: Record<string, string[]> = defaultKeywords(), private kinds: Record<string, CategoryKind> = {}) {
    this.rules = rules.filter((rule) => fold(rule.pattern)).sort((a, b) => b.pattern.length - a.pattern.length);
    const entries = Object.entries(keywords);
    this.specific = entries.filter(([key]) => !genericKeys.has(key));
    this.generic = entries.filter(([key]) => genericKeys.has(key));
  }

  private kind(key: string): CategoryKind {
    return this.kinds[key] ?? categorySeeds.find((seed) => seed.key === key)?.kind ?? 'expense';
  }

  suggest(title: string, memo: string, amountCents: number, bankCategory?: string): Suggestion {
    const text = fold(`${title} ${memo}`);
    const name = displayName(title);
    const rule = this.rules.find((candidate) => text.includes(fold(candidate.pattern)));
    if (rule) {
      const key = rule.categoryKey ?? this.keywordMatch(text, amountCents) ?? (amountCents > 0 ? 'outras-receitas' : UNCATEGORIZED);
      return { categoryKey: key, personId: rule.personId ?? null, displayName: rule.rename || name, source: { type: 'rule', id: rule.id } };
    }
    // Estorno abate a despesa original (mesma categoria da compra), não vira receita.
    if (amountCents > 0 && (text.includes('estorno') || text.includes('reembolso de compra') || text.includes('devolucao'))) {
      return { categoryKey: this.keywordMatch(text, -amountCents) ?? UNCATEGORIZED, personId: null, displayName: name, source: { type: 'keyword' } };
    }
    const keyword = this.keywordMatch(text, amountCents);
    if (keyword) return { categoryKey: keyword, personId: null, displayName: name, source: { type: 'keyword' } };
    const bank = bankCategory ? bankCategoryMap[fold(bankCategory)] : undefined;
    if (bank) return { categoryKey: bank, personId: null, displayName: name, source: { type: 'bank' } };
    if (amountCents > 0) return { categoryKey: 'outras-receitas', personId: null, displayName: name, source: { type: 'sign' } };
    return { categoryKey: UNCATEGORIZED, personId: null, displayName: name, source: { type: 'none' } };
  }

  private keywordMatch(text: string, amountCents: number): string | null {
    return this.longest(text, this.specific, amountCents) ?? this.longest(text, this.generic, amountCents);
  }

  private longest(text: string, list: [string, string[]][], amountCents: number): string | null {
    let best: { key: string; weight: number } | null = null;
    for (const [key, words] of list) {
      const kind = this.kind(key);
      if (amountCents > 0 && kind === 'expense') continue;
      if (amountCents < 0 && kind === 'income') continue;
      for (const word of words) {
        const folded = fold(word);
        if (!folded || !containsWord(text, folded)) continue;
        // Códigos de adquirente ("ifd*") identificam a loja com certeza.
        const weight = folded.length + (folded.includes('*') ? 50 : 0);
        if (!best || weight > best.weight) best = { key, weight };
      }
    }
    return best?.key ?? null;
  }
}

const isLetter = (character: string | undefined) => !!character && /\p{L}/u.test(character);

/** Palavra no começo (evita "tim" em "otimo"); palavras de até 3 letras precisam terminar junto. */
function containsWord(text: string, word: string): boolean {
  let from = 0;
  for (;;) {
    const index = text.indexOf(word, from);
    if (index < 0) return false;
    const atStart = index === 0 || !isLetter(text[index - 1]);
    const atEnd = index + word.length === text.length || !isLetter(text[index + word.length]);
    if (atStart && (word.length > 3 || atEnd)) return true;
    from = index + 1;
  }
}
