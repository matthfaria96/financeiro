<script lang="ts">
  import { untrack } from 'svelte';
  import { slide } from 'svelte/transition';
  import { store } from '$lib/data/store.svelte';
  import type { Category } from '$lib/data/types';
  import CategoryIcon from './CategoryIcon.svelte';
  import Icon from './Icon.svelte';
  import { hint } from './hint';

  /**
   * Escolha de categoria (lançamento manual e edição).
   * Simples: grade das principais com ícone e nome, um toque.
   * Detalhado: só os ícones (compacto, nome no balão), mais as movimentações; embaixo abre o detalhe da escolhida,
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

  function pick(category: Category) {
    onchange(root?.id === category.id && allowNone ? null : category.id);
  }
</script>

<div class="picker" class:detailed>
  <div class="head">
    <span class="title">Categoria</span>
    {#if current && !detailed}<span class="chosen ellipsis" style:--c={current.color}>{root && root.id !== current.id ? `${root.name} › ` : ''}{current.name}</span>{/if}
    <button type="button" class="mode" aria-pressed={detailed} onclick={toggleMode} use:hint={['Detalhar', 'Simples: categorias principais com nome. Detalhado: só os ícones, com subcategorias (ex.: Casa › Luz) e movimentações entre contas.']}>
      {detailed ? 'Simples' : 'Detalhar'}<Icon name="chevron-down" size={13} />
    </button>
  </div>

  <div class="grid" role="radiogroup" aria-label="Categoria">
    {#each mains as category (category.id)}
      {@render tile(category)}
    {/each}
    {#if detailed && moves.length}
      <span class="sep" aria-hidden="true"></span>
      {#each moves as category (category.id)}
        {@render tile(category)}
      {/each}
    {/if}
  </div>

  {#if detailed && root}
    <div class="detail" transition:slide={{ duration: 260 }}>
      <b class="detail-name" style:--c={root.color}>{root.name}</b>
      {#if root.kind === 'transfer'}
        <span class="caption">Movimentação entre contas: não conta como gasto.</span>
      {:else if subs.length}
        <div class="chips">
          <button type="button" class="chip" class:on={current?.id === root.id} style:--c={root.color} onclick={() => onchange(root.id)}>Geral</button>
          {#each subs as sub (sub.id)}
            <button type="button" class="chip" class:on={current?.id === sub.id} style:--c={sub.color} onclick={() => onchange(sub.id)}>{sub.name}</button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

{#snippet tile(category: Category)}
  {@const on = root?.id === category.id}
  {#if detailed}
    <button type="button" class="ico" class:on style:--c={category.color} role="radio" aria-checked={on} aria-label={category.name} onclick={() => pick(category)} use:hint={[category.name, '']}>
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
  .sep { grid-column: 1 / -1; height: 1px; margin: 4px 6px; background: var(--stroke); }
  .name { font-size: 11.5px; line-height: 1.2; text-align: center; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .detail { display: flex; flex-direction: column; gap: 8px; padding: 12px 4px 0; border-top: 1px solid var(--stroke); }
  .detail-name { font-size: 14px; font-weight: 600; color: var(--c); }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { padding: 6px 12px; border-radius: 999px; border: 1px solid var(--stroke); background: rgba(255, 255, 255, 0.04); color: var(--text-2); font-size: 13px; transition: background 0.2s, border-color 0.2s, color 0.2s; }
  .chip:hover { color: var(--text); background: rgba(255, 255, 255, 0.08); }
  .chip.on { color: var(--c); border-color: color-mix(in srgb, var(--c) 55%, transparent); background: color-mix(in srgb, var(--c) 14%, transparent); font-weight: 600; }
  @media (prefers-reduced-motion: reduce) { .tile, .ico, .mode :global(svg) { transition: none; } }
</style>
