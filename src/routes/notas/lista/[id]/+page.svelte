<script lang="ts">
  import { page } from '$app/state';
  import { organizer } from '$lib/data/organizer.svelte';
  import { dayMonth } from '$lib/core/dates';
  import Icon from '$lib/ui/Icon.svelte';
  import Ring from '$lib/ui/charts/Ring.svelte';
  import { hint } from '$lib/ui/hint';
  import SubHeader from '$lib/screens/more/SubHeader.svelte';
  import SharedBadge from '$lib/screens/organizer/SharedBadge.svelte';
  import ListView from '$lib/screens/notes/ListView.svelte';
  import NewListSheet from '$lib/screens/notes/NewListSheet.svelte';
  import NotebookEditor from '$lib/screens/notes/NotebookEditor.svelte';
  import { createList, currentList, itemsOf, listsOf } from '$lib/features/shopping';

  /** Um caderno (Mercado, Farmácia…): abre direto na lista mais nova. */
  const notebook = $derived(organizer.notebooks.find((n) => n.id === page.params.id));
  const list = $derived(notebook ? currentList(notebook) : undefined);
  const items = $derived(list ? itemsOf(list) : []);
  const got = $derived(items.filter((i) => i.checked).length);
  const older = $derived(notebook ? listsOf(notebook).length - 1 : 0);
  let generating = $state(false);
  let editing = $state(false);
</script>

<div class="page narrow">
  {#if notebook}
    <SubHeader title="{notebook.emoji} {notebook.name}" back="#/notas">
      <button class="icon-btn" aria-label="Editar lista" onclick={() => (editing = true)} use:hint={['Editar', 'Nome, figurinha, cor e quem vê.']}><Icon name="settings" /></button>
    </SubHeader>
    {#if list}
      <section class="card head-card">
        <Ring value={items.length ? got / items.length : 0} size={70} stroke={7} label="{got}/{items.length}" sub="pegos" />
        <div class="grow stack-sm" style="gap: 4px; align-items: flex-start">
          <SharedBadge householdId={notebook.household_id} />
          <span class="small muted">Lista de {dayMonth(list.created_at.slice(0, 10))}{items.length ? ` · faltam ${items.length - got}` : ''}</span>
        </div>
      </section>
      <ListView {list} />
      <div class="actions">
        <button class="btn primary lg" onclick={() => (generating = true)} use:hint={['Gerar nova', 'Começa a próxima lista (mantendo os itens que repetem, ou zerada). Esta vai para o histórico.']}><Icon name="copy-plus" size={18} />Gerar nova</button>
        <a class="btn lg" href="#/notas/lista/{notebook.id}/historico" use:hint={['Ver histórico', 'As listas anteriores deste caderno.']}><Icon name="history" size={18} />Ver histórico{older > 0 ? ` (${older})` : ''}</a>
      </div>
    {:else}
      <div class="card stack empty"><span class="big">{notebook.emoji}</span><b>Nenhuma lista ainda</b><button class="btn primary" onclick={() => createList(notebook!)}><Icon name="plus" size={16} />Começar lista</button></div>
    {/if}
    <NewListSheet bind:open={generating} {notebook} />
    <NotebookEditor bind:open={editing} {notebook} />
  {:else}
    <SubHeader title="Lista" back="#/notas" />
    <p class="muted">{organizer.loadedFor ? 'Lista não encontrada.' : 'Carregando…'}</p>
  {/if}
</div>

<style>
  .head-card { display: flex; align-items: center; gap: 16px; }
  .actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .empty { align-items: center; text-align: center; padding: 30px; }
  .big { font-size: 44px; }
</style>
