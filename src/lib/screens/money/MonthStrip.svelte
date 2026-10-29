<script lang="ts">
  import { addMonths, monthOf, shortMonth, today, type Month } from '$lib/core/dates';

  /** Meses no topo do Início: o atual em destaque, os vizinhos menores. Toque para ver o resultado do mês. */
  let { value = $bindable(), first }: { value: Month; first: Month | null } = $props();
  const now = monthOf(today());
  const months = $derived(Array.from({ length: 12 }, (_, i) => addMonths(now, i - 11)).filter((m) => !first || m >= first || m === now));
  let track = $state<HTMLDivElement>();
  $effect(() => {
    void value;
    track?.querySelector<HTMLElement>('[data-on="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  });
</script>

<div class="strip" bind:this={track} role="tablist" aria-label="Mês">
  {#each months as m (m)}
    {@const label = shortMonth(m).slice(0, 3)}
    <button role="tab" aria-selected={m === value} data-on={m === value} class:on={m === value} class:now={m === now} onclick={() => (value = m)}>
      {label}{#if m.slice(5) === '01' || m === months[0]}<small>{m.slice(0, 4)}</small>{/if}
    </button>
  {/each}
</div>

<style>
  .strip { display: flex; gap: 4px; overflow-x: auto; scrollbar-width: none; padding: 2px 0; scroll-snap-type: x proximity; }
  .strip::-webkit-scrollbar { display: none; }
  button { flex: none; display: flex; flex-direction: column; align-items: center; min-width: 52px; padding: 7px 10px; border: 0; border-radius: 12px; background: none; color: var(--text-3); font-size: 14px; font-weight: 500; scroll-snap-align: center; transition: color 0.2s, background 0.2s; }
  button:hover { color: var(--text-2); }
  button.now { color: var(--text-2); }
  button.on { color: var(--text); background: rgba(255, 255, 255, 0.1); font: 700 19px var(--font-display); padding: 6px 16px; }
  button.now.on { color: #04140e; background: var(--accent); }
  small { font-size: 10px; font-weight: 500; opacity: 0.7; }
</style>
