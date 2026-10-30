<script lang="ts">
  import { money } from '$lib/core/money';
  import Tooltip from './Tooltip.svelte';
  import Legend from './Legend.svelte';
  import { axisColor, gridColor, moneyTick, niceRange, surface } from './scale';

  /** Linha (2 px) com área suave na primeira série, mira vertical e balão com todas as séries no ponto. */
  interface Series {
    id: string;
    name: string;
    color: string;
    values: (number | null)[];
  }
  let { labels, series, height = 220, format = (v: number) => money(v, { cents: false }), tick = moneyTick, area = true, zero = false, title = 'Gráfico de linha' }: {
    labels: string[];
    series: Series[];
    height?: number;
    format?: (value: number) => string;
    tick?: (value: number) => string;
    area?: boolean;
    zero?: boolean;
    title?: string;
  } = $props();

  let width = $state(600);
  let hovered = $state<number | null>(null);
  const pad = { l: 46, r: 14, t: 12, b: 26 };
  const all = $derived(series.flatMap((s) => s.values.filter((v): v is number => v !== null)));
  const lo = $derived(Math.min(...all, zero ? 0 : Infinity));
  const hi = $derived(Math.max(...all, 0));
  const ticks = $derived.by(() => {
    if (!all.length) return [0, 1];
    if (zero || lo >= 0 && lo < hi * 0.35) return niceRange(Math.min(0, lo), hi);
    // Sem começar do zero quando os valores variam pouco (ex.: km/L entre 5 e 6).
    const span = hi - lo || Math.abs(hi) || 1;
    const raw = niceRange(0, span * 1.4).at(1)! || 1;
    const start = Math.floor((lo - span * 0.15) / raw) * raw;
    return Array.from({ length: Math.ceil((hi + span * 0.15 - start) / raw) + 1 }, (_, i) => start + i * raw);
  });
  const min = $derived(ticks[0]);
  const max = $derived(ticks.at(-1)!);
  const plotW = $derived(Math.max(10, width - pad.l - pad.r));
  const plotH = $derived(height - pad.t - pad.b);
  const x = (i: number) => pad.l + (labels.length < 2 ? plotW / 2 : (i * plotW) / (labels.length - 1));
  const y = (v: number) => pad.t + plotH - ((v - min) / (max - min || 1)) * plotH;
  const every = $derived(Math.max(1, Math.ceil(labels.length / Math.max(1, Math.floor(plotW / 52)))));

  function path(values: (number | null)[]): string {
    let d = '';
    let pen = false;
    values.forEach((v, i) => {
      if (v === null) return void (pen = false);
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  }
  const lines = $derived(series.map((s) => ({ ...s, d: path(s.values) })));
  const fill = $derived.by(() => {
    const first = series[0];
    if (!area || !first || series.length > 1) return '';
    const points = first.values.map((v, i) => [i, v] as const).filter((p): p is readonly [number, number] => p[1] !== null);
    if (points.length < 2) return '';
    const base = y(Math.max(min, 0) === min ? min : 0);
    return `${path(first.values)}L${x(points.at(-1)![0])},${base}L${x(points[0][0])},${base}Z`;
  });
  const gradient = `area-${Math.random().toString(36).slice(2, 8)}`;

  function move(event: PointerEvent) {
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const position = event.clientX - box.left - pad.l;
    hovered = Math.max(0, Math.min(labels.length - 1, Math.round((position / plotW) * (labels.length - 1))));
  }
  const tip = $derived(hovered === null ? null : {
    x: x(hovered), y: pad.t + plotH / 2, title: labels[hovered],
    rows: series.filter((s) => s.values[hovered!] !== null).map((s) => ({ color: s.color, name: s.name, value: format(s.values[hovered!]!) }))
  });
  const lastIndex = (values: (number | null)[]) => values.findLastIndex((v) => v !== null);
</script>

<div class="chart">
  {#if series.length > 1}<Legend items={series} line />{/if}
  <div class="plot" bind:clientWidth={width} role="img" aria-label={title} onpointermove={move} onpointerleave={() => (hovered = null)}>
    <svg {width} {height}>
      <defs><linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color={series[0]?.color} stop-opacity="0.22" /><stop offset="1" stop-color={series[0]?.color} stop-opacity="0" /></linearGradient></defs>
      {#each ticks as t (t)}
        <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke={t === 0 ? axisColor : gridColor} />
        <text x={pad.l - 8} y={y(t)} text-anchor="end" dominant-baseline="central" class="tick">{tick(t)}</text>
      {/each}
      {#if fill}<path class="area" d={fill} fill="url(#{gradient})" />{/if}
      {#each lines as line (line.id)}<path class="line" style:--c={line.color} pathLength="1" d={line.d} fill="none" stroke={line.color} stroke-width="2.25" stroke-linejoin="round" stroke-linecap="round" />{/each}
      {#if hovered !== null}<line x1={x(hovered)} x2={x(hovered)} y1={pad.t} y2={pad.t + plotH} stroke="rgba(255,255,255,0.28)" />{/if}
      {#each lines as line (line.id)}
        {@const at = hovered !== null && line.values[hovered] !== null ? hovered : lastIndex(line.values)}
        {#if at >= 0}<circle class="dot" cx={x(at)} cy={y(line.values[at]!)} r="4.5" fill={line.color} stroke={surface} stroke-width="2" />{/if}
      {/each}
      {#each labels as label, i (i)}
        {#if i === labels.length - 1 || (i % every === 0 && labels.length - 1 - i >= every * 0.6)}<text x={x(i)} y={height - 8} text-anchor="middle" class="tick">{label}</text>{/if}
      {/each}
    </svg>
    {#if tip}<Tooltip {...tip} {width} />{/if}
  </div>
  <table class="sr-only">
    <caption>{title}</caption>
    <thead><tr><th>Período</th>{#each series as s (s.id)}<th>{s.name}</th>{/each}</tr></thead>
    <tbody>{#each labels as label, i (i)}<tr><th>{label}</th>{#each series as s (s.id)}<td>{s.values[i] === null ? '' : format(s.values[i]!)}</td>{/each}</tr>{/each}</tbody>
  </table>
</div>

<style>
  .chart { position: relative; display: flex; flex-direction: column; gap: 10px; }
  .plot { position: relative; width: 100%; touch-action: pan-y; }
  svg { display: block; overflow: visible; }
  .tick { font-size: 11px; fill: var(--text-3); font-variant-numeric: tabular-nums; user-select: none; }
  /* A linha se desenha da esquerda para a direita; a área e o ponto aparecem depois. */
  .line { filter: drop-shadow(0 0 6px color-mix(in srgb, var(--c) 55%, transparent)); stroke-dasharray: 1; animation: draw 1s cubic-bezier(0.22, 1, 0.36, 1) both; transition: d 0.55s cubic-bezier(0.22, 1, 0.36, 1); }
  .area { animation: show 0.8s 0.35s both; transition: d 0.55s cubic-bezier(0.22, 1, 0.36, 1); }
  .dot { filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.35)); animation: show 0.4s 0.7s both; transition: cx 0.2s, cy 0.2s; }
  @keyframes draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
  @keyframes show { from { opacity: 0; } }
</style>
