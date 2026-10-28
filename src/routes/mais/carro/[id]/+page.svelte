<script lang="ts">
  import { page } from '$app/state';
  import { organizer } from '$lib/data/organizer.svelte';
  import type { LogKind, MaintenanceItem, VehicleLog } from '$lib/data/organizerTypes';
  import Icon from '$lib/ui/Icon.svelte';
  import Segmented from '$lib/ui/Segmented.svelte';
  import { hint } from '$lib/ui/hint';
  import SubHeader from '$lib/screens/more/SubHeader.svelte';
  import SharedBadge from '$lib/screens/organizer/SharedBadge.svelte';
  import VehicleEditor from '$lib/screens/car/VehicleEditor.svelte';
  import LogEditor from '$lib/screens/car/LogEditor.svelte';
  import MaintenanceEditor from '$lib/screens/car/MaintenanceEditor.svelte';
  import CarSummary from '$lib/screens/car/CarSummary.svelte';
  import LogList from '$lib/screens/car/LogList.svelte';
  import FuelTable from '$lib/screens/car/FuelTable.svelte';
  import MaintenanceList from '$lib/screens/car/MaintenanceList.svelte';
  import { dueColor, dueText, planOf } from '$lib/features/car';

  type Tab = 'history' | 'fuel' | 'plan';
  const vehicle = $derived(organizer.vehicles.find((v) => v.id === page.params.id));
  let tab = $state<Tab>('history');
  let editingCar = $state(false);
  let logOpen = $state(false);
  let log = $state<VehicleLog | null>(null);
  let newKind = $state<LogKind>('fuel');
  let itemOpen = $state(false);
  let item = $state<MaintenanceItem | null>(null);
  const alerts = $derived(vehicle ? planOf(vehicle).filter((p) => p.due.state === 'overdue' || p.due.state === 'soon') : []);

  function addLog(kind: LogKind) {
    log = null;
    newKind = kind;
    logOpen = true;
  }
</script>

<div class="page">
  {#if vehicle}
    <SubHeader title={vehicle.name} back="#/mais/carro">
      <button class="icon-btn" aria-label="Editar carro" onclick={() => (editingCar = true)} use:hint={['Editar carro', 'Modelo, placa, valor, km e quem vê.']}><Icon name="pencil" /></button>
    </SubHeader>
    <div class="row sub"><span class="caption grow ellipsis">{[vehicle.model, vehicle.plate, vehicle.year].filter(Boolean).join(' · ')}</span><SharedBadge householdId={vehicle.household_id} /></div>
    <div class="row actions">
      <button class="btn primary" onclick={() => addLog('fuel')} use:hint={['Abasteci', 'Anote valor, km e litros: o app calcula km/L e R$/L.']}><Icon name="fuelpump" size={16} />Abasteci</button>
      <button class="btn" onclick={() => addLog('service')} use:hint={['Registrar gasto', 'Serviço, seguro, IPVA, lavagem, peças, estacionamento…']}><Icon name="plus" size={16} />Outro gasto</button>
    </div>
    {#each alerts as { item: a, due } (a.id)}
      <button class="alert" style:--c={dueColor[due.state]} onclick={() => (tab = 'plan')}><Icon name="wrench.and.screwdriver" size={15} /><span class="grow small"><b>{a.name}</b> · {dueText(due)}</span><Icon name="chevron-right" size={14} /></button>
    {/each}
    <CarSummary {vehicle} />
    <Segmented label="Ver" bind:value={tab} options={[{ value: 'history', label: 'Histórico' }, { value: 'fuel', label: 'Abastecimentos' }, { value: 'plan', label: 'Revisões' }]} />
    {#if tab === 'history'}
      <LogList {vehicle} onedit={(l) => { log = l; logOpen = true; }} />
    {:else if tab === 'fuel'}
      <FuelTable {vehicle} onedit={(l) => { log = l; logOpen = true; }} />
    {:else}
      <MaintenanceList {vehicle} onedit={(i) => { item = i; itemOpen = true; }} />
    {/if}
    <VehicleEditor bind:open={editingCar} {vehicle} />
    <LogEditor bind:open={logOpen} {vehicle} {log} kind={newKind} />
    <MaintenanceEditor bind:open={itemOpen} {vehicle} {item} />
  {:else}
    <SubHeader title="Carro" back="#/mais/carro" />
    <p class="muted">{organizer.loadedFor ? 'Carro não encontrado.' : 'Carregando…'}</p>
  {/if}
</div>

<style>
  .sub { margin: -6px 4px 0; gap: 8px; }
  .actions { gap: 8px; flex-wrap: wrap; }
  .alert { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 12px; border: 0; text-align: left; color: var(--c); background: color-mix(in srgb, var(--c) 12%, transparent); }
  .alert b { color: var(--text); }
</style>
