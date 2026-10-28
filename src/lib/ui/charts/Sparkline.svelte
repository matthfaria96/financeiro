<script lang="ts">
  /** Tendência pequena (sem eixos) para cartões de número: linha discreta e o ponto atual em destaque. */
  let { values, width = 120, height = 36, color = 'var(--accent)' }: { values: number[]; width?: number; height?: number; color?: string } = $props();
  const geometry = $derived.by(() => {
    if (values.length < 2) return null;
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const x = (i: number) => 3 + (i * (width - 6)) / (values.length - 1);
    const y = (v: number) => 4 + (height - 8) * (1 - (v - lo) / (hi - lo || 1));
    const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
    return { d, area: `${d}L${x(values.length - 1)},${height}L${x(0)},${height}Z`, end: [x(values.length - 1), y(values.at(-1)!)] };
  });
  const id = `spark-${Math.random().toString(36).slice(2, 8)}`;
</script>

{#if geometry}
  <svg {width} {height} aria-hidden="true">
    <defs><linearGradient {id} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color={color} stop-opacity="0.25" /><stop offset="1" stop-color={color} stop-opacity="0" /></linearGradient></defs>
    <path d={geometry.area} fill="url(#{id})" />
    <path d={geometry.d} fill="none" stroke={color} stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
    <circle cx={geometry.end[0]} cy={geometry.end[1]} r="3.5" fill={color} stroke="#141b18" stroke-width="2" />
  </svg>
{/if}
