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
  <div class="covers">
  {#each projects as project (project.id)}
    {@const t = totals(itemsOf(project))}
    <a class="card flush project" class:archived={project.archived} href="#/mais/projetos/{project.id}">
      <div class="cover" style:--c={project.color} style:background-image={project.photo ? `url(${project.photo})` : undefined}>
        {#if !project.photo}<CategoryIcon symbol={project.symbol} color={project.color} size={52} />{/if}
        <span class="badge"><SharedBadge householdId={project.household_id} /></span>
      </div>
      <div class="info">
        <div class="row" style="gap: 8px"><b class="ellipsis grow">{project.name}</b>{#if project.archived}<span class="pill faint">Arquivado</span>{/if}</div>
        <span class="caption">{t.pending} planejado{t.pending === 1 ? '' : 's'} · {t.done} feito{t.done === 1 ? '' : 's'}</span>
        <div class="meter" use:hint={['Feito × falta', 'Verde: já gasto. Laranja: o que ainda está planejado.']}>
          {#if t.spent + t.planned > 0}<span style:flex={t.spent} class="done"></span><span style:flex={t.planned} class="todo"></span>{/if}
        </div>
        <div class="row between"><span class="num">{money(t.spent, { cents: false })}</span>{#if t.planned}<span class="caption num warn">+{money(t.planned, { cents: false })}</span>{/if}</div>
      </div>
    </a>
  {/each}
  </div>
  {#if !projects.length}
    <div class="card stack empty">
      <Icon name="house" size={34} class="faint" />
      <b>Planeje compras e serviços</b>
      <p class="muted small">Crie um projeto (ex.: Apartamento) e anote o que quer comprar ou contratar, com prioridade e valor. Quando fizer, marque e anote loja e data: vira o histórico do que foi gasto.</p>
      <button class="btn primary" onclick={() => (creating = true)}><Icon name="plus" size={16} />Novo projeto</button>
    </div>
  {/if}
  {#if archivedCount}<button class="btn ghost" onclick={() => (showArchived = !showArchived)}>{showArchived ? 'Esconder arquivados' : `Mostrar arquivados (${archivedCount})`}</button>{/if}
</div>
<ProjectEditor bind:open={creating} onsaved={(p) => (location.hash = `#/mais/projetos/${p.id}`)} />
{#if editing}<ItemEditor bind:open={itemOpen} project={editing.project} item={editing.item} />{/if}

<style>
  .covers { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
  .project { color: inherit; display: flex; flex-direction: column; }
  .project:hover { transform: translateY(-2px); }
  .archived { opacity: 0.6; }
  .cover { position: relative; height: 132px; display: grid; place-items: center; background-size: cover; background-position: center;
    background-color: #111815; background-image: radial-gradient(300px 140px at 70% 0%, color-mix(in srgb, var(--c) 35%, transparent), transparent 70%); }
  .badge { position: absolute; top: 10px; right: 10px; }
  .info { padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 8px; }
  .meter { display: flex; gap: 2px; height: 8px; border-radius: 4px; overflow: hidden; background: rgba(255, 255, 255, 0.06); }
  .meter .done { background: #199e70; }
  .meter .todo { background: #d95926; }
  .empty { align-items: center; text-align: center; padding: 28px 18px; }
  .empty p { margin: 0; max-width: 440px; }
</style>
