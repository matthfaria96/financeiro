<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import type { Category } from '$lib/data/types';
  import Icon from './Icon.svelte';
  import { matchKey } from '$lib/features/rules';

  /** Escolha de categoria em dois níveis (categoria › subcategoria) num seletor nativo (ótimo no celular).
   *  `byKey`: o valor é a chave do catálogo (importação); senão é o id. `pill`: aparência de etiqueta. */
  let { value, onchange, byKey = false, confident = true, pill = true, kinds = ['expense', 'income', 'transfer'], allowNone = false }: {
    value: string | null;
    onchange: (value: string) => void;
    byKey?: boolean;
    confident?: boolean;
    pill?: boolean;
    kinds?: string[];
    allowNone?: boolean;
  } = $props();

  const order = ['expense', 'income', 'transfer'];
  const roots = $derived(store.categories.filter((c) => !c.parent_id && kinds.includes(c.kind)).toSorted((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || a.sort_order - b.sort_order));
  const children = (root: Category) => store.categories.filter((c) => c.parent_id === root.id).toSorted((a, b) => a.sort_order - b.sort_order);
  const valueOf = (c: Category) => (byKey ? matchKey(c) : c.id);
  const current = $derived(byKey ? store.categoryByKey.get(value ?? '') : store.categoryById.get(value ?? ''));
  const color = $derived(confident ? current?.color ?? '#78909C' : 'var(--warning)');
</script>

<label class:pill-select={pill} class:plain={!pill} style:--c={color}>
  {#if pill}<Icon name={current?.symbol ?? 'questionmark.circle'} size={13} /><span class="ellipsis">{current?.name ?? 'Sem categoria'}</span>{/if}
  <select value={value ?? ''} onchange={(e) => onchange(e.currentTarget.value)} aria-label="Categoria" class:field={!pill}>
    {#if allowNone}<option value="">Nenhuma</option>{/if}
    {#each roots as root (root.id)}
      {@const subs = children(root)}
      {#if subs.length}
        <optgroup label={root.name}>
          <option value={valueOf(root)}>{root.name} (geral)</option>
          {#each subs as sub (sub.id)}<option value={valueOf(sub)}>{sub.name}</option>{/each}
        </optgroup>
      {:else}
        <option value={valueOf(root)}>{root.name}</option>
      {/if}
    {/each}
  </select>
</label>

<style>
  .pill-select { position: relative; display: inline-flex; align-items: center; gap: 5px; max-width: 170px; padding: 4px 9px; border-radius: 999px; font-size: 12.5px; font-weight: 600; color: var(--c); background: color-mix(in srgb, var(--c) 15%, transparent); cursor: pointer; flex: none; }
  .pill-select select { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
  .plain { display: contents; }
</style>
