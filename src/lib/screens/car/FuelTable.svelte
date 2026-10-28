<script lang="ts">
  import { money } from '$lib/core/money';
  import { dayMonth } from '$lib/core/dates';
  import { fuelName, type Vehicle, type VehicleLog } from '$lib/data/organizerTypes';
  import { formatKmL, fuelInfo, fuelsOf } from '$lib/features/car';
  import { hint } from '$lib/ui/hint';

  /** Abastecimentos como na planilha: data, combustível, km, litros, km/L, R$/L e total. */
  let { vehicle, onedit }: { vehicle: Vehicle; onedit: (log: VehicleLog) => void } = $props();
  const fills = $derived(fuelsOf(vehicle));
  const stats = $derived(fuelInfo(vehicle).stats);
  const values = $derived(fills.map((f) => stats.get(f.id)?.kmPerLiter).filter((v): v is number => v != null));
  const best = $derived(values.length ? Math.max(...values) : null);
  const worst = $derived(values.length ? Math.min(...values) : null);
</script>

<div class="card flush scroll">
  <table>
    <thead><tr><th>Data</th><th>Combustível</th><th class="r">Km</th><th class="r">Litros</th><th class="r" use:hint={['km/L', 'Km rodados desde o último tanque cheio ÷ litros colocados.']}>km/L</th><th class="r">R$/L</th><th class="r">Total</th></tr></thead>
    <tbody>
      {#each fills as fill (fill.id)}
        {@const s = stats.get(fill.id)}
        <tr onclick={() => onedit(fill)}>
          <td>{dayMonth(fill.date)}</td>
          <td class="muted">{fuelName[fill.fuel]}{fill.full_tank ? '' : ' (parcial)'}</td>
          <td class="r num">{fill.odometer?.toLocaleString('pt-BR') ?? '—'}</td>
          <td class="r num">{fill.liters ? String(fill.liters).replace('.', ',') : '—'}</td>
          <td class="r num" class:pos={s?.kmPerLiter != null && s.kmPerLiter === best} class:neg={s?.kmPerLiter != null && s.kmPerLiter === worst && best !== worst}>{s?.kmPerLiter != null ? formatKmL(s.kmPerLiter).replace(' km/L', '') : '—'}</td>
          <td class="r num">{s?.pricePerLiter != null ? s.pricePerLiter.toFixed(2).replace('.', ',') : '—'}</td>
          <td class="r num">{money(fill.amount_cents)}</td>
        </tr>
      {:else}
        <tr><td colspan="7" class="muted">Nenhum abastecimento ainda. Anote km e litros para ver o consumo.</td></tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .scroll { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; white-space: nowrap; }
  th { text-align: left; font-size: 12px; font-weight: 600; color: var(--text-2); padding: 10px 12px; border-bottom: 1px solid var(--stroke); }
  td { padding: 10px 12px; border-top: 1px solid var(--stroke); }
  tbody tr { cursor: pointer; }
  tbody tr:hover { background: rgba(255, 255, 255, 0.03); }
  .r { text-align: right; }
</style>
