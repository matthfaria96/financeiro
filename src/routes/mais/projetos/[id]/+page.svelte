<script lang="ts">
  import { page } from '$app/state';
  import { organizer } from '$lib/data/organizer.svelte';
  import { money } from '$lib/core/money';
  import type { ProjectItem } from '$lib/data/organizerTypes';
  import Icon from '$lib/ui/Icon.svelte';
  import Segmented from '$lib/ui/Segmented.svelte';
  import SectionTitle from '$lib/ui/SectionTitle.svelte';
  import { hint } from '$lib/ui/hint';
  import SubHeader from '$lib/screens/more/SubHeader.svelte';
  import SharedBadge from '$lib/screens/organizer/SharedBadge.svelte';
  import ProjectEditor from '$lib/screens/projects/ProjectEditor.svelte';
  import ItemEditor from '$lib/screens/projects/ItemEditor.svelte';
  import ItemRow from '$lib/screens/projects/ItemRow.svelte';
  import { byArea, byDoneDate, byPriority, itemsOf, totals } from '$lib/features/projects';
  import Donut from '$lib/ui/Donut.svelte';
  import Ring from '$lib/ui/charts/Ring.svelte';
  import BarChart from '$lib/ui/charts/BarChart.svelte';
  import { palette } from '$lib/ui/look';
  import { addMonths, monthOf, shortMonth, today } from '$lib/core/dates';
  import { percent } from '$lib/core/money';

  type Tab = 'planned' | 'done' | 'areas';
  const project = $derived(organizer.projects.find((p) => p.id === page.params.id));
  let tab = $state<Tab>('planned');
  let editingProject = $state(false);
  let itemOpen = $state(false);
  let item = $state<ProjectItem | null>(null);
  const items = $derived(project ? itemsOf(project) : []);
  const t = $derived(totals(items));
  const planned = $derived(items.filter((i) => !i.done).toSorted(byPriority));
  const done = $derived(items.filter((i) => i.done).toSorted(byDoneDate));
  const areas = $derived(byArea(items));

  // Gasto feito por mês (últimos 12), pela data em que foi feito.
  const months = Array.from({ length: 12 }, (_, i) => addMonths(monthOf(today()), i - 11));
  const monthly = $derived(months.map((m) => done.filter((i) => i.date && monthOf(i.date) === m).reduce((s, i) => s + (i.amount_cents ?? 0), 0)));
  const areaSlices = $derived(areas.filter((a) => a.spent + a.planned > 0).slice(0, 7).map((a, index) => ({ id: a.area, label: a.area, value: a.spent + a.planned, color: palette[index] })));

  function edit(target: ProjectItem | null) {
    item = target;
    itemOpen = true;
  }
</script>

<div class="page">
  {#if project}
    <SubHeader title={project.name} back="#/notas/desejos">
      <button class="icon-btn" aria-label="Editar projeto" onclick={() => (editingProject = true)} use:hint={['Editar projeto', 'Nome, ícone, orçamento e quem vê.']}><Icon name="pencil" /></button>
      <button class="icon-btn" aria-label="Novo item" onclick={() => edit(null)} use:hint={['Novo item', 'Produto ou serviço para planejar ou anotar.']}><Icon name="plus" /></button>
    </SubHeader>
    {#if project.photo}<div class="banner" style:background-image="linear-gradient(180deg, transparent 40%, rgba(6,10,9,0.8)), url({project.photo})"><SharedBadge householdId={project.household_id} /></div>
    {:else}<div class="row sub"><SharedBadge householdId={project.household_id} /></div>{/if}
    <div class="grid-main stretch">
    <section class="card overview">
      <Ring value={t.spent / Math.max(t.spent + t.planned, 1)} size={104} stroke={10} color="#199e70" label={percent(t.spent / Math.max(t.spent + t.planned, 1))} sub="feito" />
      <div class="sums">
      <div use:hint={['Já gasto', 'Soma dos itens feitos.']}><span class="caption">Já gasto</span><b class="value-md">{money(t.spent, { cents: false })}</b></div>
      <div use:hint={['Falta', `Soma estimada do que está planejado.${t.unpriced ? ` ${t.unpriced} sem valor.` : ''}`]}><span class="caption">Falta (estimado)</span><b class="value-md warn">{money(t.planned, { cents: false })}</b></div>
      {#if project.budget_cents}
        {@const left = project.budget_cents - t.spent - t.planned}
        <div use:hint={['Orçamento', 'Orçamento − gasto − planejado.']}><span class="caption">Sobra do orçamento</span><b class="value-md" class:neg={left < 0} class:pos={left >= 0}>{money(left, { cents: false })}</b></div>
      {/if}
      </div>
    </section>
    {#if areaSlices.length}
      <section class="card"><div class="card-head"><h3>Por cômodo</h3><span class="sub">feito + planejado</span></div>
        <div class="row" style="gap: 16px"><Donut size={130} slices={areaSlices} center={money(t.spent + t.planned, { cents: false })} caption="Total" />
          <div class="stack-sm grow">{#each areaSlices as a (a.id)}<div class="row between small"><span class="row ellipsis" style="gap: 7px"><i style:background={a.color}></i>{a.label}</span><span class="num">{money(a.value, { cents: false })}</span></div>{/each}</div></div>
      </section>
    {/if}
    </div>
    {#if monthly.some((v) => v > 0)}
      <section class="card"><div class="card-head"><h3>Gasto por mês</h3><span class="sub">itens feitos, pela data</span></div>
        <BarChart labels={months.map((m) => shortMonth(m).slice(0, 3))} current={11} height={170} title="Gasto do projeto por mês" series={[{ id: 'spent', name: 'Gasto', color: '#199e70', values: monthly }]} /></section>
    {/if}
    <Segmented label="Ver" bind:value={tab} options={[{ value: 'planned', label: `Planejado (${t.pending})` }, { value: 'done', label: `Feito (${t.done})` }, { value: 'areas', label: 'Por cômodo' }]} />
    {#if tab === 'planned'}
      <div class="card flush list">
        {#each planned as i (i.id)}<ItemRow item={i} onedit={() => edit(i)} />{:else}<p class="muted small pad">Nada planejado. Toque em + para anotar o que quer comprar ou contratar.</p>{/each}
      </div>
    {:else if tab === 'done'}
      <div class="card flush list">
        {#each done as i (i.id)}<ItemRow item={i} onedit={() => edit(i)} />{:else}<p class="muted small pad">Nada feito ainda. Marque um item planejado quando comprar.</p>{/each}
      </div>
    {:else}
      <div class="card flush list">
        {#each areas as a (a.area)}
          <div class="list-row"><span class="grow"><span>{a.area}</span><span class="caption"> · {a.count} {a.count === 1 ? 'item' : 'itens'}</span></span>
            <span class="num">{money(a.spent, { cents: false })}</span>{#if a.planned}<span class="caption num warn">+{money(a.planned, { cents: false })}</span>{/if}</div>
        {:else}<p class="muted small pad">Sem itens.</p>{/each}
      </div>
      <p class="form-footer">Valor gasto e, em laranja, o que ainda está planejado em cada cômodo.</p>
    {/if}
    <button class="btn lg block dashed" onclick={() => edit(null)}><Icon name="plus" size={18} />Adicionar item</button>
    <ProjectEditor bind:open={editingProject} {project} />
    <ItemEditor bind:open={itemOpen} {project} {item} />
  {:else}
    <SubHeader title="Projeto" back="#/notas/desejos" />
    <p class="muted">{organizer.loadedFor ? 'Projeto não encontrado.' : 'Carregando…'}</p>
  {/if}
</div>

<style>
  .sub:empty { display: none; }
  .sub { margin: -6px 4px 0; }
  .overview { display: flex; gap: 20px; align-items: center; }
  .sums { flex: 1; display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
  .banner { height: 200px; border-radius: var(--radius); background-size: cover; background-position: center; border: 1px solid var(--stroke); display: flex; align-items: flex-end; justify-content: flex-end; padding: 14px; }
  i { width: 9px; height: 9px; border-radius: 3px; flex: none; display: inline-block; }
  .sums > div { display: flex; flex-direction: column; gap: 3px; }
  .pad { padding: 16px; margin: 0; }
  .dashed { border-style: dashed; color: var(--accent); background: var(--accent-soft); }
</style>
