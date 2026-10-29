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
  import CarCharts from '$lib/screens/car/CarCharts.svelte';
  import { dueColor, dueText, planOf } from '$lib/features/car';

  type Tab = 'history' | 'fuel' | 'plan' | 'charts';
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
    <section class="banner" style:background-image={vehicle.photo ? `linear-gradient(180deg, rgba(6,10,9,0) 35%, rgba(6,10,9,0.85)), url(${vehicle.photo})` : undefined} class:placeholder={!vehicle.photo}>
      {#if !vehicle.photo}<span class="car-ico"><Icon name="car" size={64} stroke={1.4} /></span>{/if}
      <div class="banner-foot">
        <div><span class="caption">{[vehicle.model, vehicle.year].filter(Boolean).join(' · ') || 'Carro'}</span>{#if vehicle.plate}<span class="plate">{vehicle.plate}</span>{/if}</div>
        <SharedBadge householdId={vehicle.household_id} />
      </div>
      {#if !vehicle.photo}<button class="btn add-photo" onclick={() => (editingCar = true)}><Icon name="image" size={15} />Adicionar foto</button>{/if}
    </section>
    <div class="row actions">
      <button class="btn primary" onclick={() => addLog('fuel')} use:hint={['Abasteci', 'Anote valor, km e litros: o app calcula km/L e R$/L.']}><Icon name="fuelpump" size={16} />Abasteci</button>
      <button class="btn" onclick={() => addLog('service')} use:hint={['Registrar gasto', 'Serviço, seguro, IPVA, lavagem, peças, estacionamento…']}><Icon name="plus" size={16} />Outro gasto</button>
    </div>
    {#each alerts.slice(0, 1) as { item: a, due } (a.id)}
      <button class="alert" style:--c={dueColor[due.state]} onclick={() => (tab = 'plan')}><Icon name="wrench.and.screwdriver" size={15} /><span class="grow small"><b>{a.name}</b> · {dueText(due)}{alerts.length > 1 ? ` · e mais ${alerts.length - 1}` : ''}</span><Icon name="chevron-right" size={14} /></button>
    {/each}
    <CarSummary {vehicle} />
    <Segmented label="Ver" bind:value={tab} options={[{ value: 'history', label: 'Histórico' }, { value: 'fuel', label: 'Abastecimentos' }, { value: 'plan', label: 'Revisões' }, { value: 'charts', label: 'Gráficos' }]} />
    {#if tab === 'history'}
      <LogList {vehicle} onedit={(l) => { log = l; logOpen = true; }} />
    {:else if tab === 'fuel'}
      <FuelTable {vehicle} onedit={(l) => { log = l; logOpen = true; }} />
    {:else if tab === 'plan'}
      <MaintenanceList {vehicle} onedit={(i) => { item = i; itemOpen = true; }} />
    {:else}
      <CarCharts {vehicle} />
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
  .banner { position: relative; min-height: 220px; border-radius: var(--radius); overflow: hidden; background-size: cover; background-position: center; border: 1px solid var(--stroke); display: flex; align-items: flex-end; box-shadow: var(--shadow); }
  .banner.placeholder { background: radial-gradient(600px 260px at 80% 0%, rgba(255, 159, 28, 0.28), transparent 70%), linear-gradient(160deg, #1b2420, #0b110f); }
  .car-ico { position: absolute; right: 36px; top: 30px; color: rgba(255, 255, 255, 0.18); }
  .banner-foot { position: relative; width: 100%; padding: 16px 18px; display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; }
  .banner-foot > div { display: flex; flex-direction: column; gap: 6px; }
  .plate { align-self: flex-start; font: 700 14px ui-monospace, Menlo, monospace; letter-spacing: 0.12em; padding: 3px 10px; border-radius: 6px; color: #101820; background: linear-gradient(180deg, #ffffff, #e3e8ee); border-top: 4px solid #1f4fbf; }
  .add-photo { position: absolute; top: 14px; left: 14px; }
  .actions { gap: 8px; flex-wrap: wrap; }
  .alert { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 12px; border: 0; text-align: left; color: var(--c); background: color-mix(in srgb, var(--c) 12%, transparent); }
  .alert b { color: var(--text); }
</style>
