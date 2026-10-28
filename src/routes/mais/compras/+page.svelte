<script lang="ts">
  import { organizer } from '$lib/data/organizer.svelte';
  import { money } from '$lib/core/money';
  import { dayMonth } from '$lib/core/dates';
  import Icon from '$lib/ui/Icon.svelte';
  import { hint } from '$lib/ui/hint';
  import SubHeader from '$lib/screens/more/SubHeader.svelte';
  import SharedBadge from '$lib/screens/organizer/SharedBadge.svelte';
  import { createList, duplicateList, itemsOf, lists } from '$lib/features/shopping';
  import BarChart from '$lib/ui/charts/BarChart.svelte';
  import { itemEmoji } from '$lib/core/shopping';

  const all = $derived(lists());
  const latest = $derived(all[0]);
  const day = (iso: string) => dayMonth(iso.slice(0, 10));

  const paid = $derived(all.filter((l) => l.done_at && l.total_cents).toReversed().slice(-12));
  const average = $derived(paid.length ? Math.round(paid.reduce((s, l) => s + l.total_cents!, 0) / paid.length) : 0);

  async function fresh() {
    const list = await createList(undefined, organizer.shared[0]?.id);
    location.hash = `#/mais/compras/${list.id}`;
  }

  async function again() {
    if (!latest) return fresh();
    const list = await duplicateList(latest);
    location.hash = `#/mais/compras/${list.id}`;
  }
</script>

<div class="page">
  <SubHeader title="Lista de compras">
    <button class="icon-btn" aria-label="Lista vazia" onclick={fresh} use:hint={['Lista vazia', 'Começa uma lista nova sem itens.']}><Icon name="plus" /></button>
  </SubHeader>
  {#if latest}
    <button class="btn primary lg block" onclick={again} use:hint={['Nova a partir da última', 'Copia os itens da lista mais recente, todos desmarcados.']}><Icon name="copy-plus" size={18} />Nova lista a partir da última</button>
  {/if}
  {#if paid.length >= 2}
    <section class="card">
      <div class="card-head"><h3>Quanto deu cada compra</h3><span class="sub">média {money(average, { cents: false })}</span></div>
      <BarChart labels={paid.map((l) => day(l.done_at!))} height={160} current={paid.length - 1} title="Total de cada compra" series={[{ id: 'total', name: 'Total', color: '#199e70', values: paid.map((l) => l.total_cents!) }]} />
    </section>
  {/if}
  {#each all as list (list.id)}
    {@const items = itemsOf(list)}
    {@const got = items.filter((i) => i.checked).length}
    <a class="card stack-sm list-card" class:done={list.done_at} href="#/mais/compras/{list.id}">
      <div class="row">
        <span class="tile" class:done={list.done_at}><Icon name={list.done_at ? 'check' : 'basket'} size={20} color="#fff" /></span>
        <div class="grow" style="min-width: 0">
          <div class="row" style="gap: 8px"><b class="ellipsis">{list.name}</b><SharedBadge householdId={list.household_id} /></div>
          <div class="caption">{list.done_at ? `Finalizada em ${day(list.done_at)}` : `Criada em ${day(list.created_at)}`} · {items.length} {items.length === 1 ? 'item' : 'itens'}</div>
        </div>
        {#if list.total_cents}<span class="num">{money(list.total_cents)}</span>{/if}
        <Icon name="chevron-right" size={15} class="faint" />
      </div>
      {#if items.length}<div class="emojis" aria-hidden="true">{#each items.slice(0, 12) as item (item.id)}<span class:got={item.checked && !list.done_at}>{itemEmoji(item.name)}</span>{/each}{#if items.length > 12}<span class="more">+{items.length - 12}</span>{/if}</div>{/if}
      {#if !list.done_at && items.length}<div class="bar"><span style:width="{(got / items.length) * 100}%"></span></div>{/if}
    </a>
  {:else}
    <div class="card stack empty">
      <Icon name="basket" size={34} class="faint" />
      <b>Sua lista do mercado</b>
      <p class="muted small">Anote o que falta, marque no mercado e, quando terminar, duplique para a próxima compra. Compartilhada, os dois veem e marcam ao mesmo tempo.</p>
      <button class="btn primary" onclick={fresh}><Icon name="plus" size={16} />Criar lista</button>
    </div>
  {/each}
</div>

<style>
  .list-card { color: inherit; }
  .list-card.done { opacity: 0.72; }
  .tile { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; flex: none; background: linear-gradient(160deg, #2bd4a4, #11876a); }
  .tile.done { background: linear-gradient(160deg, #5a6b75, #34424b); }
  .emojis { display: flex; flex-wrap: wrap; gap: 4px; }
  .emojis span { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; font-size: 16px; background: rgba(255, 255, 255, 0.05); }
  .emojis span.got { opacity: 0.35; }
  .emojis .more { width: auto; padding: 0 8px; font-size: 12px; color: var(--text-2); }
  .bar { height: 6px; border-radius: 4px; background: rgba(255, 255, 255, 0.08); overflow: hidden; }
  .bar span { display: block; height: 100%; background: var(--accent); border-radius: 4px; transition: width 0.3s var(--ease); }
  .empty { align-items: center; text-align: center; padding: 28px 18px; }
  .empty p { margin: 0; max-width: 420px; }
</style>
