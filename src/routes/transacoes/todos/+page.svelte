<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { store } from '$lib/data/store.svelte';
  import { ui } from '$lib/ui/ui.svelte';
  import { money } from '$lib/core/money';
  import { dayHeader, shortMonth } from '$lib/core/dates';
  import Icon from '$lib/ui/Icon.svelte';
  import { hint } from '$lib/ui/hint';
  import EntryRow from '$lib/screens/EntryRow.svelte';
  import MoveSheet from '$lib/screens/transactions/MoveSheet.svelte';
  import TxInsights from '$lib/screens/transactions/TxInsights.svelte';
  import { prefs } from '$lib/ui/prefs.svelte';
  import { filter, periodName, typeName, type EntryType, type Period } from '$lib/screens/transactions/filter.svelte';
  import Select from '$lib/ui/Select.svelte';
  import { today } from '$lib/core/dates';
  import { inScopeAccount, kindOf } from '$lib/features/model';
  import { reconcileMirrors } from '$lib/features/mirrors';

  onMount(() => {
    if (page.url.searchParams.get('semcategoria')) filter.set({ period: 'all', uncategorized: true });
  });

  const list = $derived(store.entries.filter((e) => filter.matches(e)).toSorted((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at)));
  // Mostra 15 por vez (lista leve); "Carregar mais" traz os próximos 15.
  let limit = $state(15);
  const shownList = $derived(list.slice(0, limit));
  const days = $derived.by(() => {
    const map = new Map<string, typeof list>();
    for (const entry of shownList) map.set(entry.date, [...(map.get(entry.date) ?? []), entry]);
    return [...map.entries()];
  });
  const totals = $derived.by(() => {
    const counted = list.filter((e) => kindOf(e) !== 'transfer');
    const income = counted.filter((e) => e.amount_cents > 0).reduce((s, e) => s + e.amount_cents, 0);
    const out = counted.filter((e) => e.amount_cents < 0).reduce((s, e) => s + e.amount_cents, 0);
    return { income, out, net: income + out };
  });

  let selecting = $state(false);
  let selected = $state<Set<string>>(new Set());
  let moving = $state(false);
  let confirmDelete = $state(false);
  let menu = $state(false);
  let moreFilters = $state(false);

  $effect(() => {
    // Trocou filtro ou área: limpa a seleção (para nunca mexer no que não está à vista).
    void [filter.period, filter.month, filter.categoryId, filter.accountId, filter.personId, filter.cost, filter.uncategorized, filter.type, filter.from, filter.to, filter.search, store.scopeId];
    selected = new Set();
    limit = 15;
  });

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selected = next;
  }

  async function removeSelected() {
    await store.remove('entries', [...selected]);
    await reconcileMirrors();
    store.toast(`${selected.size} lançamentos apagados.`);
    selected = new Set();
    selecting = false;
    confirmDelete = false;
  }

  const accounts = $derived(store.accounts.filter(inScopeAccount));
  const roots = $derived(store.categories.filter((c) => !c.parent_id).toSorted((a, b) => a.sort_order - b.sort_order));
</script>

<div class="page" class:narrow={!prefs.full}>
  <header class="row between top">
    <span class="row" style="gap: 10px"><a class="icon-btn" href="#/transacoes" aria-label="Voltar"><Icon name="chevron-left" /></a><h1>Todos<span class="hide-m"> os lançamentos</span></h1></span>
    <div class="row" style="gap: 8px">
      {#if selecting}
        <button class="btn" onclick={() => { selecting = false; selected = new Set(); }}>Concluir</button>
      {:else}
        <div class="menu-wrap">
          <button class="icon-btn" aria-label="Mais ações" onclick={() => (menu = !menu)} use:hint={['Mais ações', 'Novo lançamento, selecionar vários para mover ou apagar, importar.']}><Icon name="more" /></button>
          {#if menu}
            <div class="menu card" role="menu">
              <button role="menuitem" onclick={() => { menu = false; ui.newEntryOpen = true; }}><Icon name="plus" size={16} />Novo lançamento</button>
              <button role="menuitem" onclick={() => { menu = false; selecting = true; }}><Icon name="check-circle" size={16} />Selecionar vários</button>
              <button role="menuitem" onclick={() => { menu = false; ui.startImport(); }}><Icon name="import" size={16} />Importar extrato</button>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </header>
  <label class="search"><Icon name="search" size={17} class="faint" /><input placeholder="Pesquisar" bind:value={filter.search} /></label>

  <div class="filters">
    <Select variant="chip" active={filter.period !== 'thisMonth' || !!filter.month} label="Período" display={filter.month ? shortMonth(filter.month) : periodName[filter.period]}
      value={filter.month ? 'month' : filter.period} options={Object.entries(periodName).map(([value, label]) => ({ value, label }))}
      onchange={(v) => { filter.period = v as Period; filter.month = null; if (v === 'range' && !filter.from) { filter.from = `${today().slice(0, 8)}01`; filter.to = today(); } }} />
    <Select variant="chip" active={!!filter.type} label="Tipo" display={filter.type ? typeName[filter.type] : 'Tipo'} value={filter.type ?? ''}
      options={[{ value: '', label: 'Todos os tipos' }, ...Object.entries(typeName).map(([value, label]) => ({ value, label }))]} onchange={(v) => (filter.type = (v || null) as EntryType | null)} />
    <Select variant="chip" active={!!filter.categoryId} label="Categoria" display={store.categoryById.get(filter.categoryId ?? '')?.name ?? 'Categoria'} value={filter.categoryId ?? ''}
      options={[{ value: '', label: 'Todas' }, ...roots.flatMap((root) => [{ value: root.id, label: `${root.name} (tudo)`, group: root.name, color: root.color }, ...store.categories.filter((c) => c.parent_id === root.id).map((sub) => ({ value: sub.id, label: sub.name, group: root.name, color: sub.color }))])]}
      onchange={(v) => (filter.categoryId = v || null)} />
    <Select variant="chip" active={!!filter.accountId} label="Conta" display={store.accountById.get(filter.accountId ?? '')?.name ?? 'Conta'} value={filter.accountId ?? ''}
      options={[{ value: '', label: 'Todas' }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]} onchange={(v) => (filter.accountId = v || null)} />
    {#if prefs.full || moreFilters || filter.personId || filter.cost || filter.uncategorized}
      <Select variant="chip" active={!!filter.personId} label="De quem" display={store.personById.get(filter.personId ?? '')?.name ?? 'De quem'} value={filter.personId ?? ''}
        options={[{ value: '', label: 'Todos' }, ...store.people.map((p) => ({ value: p.id, label: p.name, color: p.color }))]} onchange={(v) => (filter.personId = v || null)} />
      <Select variant="chip" active={!!filter.cost} label="Fixo ou sazonal" display={filter.cost === 'fixed' ? 'Fixos' : filter.cost === 'variable' ? 'Sazonais' : 'Fixo/sazonal'} value={filter.cost ?? ''}
        options={[{ value: '', label: 'Todos' }, { value: 'fixed', label: 'Só fixos' }, { value: 'variable', label: 'Só sazonais' }]} onchange={(v) => (filter.cost = (v || null) as typeof filter.cost)} />
      <button class="chip" class:active={filter.uncategorized} onclick={() => (filter.uncategorized = !filter.uncategorized)} use:hint={['Sem categoria', 'Só o que o app não soube classificar.']}>Sem categoria</button>
    {:else}
      <button class="chip" onclick={() => (moreFilters = true)} use:hint={['Mais filtros', 'De quem é, fixo ou sazonal e sem categoria.']}><Icon name="filter" size={13} />Mais filtros</button>
    {/if}
    {#if filter.active}<button class="btn ghost" onclick={() => filter.reset()}>Limpar</button>{/if}
  </div>
  {#if filter.period === 'range' && !filter.month}
    <div class="range card tight">
      <label><span class="caption">De</span><input class="input" type="date" bind:value={filter.from} max={filter.to || undefined} /></label>
      <label><span class="caption">Até</span><input class="input" type="date" bind:value={filter.to} min={filter.from || undefined} /></label>
    </div>
  {/if}

  <div class="layout" class:wide={prefs.full}>
  <div class="list">
  {#if list.length}
    <div class="card tight row between totals" class:mobile-only={prefs.full} use:hint={['Resumo', 'Somas do que está filtrado. Transferências entre suas contas e pagamento de fatura ficam de fora.']}>
      <div><span class="caption">Entradas</span><b class="num pos">{money(totals.income)}</b></div>
      <div><span class="caption">Saídas</span><b class="num">{money(totals.out)}</b></div>
      <div style="text-align: right"><span class="caption">Resultado</span><b class="num" class:pos={totals.net >= 0} class:neg={totals.net < 0}>{money(totals.net)}</b></div>
    </div>
  {/if}

  {#each days as [day, entries] (day)}
    {@const spent = entries.filter((e) => !e.is_mirror && kindOf(e) === 'expense').reduce((sum, e) => sum - e.amount_cents, 0)}
    <div class="day row between"><span>{dayHeader(day)}</span>{#if spent > 0}<span class="num caption">{money(spent)}</span>{/if}</div>
    <div class="card flush entries">
      {#each entries as entry (entry.id)}
        <EntryRow {entry} selected={selecting ? selected.has(entry.id) : null} onclick={() => (selecting ? !entry.is_mirror && toggle(entry.id) : ui.editEntry(entry.id))} />
      {/each}
    </div>
  {:else}
    <div class="empty stack-sm"><Icon name="search" size={34} class="faint" /><b>Nenhum lançamento</b><span class="muted small">{store.entries.length ? 'Mude o período ou limpe os filtros.' : 'Importe um extrato para começar.'}</span></div>
  {/each}
  {#if list.length > limit}<button class="btn block more" onclick={() => (limit += 15)}>Carregar mais ({list.length - limit} restantes)</button>{/if}
  </div>
  {#if list.length && prefs.full}<div class="side"><TxInsights entries={list} /></div>{/if}
  </div>
</div>

{#if selecting && selected.size}
  <div class="selbar">
    <b>{selected.size} selecionados</b>
    <button class="btn ghost" onclick={() => (selected = new Set(list.filter((e) => !e.is_mirror).map((e) => e.id)))}>Todos</button>
    <span class="grow"></span>
    {#if confirmDelete}
      <button class="btn danger" onclick={removeSelected}>Apagar {selected.size}?</button>
    {:else}
      <button class="btn" onclick={() => (confirmDelete = true)}><Icon name="trash" size={16} />Apagar</button>
    {/if}
    <button class="btn primary" onclick={() => (moving = true)}><Icon name="move" size={16} />Mover…</button>
  </div>
{/if}

<MoveSheet bind:open={moving} ids={[...selected]} ondone={() => { selected = new Set(); selecting = false; }} />

<style>
  .top h1 { margin: 6px 4px; font: 700 30px var(--font-display); letter-spacing: -0.02em; }
  .search { display: flex; align-items: center; gap: 8px; height: 44px; padding: 0 14px; border-radius: 14px; background: rgba(255, 255, 255, 0.07); border: 1px solid var(--stroke); }
  .search input { flex: 1; background: none; border: 0; outline: none; color: var(--text); }
  .filters { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .range { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .range label { display: flex; flex-direction: column; gap: 4px; }
  .more { margin-top: 6px; }
  .layout { display: grid; grid-template-columns: minmax(0, 1fr); gap: 18px; align-items: start; }
  .list { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
  .side { display: none; }
  @media (min-width: 1100px) {
    .layout.wide { grid-template-columns: minmax(0, 1fr) 360px; }
    .side { display: block; position: sticky; top: 22px; }
    .mobile-only { display: none; }
  }
  .totals > div { display: flex; flex-direction: column; gap: 2px; }
  .totals b { font-size: 15.5px; }
  .day { font-weight: 600; font-size: 14px; color: var(--text-2); margin: 10px 6px -4px; }
  .empty { align-items: center; text-align: center; padding: 60px 0; }
  .menu-wrap { position: relative; }
  .menu { position: absolute; right: 0; top: 46px; z-index: 30; padding: 6px; min-width: 220px; display: flex; flex-direction: column; background: rgba(24, 32, 29, 0.94); backdrop-filter: blur(24px); box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5); }
  .menu button { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; border: 0; background: none; text-align: left; }
  .menu button:hover { background: rgba(255, 255, 255, 0.07); }
  .selbar { position: fixed; z-index: 60; left: 12px; right: 12px; bottom: calc(84px + env(safe-area-inset-bottom)); display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 20px; background: rgba(28, 36, 33, 0.9); backdrop-filter: blur(20px); border: 1px solid var(--stroke-strong); box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); }
  @media (min-width: 960px) { .selbar { left: calc(var(--sidebar) + 24px); right: 24px; bottom: 24px; } }
</style>
