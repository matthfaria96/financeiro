<script lang="ts">
  import { slide } from 'svelte/transition';
  import { store } from '$lib/data/store.svelte';
  import type { Category } from '$lib/data/types';
  import CategoryIcon from './CategoryIcon.svelte';
  import { hint } from './hint';

  /**
   * Escolha de categoria (lançamento manual e edição): só os ícones das principais (nome no balão e no topo).
   * Ao tocar, as subcategorias abrem logo abaixo, já em "Geral"; a pessoa só toca numa sub se quiser.
   * Movimentações entre contas (saque, caixinha, fatura) não ficam aqui: no "+" é a aba Transferir; na edição, a linha "Entre contas".
   */
  let { value, onchange, kind = 'expense', allowNone = false }: {
    value: string | null;
    onchange: (value: string | null) => void;
    kind?: 'expense' | 'income';
    allowNone?: boolean;
  } = $props();

  const sorted = (list: Category[]) => list.toSorted((a, b) => a.sort_order - b.sort_order);
  const mains = $derived(sorted(store.categories.filter((c) => !c.parent_id && c.kind === kind)));
  const current = $derived(value ? store.categoryById.get(value) ?? null : null);
  // A principal acesa: a própria escolhida ou a mãe da sub escolhida.
  const root = $derived(current?.parent_id ? store.categoryById.get(current.parent_id) ?? null : current);
  const subs = $derived(root ? sorted(store.categories.filter((c) => c.parent_id === root.id)) : []);

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

<div class="picker">
  <div class="head">
    <span class="title">Categoria</span>
    {#if current}<span class="chosen ellipsis" style:--c={current.color}>{root && root.id !== current.id ? `${root.name} › ` : ''}{current.name}</span>{/if}
  </div>

  <!-- As subcategorias abrem numa faixa logo abaixo da linha do ícone tocado (como a grade de Fotos), numa linha só que arrasta para o lado. -->
  <div class="grid" role="radiogroup" aria-label="Categoria" bind:clientWidth={gridWidth}>
    {#each mains as category, i (category.id)}
      {@render tile(category, i)}
    {/each}
    {#if root && subs.length}
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
</div>

{#snippet tile(category: Category, i: number)}
  {@const on = root?.id === category.id}
  <button type="button" class="ico" class:on style:--c={category.color} role="radio" aria-checked={on} aria-label={category.name} style:order={i * 2} onclick={() => pick(category)} use:hint={[category.name, '']}>
    <CategoryIcon symbol={category.symbol} color={category.color} size={34} />
  </button>
{/snippet}

<style>
  .picker { display: flex; flex-direction: column; gap: 10px; padding: 12px 12px 14px; background: var(--card); border: 1px solid var(--stroke); border-radius: 16px; box-shadow: var(--highlight); }
  .head { display: flex; align-items: center; gap: 8px; padding: 0 4px; min-width: 0; }
  .title { color: var(--text); flex: none; }
  .chosen { flex: 1; min-width: 0; text-align: right; font-size: 13px; font-weight: 600; color: var(--c); }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(44px, 1fr)); gap: 4px; }
  .ico { display: grid; place-items: center; aspect-ratio: 1; padding: 0; border-radius: 14px; border: 1px solid transparent; background: none; opacity: 0.75; transition: opacity 0.2s, background 0.2s, border-color 0.2s, transform 0.2s var(--spring); }
  .ico:hover { opacity: 1; background: rgba(255, 255, 255, 0.05); }
  .ico:active { transform: scale(0.92); transition-duration: 0.08s; }
  .ico.on { opacity: 1; color: var(--text); border-color: color-mix(in srgb, var(--c) 60%, transparent); background: color-mix(in srgb, var(--c) 12%, transparent); box-shadow: 0 0 16px color-mix(in srgb, var(--c) 22%, transparent); }
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
  @media (prefers-reduced-motion: reduce) { .ico { transition: none; } }
</style>
