/**
 * Cálculos guardados enquanto as entradas não mudam. As tabelas do `store` são `$state.raw` (toda escrita cria uma
 * lista nova), então a identidade da lista diz se algo mudou. Quem chama passa em `deps` tudo o que o cálculo lê
 * do estado reativo: ler `deps` registra a dependência mesmo quando o resultado vem guardado.
 */
const slots = new WeakMap<object, Map<string, { deps: unknown[]; value: unknown }>>();

const same = (a: unknown[], b: unknown[]) => a.length === b.length && a.every((value, i) => Object.is(value, b[i]));

export function memo<T>(owner: object, name: string, deps: unknown[], compute: () => T): T {
  let byName = slots.get(owner);
  if (!byName) slots.set(owner, (byName = new Map()));
  const slot = byName.get(name);
  if (slot && same(slot.deps, deps)) return slot.value as T;
  const value = compute();
  byName.set(name, { deps, value });
  return value;
}

/** Comparação de texto por código (datas "YYYY-MM-DD" e carimbos ISO): mesma ordem que `localeCompare`, bem mais rápida. */
export const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
