<script lang="ts">
  import { organizer } from '$lib/data/organizer.svelte';
  import { money } from '$lib/core/money';
  import { today } from '$lib/core/dates';
  import Icon from '$lib/ui/Icon.svelte';
  import { hint } from '$lib/ui/hint';
  import SubHeader from '$lib/screens/more/SubHeader.svelte';
  import SharedBadge from '$lib/screens/organizer/SharedBadge.svelte';
  import VehicleEditor from '$lib/screens/car/VehicleEditor.svelte';
  import { dueColor, dueText, formatKm, fuelInfo, formatKmL, odometerOf, planOf, spendByKind } from '$lib/features/car';

  let creating = $state(false);
  const vehicles = $derived(organizer.vehicles.filter((v) => !v.archived).toSorted((a, b) => a.sort_order - b.sort_order));
  const yearStart = `${today().slice(0, 4)}-01-01`;
</script>

<div class="page">
  <SubHeader title="Carro"><button class="icon-btn" aria-label="Cadastrar carro" onclick={() => (creating = true)} use:hint={['Cadastrar carro', 'Abastecimentos, gastos e plano de revisões de um carro.']}><Icon name="plus" /></button></SubHeader>
  {#each vehicles as vehicle (vehicle.id)}
    {@const next = planOf(vehicle)[0]}
    {@const spent = spendByKind(vehicle, yearStart).reduce((s, k) => s + k.cents, 0)}
    <a class="card flush car" href="#/mais/carro/{vehicle.id}">
      <div class="cover" style:background-image={vehicle.photo ? `linear-gradient(180deg, transparent 45%, rgba(6,10,9,0.75)), url(${vehicle.photo})` : undefined}>
        {#if !vehicle.photo}<Icon name="car" size={56} stroke={1.3} />{/if}
        {#if vehicle.plate}<span class="plate">{vehicle.plate}</span>{/if}
      </div>
      <div class="stack body">
      <div class="row">
        <div class="grow"><div class="row" style="gap: 8px"><b class="ellipsis">{vehicle.name}</b><SharedBadge householdId={vehicle.household_id} /></div>
          <div class="caption ellipsis">{[vehicle.model, vehicle.plate].filter(Boolean).join(' · ') || 'Toque para ver o histórico'}</div></div>
        <Icon name="chevron-right" size={15} class="faint" />
      </div>
      <div class="stats">
        <div><span class="caption">Km atual</span><b class="num">{formatKm(odometerOf(vehicle))}</b></div>
        <div><span class="caption">Consumo médio</span><b class="num">{formatKmL(fuelInfo(vehicle).summary.kmPerLiter)}</b></div>
        <div><span class="caption">Gasto no ano</span><b class="num">{money(spent, { cents: false })}</b></div>
      </div>
      {#if next && next.due.state !== 'ok' && next.due.state !== 'unknown'}
        <div class="alert" style:--c={dueColor[next.due.state]}><Icon name="wrench.and.screwdriver" size={15} /><span class="grow small"><b>{next.item.name}</b> · {dueText(next.due)}</span></div>
      {/if}
      </div>
    </a>
  {:else}
    <div class="card stack empty">
      <Icon name="car" size={34} class="faint" />
      <b>Cadastre o seu carro</b>
      <p class="muted small">Anote abastecimentos (o app calcula km/L e R$/L), serviços, seguro, IPVA e lavagens, e receba aviso antes de cada revisão.</p>
      <button class="btn primary" onclick={() => (creating = true)}><Icon name="plus" size={16} />Cadastrar carro</button>
    </div>
  {/each}
</div>
<VehicleEditor bind:open={creating} onsaved={(v) => (location.hash = `#/mais/carro/${v.id}`)} />

<style>
  .car { color: inherit; display: block; }
  .cover { position: relative; height: 180px; display: grid; place-items: center; color: rgba(255, 255, 255, 0.2); background-size: cover; background-position: center;
    background-color: #121915; background-image: radial-gradient(500px 200px at 80% 0%, rgba(255, 159, 28, 0.28), transparent 70%); }
  .plate { position: absolute; left: 16px; bottom: 14px; font: 700 13px ui-monospace, Menlo, monospace; letter-spacing: 0.12em; padding: 3px 9px; border-radius: 6px; color: #101820; background: linear-gradient(180deg, #fff, #e3e8ee); border-top: 4px solid #1f4fbf; }
  .body { padding: 16px 18px 18px; }
  .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .stats > div { display: flex; flex-direction: column; gap: 3px; }
  .alert { display: flex; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 12px; color: var(--c); background: color-mix(in srgb, var(--c) 12%, transparent); }
  .alert b { color: var(--text); }
  .empty { align-items: center; text-align: center; padding: 28px 18px; }
  .empty p { margin: 0; max-width: 420px; }
</style>
