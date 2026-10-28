<script lang="ts">
  import type { Month } from '$lib/core/dates';
  import { money, percent } from '$lib/core/money';
  import { store } from '$lib/data/store.svelte';
  import type { Entry } from '$lib/data/types';
  import Icon from '$lib/ui/Icon.svelte';
  import Segmented from '$lib/ui/Segmented.svelte';
  import Donut from '$lib/ui/Donut.svelte';
  import ChangeBadge from '$lib/ui/ChangeBadge.svelte';
  import CategoryIcon from '$lib/ui/CategoryIcon.svelte';
  import { hint } from '$lib/ui/hint';
  import { groupedReport, groupingName, subReport, type Grouping } from '$lib/features/reportModel';
  import { filter } from '../transactions/filter.svelte';
  import { goto } from '$app/navigation';

  let { month, entries }: { month: Month; entries: Entry[] } = $props();
  let grouping = $state<Grouping>('category');
  let flow = $state<'expenses' | 'income'>('expenses');
  let open = $state<string | null>(null);
  const groupings = $derived((Object.keys(groupingName) as Grouping[]).filter((g) => g !== 'workspace' || (store.workspacesEnabled && !store.scopeId)));
  const model = $derived(groupedReport(entries, month, grouping, flow));

  function openEntries(id: string) {
    const category = grouping === 'category' ? store.categoryByKey.get(id) : undefined;
    filter.set({ month, ...(grouping === 'category' ? { categoryId: category?.id ?? null } : grouping === 'person' ? { personId: id } : grouping === 'account' ? { accountId: id } : {}) });
    goto('#/transacoes');
  }
</script>

<div class="row between" style="flex-wrap: wrap; gap: 8px">
  <label class="chip" style="position: relative">{groupingName[grouping]}<Icon name="chevron-down" size={13} />
    <select style="position: absolute; inset: 0; opacity: 0" bind:value={grouping}>{#each groupings as g}<option value={g}>{groupingName[g]}</option>{/each}</select></label>
  <div style="width: 220px"><Segmented label="Tipo" bind:value={flow} options={[{ value: 'expenses', label: 'Despesas' }, { value: 'income', label: 'Receitas' }]} /></div>
</div>

<div class="layout">
<section class="card stack chart">
  <div class="row" style="align-items: baseline; gap: 10px"><span class="value-xl">{money(model.report.totalCents, { cents: false })}</span><ChangeBadge change={model.report.change} higherIsBetter={flow === 'income'} /></div>
  {#if model.report.slices.length}
    <div class="center"><Donut size={280} center={money(model.report.totalCents, { cents: false })} caption={flow === 'expenses' ? 'Despesas' : 'Receitas'} slices={model.report.slices.map((s) => ({ id: s.groupId, value: s.totalCents, color: model.info.get(s.groupId)?.color ?? '#78909C', label: model.info.get(s.groupId)?.name }))} /></div>
  {:else}
    <p class="muted">{flow === 'expenses' ? 'Sem despesas neste mês.' : 'Sem receitas neste mês.'} Importe o extrato do mês ou escolha outro mês.</p>
  {/if}
</section>
<div class="slices">
{#each model.report.slices as slice (slice.groupId)}
  {@const info = model.info.get(slice.groupId)}
  <button class="slice" style:--c={info?.color} style:--w="{slice.share * 100}%" onclick={() => (grouping === 'category' ? (open = open === slice.groupId ? null : slice.groupId) : openEntries(slice.groupId))}
    use:hint={[info?.name ?? '', grouping === 'category' ? 'Toque para ver as subcategorias.' : 'Abre os lançamentos que formam este valor.']}>
    <CategoryIcon symbol={info?.symbol ?? 'tag'} color={info?.color ?? '#78909C'} size={40} />
    <span class="grow stack-sm" style="gap: 1px; text-align: left"><span>{info?.name}</span><span class="caption">{percent(slice.share)}</span></span>
    <span class="stack-sm" style="gap: 1px; align-items: flex-end"><span class="num">{money(slice.totalCents, { cents: false })}</span><ChangeBadge change={slice.change} higherIsBetter={flow === 'income'} /></span>
    <Icon name={grouping === 'category' ? (open === slice.groupId ? 'chevron-up' : 'chevron-down') : 'chevron-right'} size={15} class="faint" />
  </button>
  {#if open === slice.groupId}
    {@const sub = subReport(entries, slice.groupId, month, flow)}
    <div class="card sub stack-sm">
      {#each sub.report.slices as s (s.groupId)}
        {@const i = sub.info.get(s.groupId)}
        <div class="row small"><span style:color={i?.color}><Icon name={i?.symbol ?? 'tag'} size={16} /></span><span class="grow">{i?.name}</span><span class="caption">{percent(s.share)}</span><span class="num">{money(s.totalCents, { cents: false })}</span><ChangeBadge change={s.change} higherIsBetter={flow === 'income'} /></div>
      {/each}
      <button class="btn ghost" style="align-self: flex-start" onclick={() => openEntries(slice.groupId)}>Ver lançamentos</button>
    </div>
  {/if}
{/each}
</div>
</div>

<style>
  .layout { display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr); align-items: start; }
  .slices { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
  @media (min-width: 1100px) { .layout { grid-template-columns: 380px minmax(0, 1fr); } .chart { position: sticky; top: 22px; } }
  .center { display: grid; place-items: center; }
  .slice { position: relative; display: flex; align-items: center; gap: 14px; padding: 14px 16px; border-radius: 18px; border: 1px solid var(--stroke); background: var(--card); box-shadow: var(--highlight); overflow: hidden; text-align: left; transition: border-color 0.2s; }
  .slice:hover { border-color: var(--stroke-strong); }
  .slice::before { content: ''; position: absolute; inset: 0 auto 0 0; width: var(--w); background: color-mix(in srgb, var(--c) 18%, transparent); }
  .slice > :global(*) { position: relative; }
  .sub { margin-left: 24px; background: rgba(255, 255, 255, 0.04); }
</style>
