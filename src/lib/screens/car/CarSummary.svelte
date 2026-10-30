<script lang="ts">
  import { money } from '$lib/core/money';
  import { today } from '$lib/core/dates';
  import type { Vehicle } from '$lib/data/organizerTypes';
  import { logKindColor, logKindShort } from '$lib/data/organizerTypes';
  import { formatKm, formatKmL, formatPerUnit, fuelInfo, odometerOf, spendByKind } from '$lib/features/car';
  import { hint } from '$lib/ui/hint';
  import Donut from '$lib/ui/Donut.svelte';

  /** Números do carro: km, consumo, custo por km e gasto do ano por tipo. */
  let { vehicle }: { vehicle: Vehicle } = $props();
  const year = today().slice(0, 4);
  const info = $derived(fuelInfo(vehicle));
  const kinds = $derived(spendByKind(vehicle, `${year}-01-01`));
  const total = $derived(kinds.reduce((s, k) => s + k.cents, 0));
  const monthsSoFar = Number(today().slice(5, 7));
</script>

<section class="card stack">
  <div class="grid">
    <div use:hint={['Km atual', 'O maior km informado no carro ou nos registros.']}><span class="caption">Km atual</span><b class="value-md">{formatKm(odometerOf(vehicle))}</b></div>
    <div use:hint={['Consumo médio', 'Medido de tanque cheio a tanque cheio, em todos os abastecimentos com km e litros.']}><span class="caption">Consumo médio</span><b class="value-md">{formatKmL(info.summary.kmPerLiter)}</b></div>
    <div use:hint={['Combustível por km', 'Quanto custa rodar 1 km só de combustível.']}><span class="caption">Combustível por km</span><b class="value-md">{formatPerUnit(info.summary.costPerKm, 'km')}</b></div>
    <div use:hint={['Gasto em ' + year, 'Tudo o que foi registrado no carro este ano, e a média por mês.']}><span class="caption">Gasto em {year}</span><b class="value-md">{money(total, { cents: false })}</b>
      <span class="caption">{money(Math.round(total / monthsSoFar), { cents: false })}/mês</span></div>
  </div>
  {#if total > 0}
    <div class="split">
      <Donut size={132} center={money(total, { cents: false })} caption={year} slices={kinds.map((k) => ({ id: k.kind, value: k.cents, color: logKindColor[k.kind], label: logKindShort[k.kind] }))} />
      <div class="legend">
        {#each kinds as k (k.kind)}<span class="small"><i style:background={logKindColor[k.kind]}></i><span class="grow">{logKindShort[k.kind]}</span><b class="num">{money(k.cents, { cents: false })}</b></span>{/each}
      </div>
    </div>
  {/if}
</section>

<style>
  .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
  @media (min-width: 640px) { .grid { grid-template-columns: repeat(4, 1fr); } }
  .grid > div { display: flex; flex-direction: column; gap: 3px; }
  .split { display: flex; gap: 20px; align-items: center; padding-top: 12px; border-top: 1px solid var(--stroke); }
  .legend { flex: 1; display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 210px)); gap: 8px 28px; color: var(--text-2); }
  .legend span { display: flex; align-items: center; gap: 8px; }
  .legend i { display: inline-block; width: 9px; height: 9px; border-radius: 50%; flex: none; }
  .legend b { color: var(--text); font-weight: 600; }
</style>
