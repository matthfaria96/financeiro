<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import type { Category } from '$lib/data/types';
  import Icon from './Icon.svelte';
  import Select from './Select.svelte';
  import { matchKey } from '$lib/features/rules';

  /** Escolha de categoria em dois níveis (categoria › subcategoria) no seletor do app (com busca).
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
  // Duas camadas: categoria principal como grupo; "(geral)" é a própria principal.
  const options = $derived([
    ...(allowNone ? [{ value: '', label: 'Nenhuma' }] : []),
    ...roots.flatMap((root) => {
      const subs = children(root);
      if (!subs.length) return [{ value: valueOf(root), label: root.name, color: root.color }];
      return [{ value: valueOf(root), label: `${root.name} (geral)`, group: root.name, color: root.color }, ...subs.map((sub) => ({ value: valueOf(sub), label: sub.name, group: root.name, color: sub.color }))];
    })
  ]);
</script>

{#if pill}
  <Select value={value ?? ''} {options} label="Categoria" onchange={(v) => onchange(v)}>
    {#snippet face()}<span class="pill-select" style:--c={color}><Icon name={current?.symbol ?? 'questionmark.circle'} size={13} /><span class="ellipsis">{current?.name ?? 'Sem categoria'}</span></span>{/snippet}
  </Select>
{:else}
  <Select value={value ?? ''} {options} label="Categoria" placeholder="Nenhuma" onchange={(v) => onchange(v)} />
{/if}

<style>
  .pill-select { position: relative; display: inline-flex; align-items: center; gap: 5px; max-width: 170px; padding: 4px 9px; border-radius: 999px; font-size: 12.5px; font-weight: 600; color: var(--c); background: color-mix(in srgb, var(--c) 15%, transparent); cursor: pointer; flex: none; }
</style>
