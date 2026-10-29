<script lang="ts">
  import { money } from '$lib/core/money';
  import Tooltip from './Tooltip.svelte';
  import Legend from './Legend.svelte';
  import { axisColor, columnPath, gridColor, moneyTick, niceTicks } from './scale';

  /**
   * Colunas por período. Séries com o mesmo `stack` se empilham; stacks diferentes ficam lado a lado.
   * Passar o mouse numa coluna mostra todas as séries daquele período.
   */
  interface Series {
    id: string;
    name: string;
    color: string;
    values: number[];
    stack?: string;
  }
  let { labels, series, height = 220, format = (v: number) => money(v, { cents: false }), current = -1, faded = () => false, onselect, title = 'Gráfico de colunas' }: {
    labels: string[];
    series: Series[];
    height?: number;
    format?: (value: number) => string;
    current?: number;
    faded?: (index: number) => boolean;
    onselect?: (index: number) => void;
    title?: string;
  } = $props();

  let width = $state(600);
  let hovered = $state<number | null>(null);
  const pad = { l: 46, r: 8, t: 10, b: 26 };

  const stacks = $derived([...new Set(series.map((s) => s.stack ?? s.id))]);
  const totals = $derived(labels.map((_, i) => stacks.map((stack) => series.filter((s) => (s.stack ?? s.id) === stack).reduce((sum, s) => sum + Math.max(0, s.values[i] ?? 0), 0))));
  const ticks = $derived(niceTicks(Math.max(1, ...totals.flat())));
  const top = $derived(ticks.at(-1)!);
  const plotW = $derived(Math.max(10, width - pad.l - pad.r));
  const plotH = $derived(height - pad.t - pad.b);
  const band = $derived(plotW / Math.max(labels.length, 1));
  const barW = $derived(Math.max(4, Math.min(24, (band * 0.72 - (stacks.length - 1) * 2) / stacks.length)));
  const groupW = $derived(barW * stacks.length + (stacks.length - 1) * 2);
  const y = (value: number) => pad.t + plotH - (value / top) * plotH;
  const every = $derived(Math.max(1, Math.ceil(labels.length / Math.max(1, Math.floor(plotW / 46)))));

  const bars = $derived(labels.flatMap((_, i) => stacks.flatMap((stack, k) => {
    const members = series.filter((s) => (s.stack ?? s.id) === stack && (s.values[i] ?? 0) > 0);
    const x = pad.l + band * i + (band - groupW) / 2 + k * (barW + 2);
    let base = 0;
    return members.map((s, m) => {
      const value = s.values[i];
      const y0 = y(base);
      base += value;
      const y1 = y(base);
      const last = m === members.length - 1;
      // 2 px de fundo entre segmentos empilhados.
      const h = Math.max(0, y0 - y1 - (m > 0 ? 2 : 0));
      return { key: `${i}-${s.id}`, i, color: s.color, d: last ? columnPath(x, y1, barW, h) : `M${x},${y1}h${barW}v${h}h${-barW}Z` };
    });
  })));

  const tip = $derived(hovered === null ? null : {
    x: pad.l + band * hovered + band / 2,
    y: pad.t + plotH / 2,
    title: labels[hovered],
    rows: series.map((s) => ({ color: s.color, name: s.name, value: format(s.values[hovered!] ?? 0) }))
  });
</script>

<div class="chart">
  {#if series.length > 1}<Legend items={series} />{/if}
  <div class="plot" bind:clientWidth={width} role="img" aria-label={title} onpointerleave={() => (hovered = null)}>
    <svg {width} {height}>
      {#each ticks as tick (tick)}
        <line x1={pad.l} x2={width - pad.r} y1={y(tick)} y2={y(tick)} stroke={tick === 0 ? axisColor : gridColor} />
        <text x={pad.l - 8} y={y(tick)} text-anchor="end" dominant-baseline="central" class="tick">{moneyTick(tick)}</text>
      {/each}
      {#if hovered !== null}<rect x={pad.l + band * hovered + 2} y={pad.t} width={band - 4} height={plotH} rx="8" fill="rgba(255,255,255,0.045)" />{/if}
      {#each bars as bar (bar.key)}
        <path d={bar.d} fill={bar.color} opacity={faded(bar.i) ? 0.38 : hovered === null || hovered === bar.i ? 1 : 0.55} />
      {/each}
      {#each labels as label, i (i)}
        {#if i === current || (i % every === 0 && Math.abs(i - current) >= every * 0.6) || (current < 0 && i % every === 0)}
          <text x={pad.l + band * i + band / 2} y={height - 8} text-anchor="middle" class="tick" class:now={i === current}>{label}</text>
        {/if}
        <rect class="hit" x={pad.l + band * i} y={pad.t} width={band} height={plotH + pad.b} fill="transparent" tabindex="0" role="button" aria-label="{label}: {series.map((s) => `${s.name} ${format(s.values[i] ?? 0)}`).join(', ')}"
          onpointerenter={() => (hovered = i)} onfocus={() => (hovered = i)} onblur={() => (hovered = null)} onclick={() => onselect?.(i)}
          onkeydown={(e) => { if (e.key === 'Enter') onselect?.(i); }} style:cursor={onselect ? 'pointer' : 'default'} />
      {/each}
    </svg>
    {#if tip}<Tooltip {...tip} {width} />{/if}
  </div>
  <table class="sr-only">
    <caption>{title}</caption>
    <thead><tr><th>Período</th>{#each series as s (s.id)}<th>{s.name}</th>{/each}</tr></thead>
    <tbody>{#each labels as label, i (i)}<tr><th>{label}</th>{#each series as s (s.id)}<td>{format(s.values[i] ?? 0)}</td>{/each}</tr>{/each}</tbody>
  </table>
</div>

<style>
  .chart { position: relative; display: flex; flex-direction: column; gap: 10px; }
  .plot { position: relative; width: 100%; }
  svg { display: block; overflow: visible; }
  .tick { font-size: 11px; fill: var(--text-3); font-variant-numeric: tabular-nums; }
  .tick.now { fill: var(--text); font-weight: 600; }
  .hit:focus { outline: none; }
  path { transition: opacity 0.2s; }
  svg :global(text) { user-select: none; }
</style>
