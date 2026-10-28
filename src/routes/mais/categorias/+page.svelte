<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import { costName, kindName, type CategoryKind } from '$lib/core/catalog';
  import { addMonths, monthOf, today } from '$lib/core/dates';
  import { money } from '$lib/core/money';
  import Icon from '$lib/ui/Icon.svelte';
  import SectionTitle from '$lib/ui/SectionTitle.svelte';
  import Sparkline from '$lib/ui/charts/Sparkline.svelte';
  import { hint } from '$lib/ui/hint';
  import SubHeader from '$lib/screens/more/SubHeader.svelte';
  import CategoryEditor from '$lib/screens/more/CategoryEditor.svelte';
  import { categoryCost, categoryOf, inScope, rootOf } from '$lib/features/model';
  import type { Category } from '$lib/data/types';

  let editing = $state<Category | null>(null);
  let parent = $state<Category | null>(null);
  let open = $state(false);
  const months = Array.from({ length: 6 }, (_, i) => addMonths(monthOf(today()), i - 5));
  // Por categoria principal: quantos lançamentos e o valor de cada um dos últimos 6 meses.
  const stats = $derived.by(() => {
    const map = new Map<string, { count: number; months: number[] }>();
    for (const e of store.entries) {
      if (e.is_mirror || !inScope(e)) continue;
      const root = rootOf(categoryOf(e));
      if (!root) continue;
      const row = map.get(root.id) ?? { count: 0, months: months.map(() => 0) };
      row.count++;
      const at = months.indexOf(monthOf(e.date));
      if (at >= 0) row.months[at] += Math.abs(e.amount_cents);
      map.set(root.id, row);
    }
    return map;
  });
  const children = (root: Category) => store.categories.filter((c) => c.parent_id === root.id).toSorted((a, b) => a.sort_order - b.sort_order);
  const roots = (kind: CategoryKind) => store.categories.filter((c) => !c.parent_id && c.kind === kind).toSorted((a, b) => a.sort_order - b.sort_order);
  function edit(category: Category | null, p: Category | null = null) {
    editing = category;
    parent = p;
    open = true;
  }
</script>

<div class="page">
  <SubHeader title="Categorias"><button class="icon-btn" aria-label="Nova categoria" onclick={() => edit(null)} use:hint={['Nova categoria', 'Categoria principal com ícone, cor e fixo ou variável.']}><Icon name="plus" /></button></SubHeader>
  {#each ['expense', 'income', 'transfer'] as CategoryKind[] as kind}
    <SectionTitle title={kindName[kind]} />
    <div class="tiles">
      {#each roots(kind) as root (root.id)}
        {@const subs = children(root)}
        {@const s = stats.get(root.id)}
        <div class="card tile" style:--c={root.color}>
          <div class="row top">
            <span class="ico"><Icon name={root.symbol} size={20} stroke={2.1} /></span>
            <div class="grow" style="min-width: 0"><b class="ellipsis">{root.name}</b>
              <div class="caption">{s?.count ?? 0} lançamentos{#if kind === 'expense'} · <span class:fixed={categoryCost(root) === 'fixed'}>{costName[categoryCost(root)]}</span>{/if}</div></div>
            <button class="icon-btn sm" aria-label="Editar {root.name}" onclick={() => edit(root)} use:hint={['Editar', 'Nome, ícone, cor, fixo/variável e palavras-chave.']}><Icon name="pencil" size={14} /></button>
          </div>
          {#if s && s.months.some((v) => v > 0)}
            <div class="row trend" use:hint={['Últimos 6 meses', 'Quanto entrou nesta categoria em cada mês.']}>
              <div class="grow"><span class="caption">Este mês</span><div class="num value">{money(s.months[5], { cents: false })}</div></div>
              <Sparkline values={s.months} width={110} height={34} color={root.color} />
            </div>
          {/if}
          <div class="chips">
            {#each subs as sub (sub.id)}<button class="sub" onclick={() => edit(sub)} use:hint={[sub.name, 'Toque para editar esta subcategoria.']}><Icon name={sub.symbol} size={12} />{sub.name}</button>{/each}
            <button class="sub add" onclick={() => edit(null, root)} use:hint={['Nova subcategoria', `Cria uma subcategoria dentro de ${root.name}.`]}><Icon name="plus" size={12} />Sub</button>
          </div>
        </div>
      {/each}
    </div>
  {/each}
  <p class="form-footer">Fixo = se repete todo mês com valor parecido; variável = muda. Subcategoria sem tipo próprio usa o da categoria.</p>
</div>
<CategoryEditor bind:open category={editing} {parent} />

<style>
  .tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
  .tile { display: flex; flex-direction: column; gap: 12px; position: relative; overflow: hidden; }
  .tile::before { content: ''; position: absolute; inset: -60% -30% auto auto; width: 70%; height: 140%; background: radial-gradient(closest-side, color-mix(in srgb, var(--c) 16%, transparent), transparent); pointer-events: none; }
  .top { gap: 12px; position: relative; }
  .ico { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; flex: none; color: #fff; background: linear-gradient(160deg, var(--c), color-mix(in srgb, var(--c) 55%, black)); box-shadow: inset 0 0 0 0.5px rgba(255, 255, 255, 0.25), 0 6px 16px color-mix(in srgb, var(--c) 25%, transparent); }
  .fixed { color: var(--accent); }
  .icon-btn.sm { width: 30px; height: 30px; }
  .trend { gap: 12px; position: relative; }
  .value { font: 600 18px var(--font-display); }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; position: relative; }
  .sub { display: inline-flex; align-items: center; gap: 5px; height: 26px; padding: 0 10px; border-radius: 8px; border: 1px solid var(--stroke); background: rgba(255, 255, 255, 0.04); font-size: 12.5px; color: var(--text-2); }
  .sub :global(svg) { color: var(--c); }
  .sub:hover { color: var(--text); border-color: var(--stroke-strong); }
  .sub.add { color: var(--accent); border-style: dashed; }
  .sub.add :global(svg) { color: var(--accent); }
</style>
