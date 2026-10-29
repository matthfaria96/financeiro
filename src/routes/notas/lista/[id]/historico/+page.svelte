<script lang="ts">
  import { page } from '$app/state';
  import { organizer } from '$lib/data/organizer.svelte';
  import { dayMonth } from '$lib/core/dates';
  import { money } from '$lib/core/money';
  import { itemEmoji } from '$lib/core/shopping';
  import Icon from '$lib/ui/Icon.svelte';
  import SubHeader from '$lib/screens/more/SubHeader.svelte';
  import ListView from '$lib/screens/notes/ListView.svelte';
  import { itemsOf, listsOf } from '$lib/features/shopping';

  /** Listas anteriores de um caderno, da mais nova para a mais antiga. Toque para ver os itens. */
  const notebook = $derived(organizer.notebooks.find((n) => n.id === page.params.id));
  const old = $derived(notebook ? listsOf(notebook).slice(1) : []);
  let open = $state('');
</script>

<div class="page narrow">
  <SubHeader title="Histórico{notebook ? ` · ${notebook.name}` : ''}" back="#/notas/lista/{page.params.id}" />
  {#each old as list (list.id)}
    {@const items = itemsOf(list)}
    <section class="card stack-sm">
      <button class="row head" onclick={() => (open = open === list.id ? '' : list.id)}>
        <span class="grow"><b>Lista de {dayMonth(list.created_at.slice(0, 10))}</b><span class="caption"> · {items.length} {items.length === 1 ? 'item' : 'itens'}{list.total_cents ? ` · deu ${money(list.total_cents)}` : ''}</span></span>
        <Icon name={open === list.id ? 'chevron-up' : 'chevron-down'} size={16} class="faint" />
      </button>
      {#if open === list.id}
        <ListView {list} readonly />
        <button class="btn danger" style="align-self: flex-start" onclick={() => organizer.remove('shopping_lists', [list.id])}><Icon name="trash" size={15} />Apagar esta lista antiga</button>
      {:else}
        <div class="emojis">{#each items.slice(0, 16) as item (item.id)}<span>{itemEmoji(item.name)}</span>{/each}</div>
      {/if}
    </section>
  {:else}
    <div class="card muted small">Ainda não há listas antigas. Quando você gerar uma nova, a atual vem para cá.</div>
  {/each}
</div>

<style>
  .head { background: none; border: 0; padding: 0; text-align: left; width: 100%; }
  .emojis { display: flex; flex-wrap: wrap; gap: 4px; }
  .emojis span { width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; background: rgba(255, 255, 255, 0.05); }
</style>
