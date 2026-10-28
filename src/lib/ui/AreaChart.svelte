<script lang="ts">
  import { compactMoney } from '$lib/core/money';
  import { monthInitial } from '$lib/core/dates';
  /** Linha com área (evolução do patrimônio), SVG puro. */
  let { points, height = 200 }: { points: { month: string; cents: number }[]; height?: number } = $props();
  const W = 600;
  const pad = { l: 64, r: 12, t: 14, b: 26 };
  const geometry = $derived.by(() => {
    const values = points.map((p) => p.cents);
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const margin = Math.max((hi - lo) * 0.25, 10_000);
    const min = lo - margin;
    const max = hi + margin;
    const x = (i: number) => pad.l + (i * (W - pad.l - pad.r)) / Math.max(points.length - 1, 1);
    const y = (v: number) => pad.t + ((max - v) * (height - pad.t - pad.b)) / (max - min || 1);
    const line = points.map((p, i) => `${i ? 'L' : 'M'} ${x(i)} ${y(p.cents)}`).join(' ');
    const area = `${line} L ${x(points.length - 1)} ${height - pad.b} L ${x(0)} ${height - pad.b} Z`;
    const ticks = [max - margin, (max + min) / 2, min + margin];
    return { x, y, line, area, ticks };
  });
</script>

<svg viewBox="0 0 {W} {height}" width="100%" preserveAspectRatio="none" style:height="{height}px" role="img" aria-label="Evolução nos últimos meses">
  <defs>
    <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#1E90FF" stop-opacity="0.7" />
      <stop offset="1" stop-color="#1E90FF" stop-opacity="0.04" />
    </linearGradient>
  </defs>
  {#each geometry.ticks as tick}
    <line x1={pad.l} x2={W - pad.r} y1={geometry.y(tick)} y2={geometry.y(tick)} stroke="rgba(255,255,255,0.1)" stroke-dasharray="3 5" vector-effect="non-scaling-stroke" />
    <text x={pad.l - 8} y={geometry.y(tick)} text-anchor="end" dominant-baseline="central" font-size="12" fill="var(--text-2)">{compactMoney(tick)}</text>
  {/each}
  <path d={geometry.area} fill="url(#area)" />
  <path d={geometry.line} fill="none" stroke="#1E90FF" stroke-width="3" vector-effect="non-scaling-stroke" stroke-linejoin="round" />
  {#each points as point, i}
    <circle cx={geometry.x(i)} cy={geometry.y(point.cents)} r="5" fill="#0B1A2A" stroke="#7FC4FF" stroke-width="2.5" vector-effect="non-scaling-stroke" />
    <text x={geometry.x(i)} y={height - 6} text-anchor="middle" font-size="12" fill="var(--text-2)">{monthInitial(point.month)}</text>
  {/each}
</svg>
