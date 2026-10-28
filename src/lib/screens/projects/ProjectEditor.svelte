<script lang="ts">
  import { organizer } from '$lib/data/organizer.svelte';
  import type { Project } from '$lib/data/organizerTypes';
  import { centsToInput, parseCents } from '$lib/core/money';
  import Sheet from '$lib/ui/Sheet.svelte';
  import CategoryIcon from '$lib/ui/CategoryIcon.svelte';
  import { hint } from '$lib/ui/hint';
  import { palette } from '$lib/ui/look';
  import SpacePicker from '$lib/screens/organizer/SpacePicker.svelte';
  import DeleteRow from '$lib/screens/organizer/DeleteRow.svelte';
  import { projectSymbols } from '$lib/features/projects';

  /** Projeto: um apartamento, uma reforma, as compras de alguém. */
  let { open = $bindable(), project = null, onsaved }: { open: boolean; project?: Project | null; onsaved?: (project: Project) => void } = $props();
  let name = $state('');
  let symbol = $state('house');
  let color = $state('#38D9F5');
  let budget = $state('');
  let space = $state('');
  let archived = $state(false);

  $effect(() => {
    if (!open) return;
    name = project?.name ?? ''; symbol = project?.symbol ?? 'house'; color = project?.color ?? '#38D9F5';
    budget = project?.budget_cents ? centsToInput(project.budget_cents) : ''; space = project?.household_id ?? organizer.personalId; archived = project?.archived ?? false;
  });

  async function save() {
    const fields: Partial<Project> = { name: name.trim(), symbol, color, budget_cents: parseCents(budget), archived };
    let saved: Project;
    if (project) {
      await organizer.update('projects', project.id, fields);
      await organizer.move('projects', project.id, space);
      saved = organizer.projects.find((p) => p.id === project!.id)!;
    } else {
      [saved] = await organizer.insert('projects', [{ ...fields, sort_order: organizer.projects.length }], space);
    }
    open = false;
    onsaved?.(saved);
  }
</script>

<Sheet bind:open title={project ? 'Editar projeto' : 'Novo projeto'}>
  {#snippet actions()}<button class="btn primary" disabled={!name.trim()} onclick={save}>Salvar</button>{/snippet}
  <div class="preview"><CategoryIcon {symbol} {color} size={56} /></div>
  <div class="form-group">
    <label class="form-row"><span class="field-label">Nome</span><input class="field" placeholder="ex.: Apartamento, Reforma, Minhas compras" bind:value={name} /></label>
    <label class="form-row" use:hint={['Orçamento', 'Opcional: quanto pretende gastar no total. O app mostra quanto ainda sobra.']}><span class="field-label">Orçamento</span><input class="field num" inputmode="decimal" placeholder="opcional" bind:value={budget} /></label>
  </div>
  <div class="form-title">Ícone e cor</div>
  <div class="picks">{#each projectSymbols as s (s)}<button class="pick" class:on={symbol === s} aria-label={s} onclick={() => (symbol = s)}><CategoryIcon symbol={s} {color} size={34} /></button>{/each}</div>
  <div class="picks" style="margin-top: 8px">{#each palette.slice(0, 12) as c (c)}<button class="swatch" class:on={color === c} style:background={c} aria-label="Cor {c}" onclick={() => (color = c)}></button>{/each}</div>
  <div class="form-group" style="margin-top: 14px"><SpacePicker bind:value={space} /></div>
  {#if project}
    <div class="form-group" style="margin-top: 12px">
      <label class="form-row"><span class="field-label grow">Arquivado (concluído)</span><input type="checkbox" bind:checked={archived} /></label>
    </div>
    <DeleteRow label="Apagar projeto e itens" question="Apagar o projeto com todos os itens?" ondelete={async () => { await organizer.remove('projects', [project!.id]); open = false; location.hash = '#/mais/projetos'; }} />
  {/if}
</Sheet>

<style>
  .preview { display: grid; place-items: center; padding: 8px 0 14px; }
  .picks { display: flex; flex-wrap: wrap; gap: 8px; }
  .pick { border: 2px solid transparent; border-radius: 12px; background: none; padding: 2px; }
  .pick.on { border-color: var(--accent); }
  .swatch { width: 28px; height: 28px; border-radius: 50%; border: 2px solid transparent; }
  .swatch.on { border-color: #fff; }
</style>
