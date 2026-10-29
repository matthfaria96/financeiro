<script lang="ts">
  import Select from '$lib/ui/Select.svelte';
  import { store } from '$lib/data/store.svelte';
  import type { Category } from '$lib/data/types';
  import { UNCATEGORIZED, costName, type CategoryKind } from '$lib/core/catalog';
  import Sheet from '$lib/ui/Sheet.svelte';
  import CategoryIcon from '$lib/ui/CategoryIcon.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import { palette } from '$lib/ui/look';
  import { categoryCost } from '$lib/features/model';

  let { open = $bindable(), category = null, parent = null }: { open: boolean; category?: Category | null; parent?: Category | null } = $props();
  const symbols = ['tag', 'house', 'bolt', 'drop', 'flame', 'wifi', 'cart', 'fork.knife', 'cup.and.saucer', 'car', 'fuelpump', 'parkingsign', 'wrench.and.screwdriver', 'shield', 'cross.case', 'pills', 'stethoscope', 'play.rectangle', 'tv', 'bag', 'tshirt', 'desktopcomputer', 'graduationcap', 'book', 'theatermasks', 'airplane', 'gamecontroller', 'heart', 'dumbbell', 'figure.and.child.holdinghands', 'pawprint', 'gift', 'building.columns', 'percent', 'briefcase', 'banknote', 'creditcard', 'leaf', 'hammer', 'sofa', 'umbrella', 'music'];
  let name = $state('');
  let symbol = $state('tag');
  let color = $state(palette[0]);
  let kind = $state<CategoryKind>('expense');
  let parentId = $state<string | null>(null);
  let cost = $state<'' | 'fixed' | 'variable'>('');
  let keywords = $state('');
  let confirmDelete = $state(false);

  $effect(() => {
    if (!open) return;
    confirmDelete = false;
    if (category) ({ name, symbol, color, kind, parent_id: parentId, cost_type: cost, extra_keywords: keywords } = category);
    else {
      name = ''; parentId = parent?.id ?? null; kind = parent?.kind ?? 'expense'; color = parent?.color ?? palette[0]; symbol = parent?.symbol ?? 'tag';
      cost = parent ? '' : 'variable'; keywords = '';
    }
  });
  const roots = $derived(store.categories.filter((c) => !c.parent_id && c.kind === kind && c.id !== category?.id).toSorted((a, b) => a.sort_order - b.sort_order));
  const hasChildren = $derived(!!category && store.categories.some((c) => c.parent_id === category.id));
  const parentCategory = $derived(store.categoryById.get(parentId ?? ''));

  async function save() {
    const fields: Partial<Category> = { name: name.trim(), symbol, color, kind, parent_id: parentId, cost_type: kind === 'expense' ? (parentId ? cost : cost || 'variable') : '', extra_keywords: keywords };
    if (category) await store.update('categories', category.id, fields);
    else await store.insert('categories', [{ key: '', sort_order: store.categories.length + 1, ...fields }]);
    open = false;
  }

  async function remove() {
    if (!category) return;
    const fallback = category.parent_id ?? store.categoryByKey.get(UNCATEGORIZED)?.id ?? null;
    await store.updateMany('entries', store.entries.filter((e) => e.category_id === category!.id).map((e) => ({ id: e.id, patch: { category_id: fallback } })));
    await store.remove('categories', [category.id]);
    open = false;
  }
</script>

<Sheet bind:open title={category ? 'Categoria' : parent ? 'Nova subcategoria' : 'Nova categoria'}>
  {#snippet actions()}<button class="btn primary" disabled={!name.trim()} onclick={save}>Salvar</button>{/snippet}
  <div class="row" style="padding: 14px 4px 0"><CategoryIcon {symbol} {color} size={48} /><input class="input grow" placeholder="Nome" bind:value={name} /></div>
  <div class="form-group" style="margin-top: 12px">
    <label class="form-row"><span class="field-label">Tipo</span><span class="field"><Select bind:value={kind} label="Tipo" options={[{ value: 'expense', label: 'Despesa' }, { value: 'income', label: 'Receita' }, { value: 'transfer', label: 'Transferência entre contas' }]} /></span></label>
    {#if !hasChildren}
      <label class="form-row"><span class="field-label">Dentro de</span><span class="field"><Select bind:value={parentId} label="Dentro de" options={[{ value: null, label: 'Nenhuma (principal)' }, ...roots.map((r) => ({ value: r.id, label: r.name, color: r.color }))]} /></span></label>
    {/if}
    {#if kind === 'expense'}
      <label class="form-row"><span class="field-label">Gasto</span><span class="field"><Select bind:value={cost} label="Gasto" options={[...(parentId ? [{ value: '', label: `Igual à categoria (${costName[categoryCost(parentCategory)].toLowerCase()})` }] : []), { value: 'fixed', label: 'Fixo' }, { value: 'variable', label: 'Variável' }]} /></span></label>
    {/if}
  </div>
  <div class="form-title">Ícone</div>
  <div class="card grid">{#each symbols as s}<button class="sym" class:on={s === symbol} style:--c={color} onclick={() => (symbol = s)} aria-label={s}><Icon name={s} size={19} /></button>{/each}</div>
  <div class="form-title">Cor</div>
  <div class="card colors">{#each palette as c}<button class="swatch" class:on={c === color} style:background={c} aria-label="Cor" onclick={() => (color = c)}></button>{/each}</div>
  <div class="form-title">Palavras-chave extras</div>
  <div class="form-group"><label class="form-row"><textarea class="field" rows="2" placeholder="ex.: padaria do zé, academia x" bind:value={keywords}></textarea></label></div>
  <p class="form-footer">Separe por vírgula. Se a descrição do banco tiver uma delas, cai nesta categoria.</p>
  {#if category && !category.key}
    <div class="form-group" style="margin-top: 18px">
      {#if confirmDelete}<div class="form-row"><span class="grow small neg">Apagar? Os lançamentos vão para {category.parent_id ? 'a categoria principal' : 'Outros'}.</span><button class="btn danger" onclick={remove}>Apagar</button></div>
      {:else}<button class="form-row neg" style="background: none; border: 0; width: 100%; text-align: left" onclick={() => (confirmDelete = true)}>Apagar categoria</button>{/if}
    </div>
  {/if}
</Sheet>

<style>
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(40px, 1fr)); gap: 6px; padding: 10px; }
  .sym { height: 40px; border-radius: 10px; border: 0; background: none; color: var(--text-2); display: grid; place-items: center; }
  .sym.on { color: var(--c); background: color-mix(in srgb, var(--c) 22%, transparent); }
  .colors { display: flex; flex-wrap: wrap; gap: 10px; padding: 12px; }
  .swatch { width: 28px; height: 28px; border-radius: 50%; border: 0; }
  .swatch.on { box-shadow: 0 0 0 2px #121916, 0 0 0 4px #fff; }
</style>
