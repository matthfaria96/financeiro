<script lang="ts">
  import { money } from '$lib/core/money';
  import { dayMonth } from '$lib/core/dates';
  import { fuelName, logKindColor, logKindIcon, logKindShort, normalizeKind, type LogKind, type Vehicle, type VehicleLog } from '$lib/data/organizerTypes';
  import CategoryIcon from '$lib/ui/CategoryIcon.svelte';
  import { formatKm, logsOf } from '$lib/features/car';

  /** Histórico do carro, do mais novo para o mais antigo, com filtro por tipo. */
  let { vehicle, onedit }: { vehicle: Vehicle; onedit: (log: VehicleLog) => void } = $props();
  let filter = $state<LogKind | ''>('');
  const logs = $derived(logsOf(vehicle));
  const kinds = $derived([...new Set(logs.map((l) => normalizeKind(l.kind)))]);
  const filtered = $derived(filter ? logs.filter((l) => normalizeKind(l.kind) === filter) : logs);
  let limit = $state(15);
  const shown = $derived(filtered.slice(0, limit));
  const title = (log: VehicleLog) => log.description || (log.kind === 'fuel' ? `${log.liters ? `${String(log.liters).replace('.', ',')} L de ` : ''}${fuelName[log.fuel].toLowerCase()}`.replace('não informado', 'combustível') : logKindShort[log.kind]);
</script>

{#if kinds.length > 1}
  <div class="scroll-x">
    <button class="chip" class:active={!filter} onclick={() => (filter = '')}>Tudo</button>
    {#each kinds as kind (kind)}<button class="chip" class:active={filter === kind} onclick={() => (filter = kind)}>{logKindShort[kind]}</button>{/each}
  </div>
{/if}
<div class="card flush list">
  {#each shown as log (log.id)}
    <button class="list-row" onclick={() => onedit(log)}>
      <CategoryIcon symbol={logKindIcon[log.kind]} color={logKindColor[log.kind]} />
      <span class="grow stack-sm" style="gap: 1px; min-width: 0">
        <span class="ellipsis">{title(log)}</span>
        <span class="caption ellipsis">{[dayMonth(log.date), log.odometer ? formatKm(log.odometer) : '', log.vendor].filter(Boolean).join(' · ')}</span>
      </span>
      <span class="num">{money(log.amount_cents)}</span>
    </button>
  {:else}
    <p class="muted small pad">Nada lançado ainda. Use "Combustível" ou "Gasto" para anotar o primeiro.</p>
  {/each}
</div>
{#if filtered.length > limit}<button class="btn block" onclick={() => (limit += 15)}>Carregar mais ({filtered.length - limit})</button>{/if}

<style>
  .pad { padding: 16px; margin: 0; }
</style>
