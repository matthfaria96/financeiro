<script lang="ts">
  import { money } from '$lib/core/money';
  import { shortMonth } from '$lib/core/dates';
  import Icon from '$lib/ui/Icon.svelte';
  import LineChart from '$lib/ui/charts/LineChart.svelte';
  import { hint } from '$lib/ui/hint';
  import { outlookTotal, type Outlook } from '$lib/features/month';

  /** O número principal (quanto tenho) com a evolução dos últimos meses. */
  let { outlook, history }: { outlook: Outlook; history: { month: string; cents: number }[] } = $props();
  const total = $derived(outlookTotal(outlook));
  const first = $derived(history.find((h) => h.cents !== 0)?.cents ?? 0);
  const change = $derived(first ? total - first : 0);
  const tiles = $derived([
    { label: 'Em conta', icon: 'bank', value: outlook.inAccount, color: '#3987e5' },
    { label: 'Investido', icon: 'invest', value: outlook.invested, color: '#199e70' },
    { label: 'Dinheiro', icon: 'cash', value: outlook.cash, color: '#8bc34a' },
    { label: 'Cartões em aberto', icon: 'card', value: -outlook.cardsOpen, color: '#d95926' }
  ]);
</script>

<section class="card hero-card" use:hint={['Quanto tenho agora', 'Contas, investimentos e dinheiro em espécie. O cartão em aberto aparece à parte e não está descontado.']}>
  <div class="row between top">
    <div>
      <div class="label">Quanto tenho agora</div>
      <div class="hero grad-text">{money(total)}</div>
      {#if change}<div class="delta" class:up={change >= 0}><Icon name={change >= 0 ? 'trending-up' : 'trending-down'} size={14} />{change >= 0 ? '+' : '−'}{money(Math.abs(change), { cents: false })} em {history.length - 1} meses</div>{/if}
    </div>
  </div>
  <LineChart labels={history.map((h) => shortMonth(h.month).slice(0, 3))} series={[{ id: 'total', name: 'Patrimônio', color: '#2bd4a4', values: history.map((h) => h.cents) }]} height={250} title="Patrimônio nos últimos meses" />
  <div class="tiles">
    {#each tiles as tile (tile.label)}
      <div class="tile"><span class="caption row" style="gap: 6px"><i style:background={tile.color}></i>{tile.label}</span><b class="num">{money(tile.value, { cents: false })}</b></div>
    {/each}
  </div>
</section>

<style>
  .hero-card { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 14px; }
  .hero-card::before { content: ''; position: absolute; inset: -40% -10% auto auto; width: 70%; height: 120%; background: radial-gradient(closest-side, rgba(43, 212, 164, 0.16), transparent); pointer-events: none; }
  .top { position: relative; }
  .delta { display: inline-flex; align-items: center; gap: 6px; margin-top: 6px; font-size: 13px; font-weight: 600; color: var(--negative); }
  .delta.up { color: var(--positive); }
  .tiles { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
  @media (max-width: 640px) { .tiles { grid-template-columns: repeat(2, 1fr); } }
  .tile { padding: 10px 12px; border-radius: 14px; background: rgba(255, 255, 255, 0.04); border: 1px solid var(--stroke); display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .tile i { width: 8px; height: 8px; border-radius: 50%; }
  .tile b { font-size: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
