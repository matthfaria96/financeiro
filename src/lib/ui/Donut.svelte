<script lang="ts">
  import { percent } from '$lib/core/money';
  /** Rosca em SVG puro (sem biblioteca de gráficos). */
  let { slices, size = 220, thickness = 0.42, labels = true, center = '' }: { slices: { id: string; value: number; color: string }[]; size?: number; thickness?: number; labels?: boolean; center?: string } = $props();

  const total = $derived(slices.reduce((s, x) => s + Math.max(0, x.value), 0));
  const arcs = $derived.by(() => {
    const r = 50;
    const inner = r * (1 - thickness);
    const gap = slices.length > 1 ? 0.012 : 0;
    let angle = -Math.PI / 2;
    return slices.filter((s) => s.value > 0).map((slice) => {
      const share = slice.value / (total || 1);
      const sweep = share * Math.PI * 2;
      const a0 = angle + gap;
      const a1 = angle + sweep - gap;
      angle += sweep;
      const large = a1 - a0 > Math.PI ? 1 : 0;
      const p = (a: number, radius: number) => `${50 + radius * Math.cos(a)} ${50 + radius * Math.sin(a)}`;
      const path = share >= 0.999
        ? `M ${p(0, r)} A ${r} ${r} 0 1 1 ${p(Math.PI, r)} A ${r} ${r} 0 1 1 ${p(0, r)} M ${p(0, inner)} A ${inner} ${inner} 0 1 0 ${p(Math.PI, inner)} A ${inner} ${inner} 0 1 0 ${p(0, inner)} Z`
        : `M ${p(a0, r)} A ${r} ${r} 0 ${large} 1 ${p(a1, r)} L ${p(a1, inner)} A ${inner} ${inner} 0 ${large} 0 ${p(a0, inner)} Z`;
      const mid = (a0 + a1) / 2;
      return { ...slice, path, share, labelAt: p(mid, (r + inner) / 2).split(' ').map(Number) };
    });
  });
</script>

<svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label="Gráfico de rosca">
  {#each arcs as arc (arc.id)}
    <path d={arc.path} fill={arc.color} fill-rule="evenodd" />
    {#if labels && arc.share >= 0.06}
      <text x={arc.labelAt[0]} y={arc.labelAt[1]} text-anchor="middle" dominant-baseline="central" font-size="5.4" font-weight="700" fill="rgba(0,0,0,0.78)">{percent(arc.share)}</text>
    {/if}
  {/each}
  {#if center}
    <text x="50" y="50" text-anchor="middle" dominant-baseline="central" font-size="5.6" fill="var(--text)">{center}</text>
  {/if}
</svg>
