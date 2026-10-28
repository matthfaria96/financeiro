<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import { costName, kindName, type CategoryKind } from '$lib/core/catalog';
  import Icon from '$lib/ui/Icon.svelte';
  import CategoryIcon from '$lib/ui/CategoryIcon.svelte';
  import SectionTitle from '$lib/ui/SectionTitle.svelte';
  import { hint } from '$lib/ui/hint';
  import SubHeader from '$lib/screens/more/SubHeader.svelte';
  import CategoryEditor from '$lib/screens/more/CategoryEditor.svelte';
  import { categoryCost } from '$lib/features/model';
  import type { Category } from '$lib/data/types';

  let expanded = $state<Set<string>>(new Set());
  let editing = $state<Category | null>(null);
  let parent = $state<Category | null>(null);
  let open = $state(false);
  const counts = $derived.by(() => {
    const map = new Map<string, number>();
    for (const e of store.entries) if (e.category_id) map.set(e.category_id, (map.get(e.category_id) ?? 0) + 1);
    return map;
  });
  const children = (root: Category) => store.categories.filter((c) => c.parent_id === root.id).toSorted((a, b) => a.sort_order - b.sort_order);
  const roots = (kind: CategoryKind) => store.categories.filter((c) => !c.parent_id && c.kind === kind).toSorted((a, b) => a.sort_order - b.sort_order);
  function edit(category: Category | null, p: Category | null = null) {
    editing = category;
    parent = p;
    open = true;
  }
  function toggle(id: string) {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    expanded = next;
  }
</script>

<div class="page">
  <SubHeader title="Categorias"><button class="icon-btn" aria-label="Nova categoria" onclick={() => edit(null)}><Icon name="plus" /></button></SubHeader>
  {#each ['expense', 'income', 'transfer'] as CategoryKind[] as kind}
    <SectionTitle title={kindName[kind]} />
    <div class="card flush list">
      {#each roots(kind) as root (root.id)}
        {@const subs = children(root)}
        {@const total = (counts.get(root.id) ?? 0) + subs.reduce((s, c) => s + (counts.get(c.id) ?? 0), 0)}
        <div class="list-row">
          <button class="expand" onclick={() => subs.length && toggle(root.id)} aria-label={subs.length ? 'Ver subcategorias' : root.name}>
            {#if subs.length}<Icon name={expanded.has(root.id) ? 'chevron-down' : 'chevron-right'} size={14} class="faint" />{:else}<span style="width: 14px"></span>{/if}
            <CategoryIcon symbol={root.symbol} color={root.color} size={34} />
            <span class="grow stack-sm" style="gap: 1px; min-width: 0; text-align: left"><span>{root.name}</span>{#if subs.length}<span class="caption ellipsis">{subs.map((s) => s.name).join(', ')}</span>{/if}</span>
          </button>
          {#if kind === 'expense'}<span class="pill" class:fixed={categoryCost(root) === 'fixed'}>{costName[categoryCost(root)]}</span>{/if}
          <span class="muted num small">{total}</span>
          <button class="icon-btn" aria-label="Editar {root.name}" onclick={() => edit(root)} use:hint={['Editar', 'Nome, ícone, cor, fixo/variável e palavras-chave.']}><Icon name="pencil" size={15} /></button>
        </div>
        {#if expanded.has(root.id)}
          {#each subs as sub (sub.id)}
            <div class="list-row sub">
              <CategoryIcon symbol={sub.symbol} color={sub.color} size={28} />
              <span class="grow small">{sub.name}</span>
              {#if kind === 'expense'}<span class="pill" class:fixed={categoryCost(sub) === 'fixed'}>{costName[categoryCost(sub)]}</span>{/if}
              <span class="muted num small">{counts.get(sub.id) ?? 0}</span>
              <button class="icon-btn" aria-label="Editar {sub.name}" onclick={() => edit(sub)}><Icon name="pencil" size={15} /></button>
            </div>
          {/each}
          <button class="list-row sub accent" onclick={() => edit(null, root)}><Icon name="plus" size={15} />Nova subcategoria em {root.name}</button>
        {/if}
      {/each}
    </div>
  {/each}
  <p class="form-footer">Fixo = se repete todo mês com valor parecido; variável = muda. Subcategoria sem tipo próprio usa o da categoria.</p>
</div>
<CategoryEditor bind:open category={editing} {parent} />

<style>
  .expand { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; background: none; border: 0; padding: 0; }
  .sub { padding-left: 56px; }
  .pill { background: rgba(255, 255, 255, 0.08); color: var(--text-2); }
  .pill.fixed { background: var(--accent-soft); color: var(--accent); }
  .accent { color: var(--accent); }
  .icon-btn { width: 32px; height: 32px; }
</style>
