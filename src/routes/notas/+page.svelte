<script lang="ts">
  import { organizer } from '$lib/data/organizer.svelte';
  import { money } from '$lib/core/money';
  import { itemEmoji } from '$lib/core/shopping';
  import { monthOf, today } from '$lib/core/dates';
  import Icon from '$lib/ui/Icon.svelte';
  import { hint } from '$lib/ui/hint';
  import SharedBadge from '$lib/screens/organizer/SharedBadge.svelte';
  import NotebookEditor from '$lib/screens/notes/NotebookEditor.svelte';
  import { currentList, ensureNotebooks, itemsOf, notebooks } from '$lib/features/shopping';
  import { dueText, logsOf, planOf } from '$lib/features/car';

  /** Notas: cada coisa da casa vira um cartão (listas, desejos, transporte). Toque para abrir. */
  let creating = $state(false);
  $effect(() => {
    if (organizer.loadedFor && !organizer.notebooks.length) void ensureNotebooks();
  });
  const books = $derived(notebooks());
  const wishes = $derived(organizer.project_items.filter((i) => !i.done).toSorted((a, b) => a.priority - b.priority));
  const wishTotal = $derived(wishes.reduce((s, i) => s + (i.amount_cents ?? 0), 0));
  const vehicles = $derived(organizer.vehicles.filter((v) => !v.archived));
  const month = monthOf(today());
  const carMonth = $derived(vehicles.reduce((s, v) => s + logsOf(v).filter((l) => monthOf(l.date) === month).reduce((x, l) => x + l.amount_cents, 0), 0));
  const alert = $derived(vehicles.map((v) => planOf(v)[0]).find((p) => p && (p.due.state === 'overdue' || p.due.state === 'soon')));
</script>

<div class="page">
  <header class="row between top">
    <h1>Notas</h1>
    <button class="btn primary" onclick={() => (creating = true)} use:hint={['Cadastrar novo', 'Uma lista nova: limpeza, bebê, festa…']}><Icon name="plus" size={16} />Cadastrar novo</button>
  </header>

  <div class="grid">
    {#each books as book (book.id)}
      {@const list = currentList(book)}
      {@const items = list ? itemsOf(list) : []}
      {@const left = items.filter((i) => !i.checked)}
      <a class="card note" href="#/notas/lista/{book.id}" style:--c={book.color}>
        <div class="row top-row"><span class="emoji">{book.emoji}</span><span class="grow"><b>{book.name}</b><span class="caption block">{left.length ? `Faltam ${left.length} ${left.length === 1 ? 'item' : 'itens'}` : items.length ? 'Tudo pego' : 'Lista vazia'}</span></span><SharedBadge householdId={book.household_id} /><Icon name="chevron-right" size={16} class="faint" /></div>
        <div class="strip">{#each left.slice(0, 9) as item (item.id)}<span>{itemEmoji(item.name)}</span>{/each}{#if left.length > 9}<span class="more">+{left.length - 9}</span>{/if}</div>
      </a>
    {/each}

    <a class="card note" href="#/notas/desejos" style:--c="#38D9F5">
      <div class="row top-row"><span class="emoji">⭐</span><span class="grow"><b>Lista de desejos</b><span class="caption block">{wishes.length ? `${wishes.length} ${wishes.length === 1 ? 'desejo' : 'desejos'} · ${money(wishTotal, { cents: false })}` : 'O que quer comprar ou fazer'}</span></span><Icon name="chevron-right" size={16} class="faint" /></div>
      <div class="wish">{#each wishes.slice(0, 3) as w (w.id)}<span class="ellipsis">{w.description}</span>{/each}</div>
    </a>

    <a class="card note" href="#/notas/transporte" style:--c="#FF9F1C">
      <div class="row top-row"><span class="emoji">🚗</span><span class="grow"><b>Transporte</b><span class="caption block">{vehicles.length ? `${vehicles.length === 1 ? vehicles[0].name : `${vehicles.length} veículos`} · ${money(carMonth, { cents: false })} este mês` : 'Combustível, gastos e revisões'}</span></span><Icon name="chevron-right" size={16} class="faint" /></div>
      {#if alert}<div class="alert"><Icon name="wrench.and.screwdriver" size={14} />{alert.item.name} · {dueText(alert.due)}</div>{/if}
    </a>
  </div>
</div>
<NotebookEditor bind:open={creating} onsaved={(n) => (location.hash = `#/notas/lista/${n.id}`)} />

<style>
  .top h1 { margin: 6px 4px; font: 700 30px var(--font-display); letter-spacing: -0.02em; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
  .note { display: flex; flex-direction: column; gap: 14px; color: inherit; position: relative; overflow: hidden; min-height: 132px; }
  .note::before { content: ''; position: absolute; inset: -50% -20% auto auto; width: 60%; height: 140%; background: radial-gradient(closest-side, color-mix(in srgb, var(--c) 18%, transparent), transparent); pointer-events: none; }
  .note:hover { transform: translateY(-2px); }
  .top-row { gap: 12px; position: relative; }
  .emoji { width: 48px; height: 48px; border-radius: 14px; display: grid; place-items: center; font-size: 26px; flex: none; background: radial-gradient(circle at 30% 25%, color-mix(in srgb, var(--c) 40%, transparent), color-mix(in srgb, var(--c) 10%, transparent)); }
  .note b { font-size: 17px; }
  .block { display: block; margin-top: 2px; }
  .strip { display: flex; flex-wrap: wrap; gap: 4px; position: relative; }
  .strip span { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; font-size: 16px; background: rgba(255, 255, 255, 0.05); }
  .strip .more { width: auto; padding: 0 8px; font-size: 12px; color: var(--text-2); }
  .wish { display: flex; flex-direction: column; gap: 4px; font-size: 13.5px; color: var(--text-2); position: relative; }
  .alert { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--warning); position: relative; }
</style>
