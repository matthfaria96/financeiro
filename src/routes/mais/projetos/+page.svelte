<script lang="ts">
  import { organizer } from '$lib/data/organizer.svelte';
  import { money } from '$lib/core/money';
  import type { Project, ProjectItem } from '$lib/data/organizerTypes';
  import Icon from '$lib/ui/Icon.svelte';
  import CategoryIcon from '$lib/ui/CategoryIcon.svelte';
  import SectionTitle from '$lib/ui/SectionTitle.svelte';
  import { hint } from '$lib/ui/hint';
  import SubHeader from '$lib/screens/more/SubHeader.svelte';
  import SharedBadge from '$lib/screens/organizer/SharedBadge.svelte';
  import ProjectEditor from '$lib/screens/projects/ProjectEditor.svelte';
  import ItemEditor from '$lib/screens/projects/ItemEditor.svelte';
  import ItemRow from '$lib/screens/projects/ItemRow.svelte';
  import { itemsOf, nextPurchases, totals } from '$lib/features/projects';

  let creating = $state(false);
  let showArchived = $state(false);
  let itemOpen = $state(false);
  let editing = $state<{ item: ProjectItem; project: Project } | null>(null);
  const projects = $derived(organizer.projects.filter((p) => showArchived || !p.archived).toSorted((a, b) => Number(a.archived) - Number(b.archived) || a.sort_order - b.sort_order));
  const next = $derived(nextPurchases());
  const archivedCount = $derived(organizer.projects.filter((p) => p.archived).length);
</script>

<div class="page">
  <SubHeader title="Casa e compras"><button class="icon-btn" aria-label="Novo projeto" onclick={() => (creating = true)} use:hint={['Novo projeto', 'Apartamento, reforma, compras de alguém…']}><Icon name="plus" /></button></SubHeader>

  {#if next.length}
    <SectionTitle title="Próximas compras" />
    <div class="card flush list">
      {#each next as { item, project } (item.id)}<ItemRow {item} project={project.name} onedit={() => { editing = { item, project }; itemOpen = true; }} />{/each}
    </div>
  {/if}

  <SectionTitle title="Projetos" />
  {#each projects as project (project.id)}
    {@const t = totals(itemsOf(project))}
    <a class="card row project" class:archived={project.archived} href="#/mais/projetos/{project.id}">
      <CategoryIcon symbol={project.symbol} color={project.color} size={44} />
      <div class="grow stack-sm" style="gap: 3px; min-width: 0">
        <div class="row" style="gap: 8px"><b class="ellipsis">{project.name}</b><SharedBadge householdId={project.household_id} />{#if project.archived}<span class="pill faint">Arquivado</span>{/if}</div>
        <span class="caption">{t.pending} planejado{t.pending === 1 ? '' : 's'} · {t.done} feito{t.done === 1 ? '' : 's'}</span>
      </div>
      <div class="sums">
        <span class="num" use:hint={['Já gasto', 'Soma dos itens feitos.']}>{money(t.spent, { cents: false })}</span>
        {#if t.planned}<span class="caption num warn" use:hint={['Falta', 'Soma estimada do que está planejado.']}>+{money(t.planned, { cents: false })}</span>{/if}
      </div>
    </a>
  {:else}
    <div class="card stack empty">
      <Icon name="house" size={34} class="faint" />
      <b>Planeje compras e serviços</b>
      <p class="muted small">Crie um projeto (ex.: Apartamento) e anote o que quer comprar ou contratar, com prioridade e valor. Quando fizer, marque e anote loja e data: vira o histórico do que foi gasto.</p>
      <button class="btn primary" onclick={() => (creating = true)}><Icon name="plus" size={16} />Novo projeto</button>
    </div>
  {/each}
  {#if archivedCount}<button class="btn ghost" onclick={() => (showArchived = !showArchived)}>{showArchived ? 'Esconder arquivados' : `Mostrar arquivados (${archivedCount})`}</button>{/if}
</div>
<ProjectEditor bind:open={creating} onsaved={(p) => (location.hash = `#/mais/projetos/${p.id}`)} />
{#if editing}<ItemEditor bind:open={itemOpen} project={editing.project} item={editing.item} />{/if}

<style>
  .project { color: inherit; gap: 14px; }
  .archived { opacity: 0.6; }
  .sums { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
  .empty { align-items: center; text-align: center; padding: 28px 18px; }
  .empty p { margin: 0; max-width: 440px; }
</style>
