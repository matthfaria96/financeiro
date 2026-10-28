<script lang="ts">
  /** Anel de progresso (0–1): a trilha é um tom mais claro da mesma cor. */
  let { value, size = 72, stroke = 8, color = 'var(--accent)', label = '', sub = '' }: { value: number; size?: number; stroke?: number; color?: string; label?: string; sub?: string } = $props();
  const r = $derived((size - stroke) / 2);
  const c = $derived(2 * Math.PI * r);
  const share = $derived(Math.max(0, Math.min(1, value)));
</script>

<div class="ring" style:width="{size}px" style:height="{size}px" role="img" aria-label="{label} {sub}">
  <svg width={size} height={size}>
    <circle cx={size / 2} cy={size / 2} {r} fill="none" stroke={color} stroke-opacity="0.16" stroke-width={stroke} />
    <circle cx={size / 2} cy={size / 2} {r} fill="none" stroke={color} stroke-width={stroke} stroke-linecap="round"
      stroke-dasharray="{c * share} {c}" transform="rotate(-90 {size / 2} {size / 2})" style="transition: stroke-dasharray 0.6s var(--ease)" />
  </svg>
  <div class="center"><b>{label}</b>{#if sub}<span>{sub}</span>{/if}</div>
</div>

<style>
  .ring { position: relative; flex: none; }
  .center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.1; text-align: center; }
  .center b { font-size: 15px; font-weight: 700; }
  .center span { font-size: 10.5px; color: var(--text-2); }
</style>
