<script lang="ts">
  import { untrack } from 'svelte';
  import { slide } from 'svelte/transition';
  import { store } from '$lib/data/store.svelte';
  import type { Category } from '$lib/data/types';
  import CategoryIcon from './CategoryIcon.svelte';
  import Icon from './Icon.svelte';
  import { hint } from './hint';
  import { CARD_PAYMENT, CASH_WITHDRAWAL, INTERNAL_TRANSFER, INVESTMENT } from '$lib/core/catalog';

  /**
   * Escolha de categoria (lançamento manual e edição).
   * Simples: grade das principais com ícone e nome, um toque.
   * Detalhado: só os ícones (compacto, nome no balão) e, à parte, as movimentações entre contas com nome; embaixo abre o detalhe da escolhida,
   * já em "Geral" (a primeira opção), e a pessoa só toca numa sub se quiser.
   * O modo fica lembrado neste aparelho; abre detalhado sozinho quando o valor já é uma sub ou movimentação.
   */
  let { value, onchange, kind = 'expense', allowNone = false }: {
    value: string | null;
    onchange: (value: string | null) => void;
    /** Principais mostradas: as de gasto ou as de entrada. Transferências só no detalhado. */
    kind?: 'expense' | 'income';
    allowNone?: boolean;
  } = $props();

  const MODE_KEY = 'categoryPicker.detailed';
  const readMode = () => { try { return localStorage.getItem(MODE_KEY) === '1'; } catch { return false; } };
  let detailed = $state(readMode());
  function toggleMode() {
    detailed = !detailed;
    try { localStorage.setItem(MODE_KEY, detailed ? '1' : '0'); } catch { /* sem armazenamento: vale só nesta tela */ }
  }

  const sorted = (list: Category[]) => list.toSorted((a, b) => a.sort_order - b.sort_order);
  const mains = $derived(sorted(store.categories.filter((c) => !c.parent_id && c.kind === kind)));
  const moves = $derived(sorted(store.categories.filter((c) => !c.parent_id && c.kind === 'transfer')));
  const current = $derived(value ? store.categoryById.get(value) ?? null : null);
  // A principal acesa: a própria escolhida ou a mãe da sub escolhida.
  const root = $derived(current?.parent_id ? store.categoryById.get(current.parent_id) ?? null : current);
  const subs = $derived(root ? sorted(store.categories.filter((c) => c.parent_id === root.id)) : []);
  // Valor já detalhado (sub ou movimentação) abre o detalhado; depois a pessoa pode fechar.
  $effect(() => {
    if (current?.parent_id || current?.kind === 'transfer') untrack(() => (detailed = true));
  });

  // O que cada movimentação significa, em palavras simples (chaves fixas do catálogo).
  const moveInfo: Record<string, string> = {
    [INVESTMENT]: 'Dinheiro guardado ou aplicado (caixinha, CDB, ações). Sai da conta, mas continua seu.',
    [INTERNAL_TRANSFER]: 'Passou de uma conta sua para outra conta sua.',
    [CARD_PAYMENT]: 'Pagamento da fatura do cartão. As compras do cartão já contam como gasto, então aqui não conta de novo.',
    [CASH_WITHDRAWAL]: 'Tirou dinheiro no caixa: vira saldo em Dinheiro. O gasto conta quando você usar o dinheiro.'
  };

  // Em que linha da grade está o ícone escolhido: a faixa de detalhes entra logo depois dela, com a setinha apontando para ele.
  let gridWidth = $state(0);
  const columns = $derived(Math.max(1, Math.floor((gridWidth + 4) / 48)));
  const rootIndex = $derived(root ? mains.findIndex((c) => c.id === root.id) : -1);
  const rowEnd = $derived(Math.min(mains.length - 1, (Math.floor(Math.max(0, rootIndex) / columns) + 1) * columns - 1));
  const stripOrder = $derived(rowEnd * 2 + 1);
  const caretX = $derived(((Math.max(0, rootIndex) % columns) + 0.5) / columns * 100);

  function pick(category: Category) {
    onchange(root?.id === category.id && allowNone ? null : category.id);
  }
</script>

<div class="picker" class:detailed>
  <div class="head">
    <span class="title">Categoria</span>
    {#if current}<span class="chosen ellipsis" style:--c={current.color}>{root && root.id !== current.id ? `${root.name} › ` : ''}{current.name}</span>{/if}
    <button type="button" class="mode" aria-pressed={detailed} onclick={toggleMode} use:hint={['Detalhar', 'Simples: categorias principais com nome. Detalhado: só os ícones; a subcategoria (ex.: Casa › Luz) abre logo abaixo do ícone tocado.']}>
      {detailed ? 'Simples' : 'Detalhar'}<Icon name="chevron-down" size={13} />
    </button>
  </div>

  {#if detailed}<span class="group caption">{kind === 'expense' ? 'Gastos' : 'Entradas'}</span>{/if}
  <!-- Detalhado: as subcategorias abrem numa faixa logo abaixo da linha do ícone tocado (como a grade de Fotos), numa linha só que arrasta para o lado. -->
  <div class="grid" role="radiogroup" aria-label="Categoria" bind:clientWidth={gridWidth}>
    {#each mains as category, i (category.id)}
      {@render tile(category, i)}
    {/each}
    {#if detailed && root && root.kind !== 'transfer' && subs.length}
      <div class="strip" style:order={stripOrder} style:--c={root.color} style:--x="{caretX}%" transition:slide={{ duration: 220 }}>
        <div class="chips" role="radiogroup" aria-label="Detalhe de {root.name}">
          <button type="button" class="chip" class:on={current?.id === root.id} role="radio" aria-checked={current?.id === root.id} style:--c={root.color} onclick={() => onchange(root.id)}>Geral</button>
          {#each subs as sub (sub.id)}
            <button type="button" class="chip" class:on={current?.id === sub.id} role="radio" aria-checked={current?.id === sub.id} style:--c={sub.color} onclick={() => onchange(sub.id)}>{sub.name}</button>
          {/each}
        </div>
      </div>
    {/if}
  </div>
  {#if detailed && moves.length}
    <div class="moves-head">
      <span class="group caption">Entre suas contas</span>
      <span class="caption faint">não conta como gasto nem como ganho</span>
    </div>
    <div class="moves" role="radiogroup" aria-label="Movimentação entre contas">
      {#each moves as move (move.id)}
        <button type="button" class="move" class:on={root?.id === move.id} style:--c={move.color} role="radio" aria-checked={root?.id === move.id} onclick={() => pick(move)}>
          <CategoryIcon symbol={move.symbol} color={move.color} size={26} /><span class="move-name">{move.name}</span>
        </button>
      {/each}
    </div>
    {#if root?.kind === 'transfer'}<p class="caption info" transition:slide={{ duration: 200 }}>{moveInfo[root.key] ?? 'Movimentação entre suas contas.'}</p>{/if}
  {/if}
</div>

{#snippet tile(category: Category, i: number)}
  {@const on = root?.id === category.id}
  {#if detailed}
    <button type="button" class="ico" class:on style:--c={category.color} role="radio" aria-checked={on} aria-label={category.name} style:order={i * 2} onclick={() => pick(category)} use:hint={[category.name, '']}>
      <CategoryIcon symbol={category.symbol} color={category.color} size={34} />
    </button>
  {:else}
    <button type="button" class="tile" class:on style:--c={category.color} role="radio" aria-checked={on} onclick={() => pick(category)}>
      <CategoryIcon symbol={category.symbol} color={category.color} size={34} />
      <span class="name">{category.name}</span>
    </button>
  {/if}
{/snippet}

<style>
  .picker { display: flex; flex-direction: column; gap: 10px; padding: 12px 12px 14px; background: var(--card); border: 1px solid var(--stroke); border-radius: 16px; box-shadow: var(--highlight); }
  .head { display: flex; align-items: center; gap: 8px; padding: 0 4px; min-width: 0; }
  .title { color: var(--text); flex: none; }
  .chosen { flex: 1; min-width: 0; text-align: right; font-size: 13px; font-weight: 600; color: var(--c); }
  .mode { margin-left: auto; flex: none; display: inline-flex; align-items: center; gap: 3px; padding: 4px 10px; border-radius: 999px; border: 1px solid var(--stroke); background: rgba(255, 255, 255, 0.05); color: var(--accent); font-size: 12.5px; font-weight: 600; }
  .chosen + .mode { margin-left: 0; }
  .mode :global(svg) { transition: transform 0.3s var(--ease); }
  .mode[aria-pressed='true'] :global(svg) { transform: rotate(180deg); }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(78px, 1fr)); gap: 6px; }
  .detailed .grid { grid-template-columns: repeat(auto-fill, minmax(44px, 1fr)); gap: 4px; }
  .tile { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 10px 4px 8px; border-radius: 14px; border: 1px solid transparent; background: rgba(255, 255, 255, 0.025); color: var(--text-2); transition: background 0.2s, border-color 0.2s, transform 0.2s var(--spring), color 0.2s; }
  .tile:hover { background: rgba(255, 255, 255, 0.06); color: var(--text); }
  .ico { display: grid; place-items: center; aspect-ratio: 1; padding: 0; border-radius: 14px; border: 1px solid transparent; background: none; opacity: 0.75; transition: opacity 0.2s, background 0.2s, border-color 0.2s, transform 0.2s var(--spring); }
  .ico:hover { opacity: 1; background: rgba(255, 255, 255, 0.05); }
  .tile:active, .ico:active { transform: scale(0.92); transition-duration: 0.08s; }
  .tile.on, .ico.on { opacity: 1; color: var(--text); border-color: color-mix(in srgb, var(--c) 60%, transparent); background: color-mix(in srgb, var(--c) 12%, transparent); box-shadow: 0 0 16px color-mix(in srgb, var(--c) 22%, transparent); }
  .group { padding: 0 4px; margin-bottom: -4px; font-weight: 600; color: var(--text-2); }
  .moves-head { display: flex; align-items: baseline; flex-wrap: wrap; gap: 0 8px; padding: 10px 4px 0; margin-bottom: -4px; border-top: 1px solid var(--stroke); }
  .moves-head .group { padding: 0; margin: 0; }
  .moves { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
  .move { display: flex; align-items: center; gap: 8px; min-width: 0; padding: 6px 10px 6px 6px; border-radius: 12px; border: 1px solid var(--stroke); background: rgba(255, 255, 255, 0.025); color: var(--text-2); font-size: 13px; text-align: left; transition: background 0.2s, border-color 0.2s, color 0.2s; }
  .move:hover { background: rgba(255, 255, 255, 0.06); color: var(--text); }
  .move.on { color: var(--text); border-color: color-mix(in srgb, var(--c) 60%, transparent); background: color-mix(in srgb, var(--c) 12%, transparent); }
  .move-name { min-width: 0; line-height: 1.25; }
  .info { margin: 0; padding: 0 4px; line-height: 1.45; color: var(--text-2); }
  .name { font-size: 11.5px; line-height: 1.2; text-align: center; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .strip { grid-column: 1 / -1; position: relative; margin: 6px 0 4px; padding: 8px 0; border-radius: 14px; background: color-mix(in srgb, var(--c) 9%, rgba(255, 255, 255, 0.03)); border: 1px solid color-mix(in srgb, var(--c) 28%, transparent); }
  /* Setinha apontando para o ícone escolhido. */
  .strip::before { content: ''; position: absolute; top: -6px; left: calc(var(--x) - 5px); width: 10px; height: 10px; transform: rotate(45deg); background: inherit; border-left: inherit; border-top: inherit; border-radius: 2px 0 0 0; transition: left 0.3s var(--ease); }
  .strip .chips { flex-wrap: nowrap; overflow-x: auto; padding: 0 8px; scrollbar-width: none; -webkit-mask-image: linear-gradient(90deg, transparent, #000 8px, #000 calc(100% - 20px), transparent); mask-image: linear-gradient(90deg, transparent, #000 8px, #000 calc(100% - 20px), transparent); }
  .strip .chips::-webkit-scrollbar { display: none; }
  .strip .chip { flex: none; padding: 5px 11px; font-size: 12.5px; }
  .chips { display: flex; gap: 6px; }
  .chip { padding: 6px 12px; border-radius: 999px; border: 1px solid var(--stroke); background: rgba(255, 255, 255, 0.04); color: var(--text-2); font-size: 13px; transition: background 0.2s, border-color 0.2s, color 0.2s; }
  .chip:hover { color: var(--text); background: rgba(255, 255, 255, 0.08); }
  .chip.on { color: var(--c); border-color: color-mix(in srgb, var(--c) 55%, transparent); background: color-mix(in srgb, var(--c) 14%, transparent); font-weight: 600; }
  @media (prefers-reduced-motion: reduce) { .tile, .ico, .mode :global(svg) { transition: none; } }
</style>
