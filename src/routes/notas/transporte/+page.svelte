<script lang="ts">
  import { goto } from '$app/navigation';
  import { organizer } from '$lib/data/organizer.svelte';
  import { money } from '$lib/core/money';
  import { monthOf, today } from '$lib/core/dates';
  import Icon from '$lib/ui/Icon.svelte';
  import { hint } from '$lib/ui/hint';
  import SubHeader from '$lib/screens/more/SubHeader.svelte';
  import VehicleEditor from '$lib/screens/car/VehicleEditor.svelte';
  import LogList from '$lib/screens/car/LogList.svelte';
  import { dueColor, dueText, formatKm, logsOf, odometerOf, planOf } from '$lib/features/car';

  /** Transporte: com um veículo, vai direto para ele; com mais de um, mostra o gasto de todos e cada um em cartão. */
  let creating = $state(false);
  const vehicles = $derived(organizer.vehicles.filter((v) => !v.archived).toSorted((a, b) => a.sort_order - b.sort_order));
  $effect(() => {
    if (vehicles.length === 1) goto(`#/mais/carro/${vehicles[0].id}`, { replaceState: true });
  });
  const month = monthOf(today());
  const year = today().slice(0, 4);
  const spent = (since: (date: string) => boolean) => vehicles.reduce((s, v) => s + logsOf(v).filter((l) => since(l.date)).reduce((x, l) => x + l.amount_cents, 0), 0);
</script>

<div class="page narrow">
  <SubHeader title="🚗 Transporte" back="#/notas">
    <button class="btn" onclick={() => (creating = true)} use:hint={['Cadastrar veículo', 'Carro, moto… cada um com seus gastos e revisões.']}><Icon name="plus" size={16} /><span class="hide-m">Veículo</span></button>
  </SubHeader>
  {#if vehicles.length > 1}
    <section class="card sums">
      <div><span class="caption">Este mês (todos)</span><b class="value-md">{money(spent((d) => monthOf(d) === month), { cents: false })}</b></div>
      <div><span class="caption">Em {year}</span><b class="value-md">{money(spent((d) => d.startsWith(year)), { cents: false })}</b></div>
    </section>
    {#each vehicles as v (v.id)}
      {@const next = planOf(v)[0]}
      <a class="card row car" href="#/mais/carro/{v.id}">
        <span class="thumb" style:background-image={v.photo ? `url(${v.photo})` : undefined}>{#if !v.photo}<Icon name="car" size={22} />{/if}</span>
        <span class="grow"><b>{v.name}</b><span class="caption block">{formatKm(odometerOf(v))} · {money(logsOf(v).filter((l) => monthOf(l.date) === month).reduce((s, l) => s + l.amount_cents, 0), { cents: false })} este mês</span>
          {#if next && (next.due.state === 'overdue' || next.due.state === 'soon')}<span class="caption block" style:color={dueColor[next.due.state]}>{next.item.name} · {dueText(next.due)}</span>{/if}</span>
        <Icon name="chevron-right" size={16} class="faint" />
      </a>
    {/each}
  {:else if !vehicles.length}
    <div class="card stack empty"><span class="big">🚗</span><b>Cadastre o seu carro</b><p class="muted small">Anote combustível e gastos (seguro, IPVA, lavagem, manutenção, estacionamento) e receba aviso das revisões.</p>
      <button class="btn primary" onclick={() => (creating = true)}><Icon name="plus" size={16} />Cadastrar veículo</button></div>
  {/if}
  {#if vehicles.length > 1}
    <h3 class="sub">Últimos gastos</h3>
    {#each vehicles as v (v.id)}<div class="caption">{v.name}</div><LogList vehicle={v} onedit={() => (location.hash = `#/mais/carro/${v.id}`)} />{/each}
  {/if}
</div>
<VehicleEditor bind:open={creating} onsaved={(v) => (location.hash = `#/mais/carro/${v.id}`)} />

<style>
  .sums { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .sums > div { display: flex; flex-direction: column; gap: 3px; }
  .car { gap: 14px; color: inherit; }
  .thumb { width: 64px; height: 48px; border-radius: 12px; flex: none; display: grid; place-items: center; color: var(--text-3); background: #151d19 center / cover; }
  .block { display: block; }
  .empty { align-items: center; text-align: center; padding: 30px; }
  .empty p { margin: 0; max-width: 380px; }
  .big { font-size: 44px; }
  .sub { margin: 10px 4px 0; font: 600 18px var(--font-display); }
</style>
