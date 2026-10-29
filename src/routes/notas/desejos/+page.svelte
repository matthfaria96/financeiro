<script lang="ts">
  import { organizer } from '$lib/data/organizer.svelte';
  import { money } from '$lib/core/money';
  import type { Project, ProjectItem } from '$lib/data/organizerTypes';
  import Icon from '$lib/ui/Icon.svelte';
  import { hint } from '$lib/ui/hint';
  import SubHeader from '$lib/screens/more/SubHeader.svelte';
  import ItemRow from '$lib/screens/projects/ItemRow.svelte';
  import ItemEditor from '$lib/screens/projects/ItemEditor.svelte';
  import { byDoneDate, byPriority } from '$lib/features/projects';

  /** Lista de desejos: o que falta comprar/fazer (por prioridade) e, à parte, o que já foi comprado. */
  let group = $state('');
  let showDone = $state(false);
  let editorOpen = $state(false);
  let editing = $state<{ item: ProjectItem | null; project: Project } | null>(null);
  const projects = $derived(organizer.projects.filter((p) => !p.archived).toSorted((a, b) => a.sort_order - b.sort_order));
  const byId = $derived(new Map(organizer.projects.map((p) => [p.id, p])));
  const scoped = $derived(organizer.project_items.filter((i) => !group || i.project_id === group));
  const pending = $derived(scoped.filter((i) => !i.done).toSorted(byPriority));
  const done = $derived(scoped.filter((i) => i.done).toSorted(byDoneDate));
  const total = $derived(pending.reduce((s, i) => s + (i.amount_cents ?? 0), 0));

  async function add() {
    let project = group ? byId.get(group) : projects[0];
    if (!project) [project] = await organizer.insert('projects', [{ name: 'Geral', symbol: 'gift', color: '#38D9F5', budget_cents: null, photo: '', archived: false, sort_order: 0 }]);
    editing = { item: null, project };
    editorOpen = true;
  }
</script>

<div class="page narrow">
  <SubHeader title="⭐ Lista de desejos" back="#/notas">
    <button class="btn primary" onclick={add}><Icon name="plus" size={16} /><span class="hide-m">Desejo</span></button>
  </SubHeader>
  {#if projects.length > 1}
    <div class="scroll-x">
      <button class="chip" class:active={!group} onclick={() => (group = '')}>Todos</button>
      {#each projects as p (p.id)}<button class="chip" class:active={group === p.id} onclick={() => (group = p.id)}>{p.name}</button>{/each}
      <a class="chip" href="#/mais/projetos" use:hint={['Grupos', 'Criar ou editar grupos (ex.: Apartamento, Presentes).']}><Icon name="pencil" size={13} />Grupos</a>
    </div>
  {/if}
  <section class="card summary"><span class="caption">Falta (estimado)</span><b class="value-lg">{money(total, { cents: false })}</b><span class="caption">{pending.length} {pending.length === 1 ? 'desejo' : 'desejos'}</span></section>
  <div class="card flush list">
    {#each pending as item (item.id)}<ItemRow {item} project={group ? '' : byId.get(item.project_id)?.name ?? ''} onedit={() => { editing = { item, project: byId.get(item.project_id)! }; editorOpen = true; }} />
    {:else}<p class="muted small pad">Nada na lista. Toque em + para anotar o que quer comprar ou fazer.</p>{/each}
  </div>
  {#if done.length}
    <button class="btn ghost" style="align-self: flex-start" onclick={() => (showDone = !showDone)}><Icon name={showDone ? 'chevron-up' : 'chevron-down'} size={15} />Já comprados ({done.length})</button>
    {#if showDone}<div class="card flush list done">{#each done as item (item.id)}<ItemRow {item} project={group ? '' : byId.get(item.project_id)?.name ?? ''} onedit={() => { editing = { item, project: byId.get(item.project_id)! }; editorOpen = true; }} />{/each}</div>{/if}
  {/if}
</div>
{#if editing}<ItemEditor bind:open={editorOpen} project={editing.project} item={editing.item} />{/if}

<style>
  .summary { display: flex; align-items: baseline; gap: 10px; }
  .pad { padding: 16px; margin: 0; }
  .done { opacity: 0.75; }
</style>
