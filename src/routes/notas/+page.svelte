<script lang="ts">
  import { goto } from '$app/navigation';
  import { organizer } from '$lib/data/organizer.svelte';
  import { money } from '$lib/core/money';
  import { itemEmoji } from '$lib/core/shopping';
  import { monthOf, today } from '$lib/core/dates';
  import Icon from '$lib/ui/Icon.svelte';
  import { hint } from '$lib/ui/hint';
  import SharedBadge from '$lib/screens/organizer/SharedBadge.svelte';
  import NotebookEditor from '$lib/screens/notes/NotebookEditor.svelte';
  import { rememberSystemNotebooks, visibleNoteCards } from '$lib/features/notes';
  import ConfigureLink from '$lib/ui/ConfigureLink.svelte';
  import NoteIcon from '$lib/ui/NoteIcon.svelte';
  import Fab from '$lib/ui/Fab.svelte';
  import { currentList, ensureNotebooks, itemsOf, notebooks } from '$lib/features/shopping';
  import { dueText, logsOf, planOf } from '$lib/features/car';

  /** Notas: cada coisa da casa vira um cartão (listas, desejos, transporte). Toque para abrir. */
  let creating = $state(false);
  $effect(() => {
    if (organizer.ready && !organizer.notebooks.length) void ensureNotebooks();
    else if (organizer.ready) rememberSystemNotebooks();
  });
  // Transporte em azul-violeta: não repete o laranja do Petshop.
  const CAR_COLOR = '#7B83FF';
  const cards = $derived(visibleNoteCards());
  const bookById = $derived(new Map(notebooks().map((n) => [n.id, n])));
  const wishes = $derived(organizer.project_items.filter((i) => !i.done).toSorted((a, b) => a.priority - b.priority));
  const wishTotal = $derived(wishes.reduce((s, i) => s + (i.amount_cents ?? 0), 0));
  const vehicles = $derived(organizer.vehicles.filter((v) => !v.archived));
  const month = monthOf(today());
  const carMonth = $derived(vehicles.reduce((s, v) => s + logsOf(v).filter((l) => monthOf(l.date) === month).reduce((x, l) => x + l.amount_cents, 0), 0));
  const alert = $derived(vehicles.map((v) => planOf(v)[0]).find((p) => p && (p.due.state === 'overdue' || p.due.state === 'soon')));
</script>

<div class="page">
  <header class="row between top">
    <h1>Lista de notas</h1>
  </header>

  <div class="grid">
    {#each cards as card (card.key)}
    {#if card.notebookId && bookById.get(card.notebookId)}
      {@const book = bookById.get(card.notebookId)!}
      {@const list = currentList(book)}
      {@const items = list ? itemsOf(list) : []}
      {@const left = items.filter((i) => !i.checked)}
      <a class="card note" href="#/notas/lista/{book.id}" style:--c={book.color}>
        <div class="row top-row"><NoteIcon emoji={book.emoji} color={book.color} /><span class="grow"><b>{book.name}</b><span class="caption block">{left.length ? `Faltam ${left.length} ${left.length === 1 ? 'item' : 'itens'}` : items.length ? 'Tudo pego' : 'Lista vazia'}</span></span><SharedBadge householdId={book.household_id} /><Icon name="chevron-right" size={16} class="faint" /></div>
        <div class="strip">{#each left.slice(0, 7) as item (item.id)}<span>{itemEmoji(item.name)}</span>{/each}{#if left.length > 7}<span class="more">+{left.length - 7}</span>{/if}</div>
      </a>
    {:else if card.key === 'desejos'}
    <a class="card note" href="#/notas/desejos" style:--c="#38D9F5">
      <div class="row top-row"><NoteIcon emoji="⭐" color="#38D9F5" /><span class="grow"><b>Lista de desejos</b><span class="caption block">{wishes.length ? `${wishes.length} ${wishes.length === 1 ? 'desejo' : 'desejos'} · ${money(wishTotal, { cents: false })}` : 'O que quer comprar ou fazer'}</span></span><Icon name="chevron-right" size={16} class="faint" /></div>
      <div class="wish ellipsis">{wishes.slice(0, 6).map((w) => w.description).join(' · ')}</div>
    </a>
    {:else if card.key === 'transporte'}
    <a class="card note" href="#/notas/transporte" style:--c={CAR_COLOR}>
      <div class="row top-row">{#if vehicles[0]?.photo}<span class="car-photo" style:background-image="url({vehicles[0].photo})" aria-hidden="true"></span>{:else}<NoteIcon emoji="🚗" color={CAR_COLOR} />{/if}<span class="grow"><b>Transporte</b><span class="caption block">{vehicles.length ? `${vehicles.length === 1 ? vehicles[0].name : `${vehicles.length} veículos`} · ${money(carMonth, { cents: false })} este mês` : 'Combustível, gastos e revisões'}</span></span><Icon name="chevron-right" size={16} class="faint" /></div>
      {#if alert}<div class="alert"><Icon name="wrench.and.screwdriver" size={14} /><span class="ellipsis">{alert.item.name} · {dueText(alert.due)}</span></div>{/if}
    </a>
    {/if}
    {/each}
  </div>
  <ConfigureLink href="#/notas/configurar" />
</div>
<Fab label="Nova nota" detail="Uma nota nova: lista de limpeza, bebê, festa…" onclick={() => (creating = true)} />
<NotebookEditor bind:open={creating} onsaved={(n) => goto(`#/notas/lista/${n.id}`)} />

<style>
  .top h1 { margin: 6px 4px; font: 700 30px var(--font-display); letter-spacing: -0.02em; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
  /* Todos os cartões do mesmo tamanho, no celular e no computador: o que não cabe vira "…" ou "+N". */
  .note { display: flex; flex-direction: column; gap: 14px; color: inherit; position: relative; overflow: hidden; height: 132px; min-width: 0; }
  .top-row > .grow { min-width: 0; }
  .top-row b, .top-row .caption { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .car-photo { flex: none; width: 48px; height: 48px; border-radius: 14px; background: center / cover no-repeat #222; box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08), 0 4px 14px color-mix(in srgb, var(--c) 30%, transparent); }
  .note::before { content: ''; position: absolute; inset: -50% -20% auto auto; width: 60%; height: 140%; background: radial-gradient(closest-side, color-mix(in srgb, var(--c) 18%, transparent), transparent); pointer-events: none; }
  .note:hover { transform: translateY(-2px); }
  .top-row { gap: 12px; position: relative; }
  .note b { font-size: 17px; }
  .block { display: block; margin-top: 2px; }
  .strip { display: flex; flex-wrap: nowrap; gap: 4px; position: relative; overflow: hidden; }
  .strip span { flex: none; }
  .strip span { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; font-size: 16px; background: rgba(255, 255, 255, 0.05); }
  .strip .more { width: auto; padding: 0 8px; font-size: 12px; color: var(--text-2); }
  .wish { display: block; font-size: 13.5px; color: var(--text-2); position: relative; }
  .alert { display: flex; align-items: center; gap: 8px; min-width: 0; font-size: 13px; color: var(--warning); position: relative; }
  .alert :global(svg) { flex: none; }
</style>
