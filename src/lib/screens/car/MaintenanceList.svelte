<script lang="ts">
  import { organizer } from '$lib/data/organizer.svelte';
  import { store } from '$lib/data/store.svelte';
  import { shortDate, today } from '$lib/core/dates';
  import { defaultMaintenancePlan } from '$lib/core/vehicle';
  import type { MaintenanceItem, Vehicle } from '$lib/data/organizerTypes';
  import Icon from '$lib/ui/Icon.svelte';
  import { hint } from '$lib/ui/hint';
  import { dueColor, dueText, odometerOf, planOf } from '$lib/features/car';

  /** Plano de revisões com o que está vencido ou perto em cima. "Feito hoje" anota km e data. */
  let { vehicle, onedit }: { vehicle: Vehicle; onedit: (item: MaintenanceItem | null) => void } = $props();
  const all = $derived(planOf(vehicle));
  let expanded = $state(false);
  const plan = $derived(expanded ? all : all.slice(0, 3));
  const stateName = { overdue: 'Vencida', soon: 'Perto', ok: 'Em dia', unknown: 'Sem registro' } as const;

  async function done(item: MaintenanceItem) {
    const km = odometerOf(vehicle);
    await organizer.update('maintenance_items', item.id, { last_km: km, last_date: today() });
    await organizer.insert('vehicle_logs', [{ vehicle_id: vehicle.id, date: today(), kind: 'service', description: item.name, amount_cents: 0, odometer: km, liters: null, fuel: '', full_tank: true, vendor: '', notes: '' }]);
    store.toast(`${item.name}: anotado hoje. Ponha o valor no histórico, se teve.`);
  }

  async function usePlan() {
    await organizer.insert('maintenance_items', defaultMaintenancePlan.map((p, index) => ({ ...p, vehicle_id: vehicle.id, last_km: null, last_date: null, sort_order: index })));
  }
</script>

<div class="card flush list revisions" class:faded={!expanded && all.length > 3}>
  {#each plan as { item, due } (item.id)}
    <div class="list-row">
      <span class="dot" style:background={dueColor[due.state]} aria-label={stateName[due.state]}></span>
      <button class="grow stack-sm plain" style="gap: 2px; min-width: 0" onclick={() => onedit(item)} use:hint={[item.name, item.description || 'Toque para editar intervalo e última vez.']}>
        <span class="ellipsis">{item.name}</span>
        <span class="caption" style:color={due.state === 'ok' || due.state === 'unknown' ? undefined : dueColor[due.state]}>{dueText(due)}</span>
        {#if item.last_date || item.last_km}<span class="caption faint">Última: {[item.last_date ? shortDate(item.last_date) : '', item.last_km ? `${item.last_km.toLocaleString('pt-BR')} km` : ''].filter(Boolean).join(' · ')}</span>{/if}
      </button>
      <button class="btn" onclick={() => done(item)} use:hint={['Feito hoje', 'Anota o km atual e a data de hoje, e cria o serviço no histórico (ponha o valor depois).']}><Icon name="check" size={15} />Feito</button>
    </div>
  {:else}
    <div class="stack-sm pad">
      <p class="muted small">Sem plano de revisões.</p>
      <button class="btn" onclick={usePlan}><Icon name="list-checks" size={16} />Usar o plano comum (óleo, pneus, freios…)</button>
    </div>
  {/each}
</div>
<div class="row between foot">
  {#if all.length > 3}<button class="btn" onclick={() => (expanded = !expanded)}><Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={15} />{expanded ? 'Ver menos' : `Ver mais (${all.length - 3})`}</button>{:else}<span></span>{/if}
  <button class="btn ghost" onclick={() => onedit(null)}><Icon name="plus" size={16} />Adicionar revisão</button>
</div>

<style>
  .revisions { position: relative; }
  .faded > :global(:nth-child(2)) { opacity: 0.6; }
  .faded > :global(:nth-child(3)) { opacity: 0.3; -webkit-mask-image: linear-gradient(180deg, #000, transparent); mask-image: linear-gradient(180deg, #000, transparent); }
  .foot { margin-top: -4px; }
  .dot { width: 10px; height: 10px; border-radius: 50%; flex: none; }
  .plain { background: none; border: 0; text-align: left; padding: 0; color: inherit; }
  .pad { padding: 16px; }
  .pad p { margin: 0; }
</style>
