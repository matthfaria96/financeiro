<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { cubicOut } from 'svelte/easing';
  import { money, percent } from '$lib/core/money';
  /** Rosca em SVG puro. Passar o mouse numa fatia mostra nome, valor e % no centro. */
  let { slices, size = 220, thickness = 0.32, labels = false, center = '', caption = '', format = (v: number) => money(v, { cents: false }) }: {
    slices: { id: string; value: number; color: string; label?: string }[];
    size?: number;
    thickness?: number;
    labels?: boolean;
    center?: string;
    caption?: string;
    format?: (value: number) => string;
  } = $props();

  let hovered = $state<string | null>(null);
  // As fatias crescem ao aparecer e se transformam umas nas outras quando os valores mudam (troca de mês).
  // Animação própria (por id da fatia): fatias novas nascem do zero, as que saem encolhem até sumir.
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let shown = $state<Record<string, number>>({});
  let frame = 0;
  let last = '';
  $effect(() => {
    const target = Object.fromEntries(slices.map((x) => [x.id, Math.max(0, x.value)]));
    const key = JSON.stringify(target);
    if (key === last) return;
    last = key;
    untrack(() => {
      cancelAnimationFrame(frame);
      const from = { ...shown };
      if (reduce) return void (shown = target);
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / 750);
        const k = cubicOut(t);
        const ids = new Set([...Object.keys(from), ...Object.keys(target)]);
        shown = Object.fromEntries([...ids].map((id) => [id, (from[id] ?? 0) + ((target[id] ?? 0) - (from[id] ?? 0)) * k]));
        if (t < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    });
  });
  onDestroy(() => cancelAnimationFrame(frame));
  const values = $derived(slices.map((x) => shown[x.id] ?? 0));
  const goal = $derived(slices.reduce((s, x) => s + Math.max(0, x.value), 0));
  const total = $derived(Math.max(goal, values.reduce((a, b) => a + b, 0)));
  const arcs = $derived.by(() => {
    const r = 50;
    const inner = r * (1 - thickness);
    const visible = slices.map((slice, i) => ({ ...slice, value: values[i] })).filter((s) => s.value > 0);
    const gap = visible.length > 1 ? 0.014 : 0;
    let angle = -Math.PI / 2;
    return visible.map((slice) => {
      const share = slice.value / (total || 1);
      const real = slices.find((x) => x.id === slice.id)!.value;
      const sweep = share * Math.PI * 2;
      const a0 = angle + gap;
      const a1 = Math.max(a0 + 0.002, angle + sweep - gap);
      angle += sweep;
      const large = a1 - a0 > Math.PI ? 1 : 0;
      const p = (a: number, radius: number) => `${(50 + radius * Math.cos(a)).toFixed(2)} ${(50 + radius * Math.sin(a)).toFixed(2)}`;
      const path = share >= 0.999
        ? `M ${p(0, r)} A ${r} ${r} 0 1 1 ${p(Math.PI, r)} A ${r} ${r} 0 1 1 ${p(0, r)} M ${p(0, inner)} A ${inner} ${inner} 0 1 0 ${p(Math.PI, inner)} A ${inner} ${inner} 0 1 0 ${p(0, inner)} Z`
        : `M ${p(a0, r)} A ${r} ${r} 0 ${large} 1 ${p(a1, r)} L ${p(a1, inner)} A ${inner} ${inner} 0 ${large} 0 ${p(a0, inner)} Z`;
      const mid = (a0 + a1) / 2;
      return { ...slice, value: real, share: real / (goal || 1), path, labelAt: p(mid, (r + inner) / 2).split(' ').map(Number) };
    });
  });
  const focus = $derived(arcs.find((a) => a.id === hovered));
</script>

<div class="donut" style:width="{size}px" style:height="{size}px">
  <svg viewBox="-5 -5 110 110" width={size} height={size} role="img" aria-label={caption || 'Gráfico de rosca'} onpointerleave={() => (hovered = null)}>
    {#each arcs as arc (arc.id)}
      <path d={arc.path} fill={arc.color} fill-rule="evenodd" opacity={hovered && hovered !== arc.id ? 0.35 : 1}
        transform={hovered === arc.id ? `translate(${((arc.labelAt[0] - 50) * 0.05).toFixed(2)} ${((arc.labelAt[1] - 50) * 0.05).toFixed(2)})` : ''}
        role="button" tabindex="0" aria-label="{arc.label ?? arc.id}: {format(arc.value)} ({percent(arc.share)})"
        onpointerenter={(e) => { if (e.pointerType === 'mouse') hovered = arc.id; }} onfocus={() => (hovered = arc.id)} onblur={() => (hovered = null)} />
      {#if labels && arc.share >= 0.08 && !hovered}
        <text x={arc.labelAt[0]} y={arc.labelAt[1]} text-anchor="middle" dominant-baseline="central" font-size="5" font-weight="700" fill="#fff" pointer-events="none">{percent(arc.share)}</text>
      {/if}
    {/each}
  </svg>
  <div class="center" aria-hidden="true">
    {#if focus}
      <span class="name ellipsis">{focus.label ?? ''}</span><b>{format(focus.value)}</b><span class="name">{percent(focus.share)}</span>
    {:else if center}
      {#if caption}<span class="name">{caption}</span>{/if}<b>{center}</b>
    {/if}
  </div>
</div>

<style>
  .donut { position: relative; flex: none; container-type: inline-size; }
  path { transition: opacity 0.2s, transform 0.2s var(--ease); outline: none; }
  svg { filter: drop-shadow(0 0 10px rgba(43, 212, 164, 0.12)); }
  .center { position: absolute; inset: 20%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; pointer-events: none; line-height: 1.15; gap: 2px; }
  .center b { font: 600 clamp(12px, 9cqw, 24px) var(--font-display); }
  .name { font-size: clamp(10px, 5.2cqw, 12.5px); color: var(--text-2); max-width: 100%; }
</style>
