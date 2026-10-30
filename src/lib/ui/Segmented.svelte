<script lang="ts" generics="T">
  import { untrack } from 'svelte';
  import { haptic } from '$lib/features/pwa.svelte';
  import Icon from './Icon.svelte';
  /** Controle segmentado do iOS: a pastilha desliza até a opção escolhida. `icon`/`color` opcionais (ex.: Saída/Entrada). */
  let { options, value = $bindable(), label, onchange }: { options: { value: T; label: string; icon?: string; color?: string }[]; value: T; label: string; onchange?: (value: T) => void } = $props();
  let buttons = $state<HTMLButtonElement[]>([]);
  let width = $state(0);
  let thumb = $state<{ x: number; w: number } | null>(null);
  let ready = $state(false);
  $effect(() => {
    void width;
    const el = buttons[options.findIndex((o) => o.value === value)];
    const next = el ? { x: el.offsetLeft, w: el.offsetWidth } : null;
    untrack(() => {
      if (next?.x !== thumb?.x || next?.w !== thumb?.w) thumb = next;
      // A primeira posição aparece sem animar; depois, desliza.
      if (next && !ready) requestAnimationFrame(() => (ready = true));
    });
  });
</script>

<div class="seg" role="radiogroup" aria-label={label} bind:clientWidth={width}>
  {#if thumb}<span class="thumb" class:ready style:--c={options.find((o) => o.value === value)?.color} style:width="{thumb.w}px" style:transform="translateX({thumb.x}px)" aria-hidden="true"></span>{/if}
  {#each options as option, i (String(option.value))}
    <button bind:this={buttons[i]} type="button" role="radio" aria-checked={value === option.value} class:on={value === option.value} onclick={() => { if (value !== option.value) haptic(); value = option.value; onchange?.(option.value); }}>{#if option.icon}<span class="ico" style:color={option.color}><Icon name={option.icon} size={15} /></span>{/if}{option.label}</button>
  {/each}
</div>

<style>
  .seg { position: relative; display: flex; padding: 3px; gap: 2px; border-radius: 12px; background: rgba(255, 255, 255, 0.07); border: 1px solid var(--stroke); isolation: isolate; }
  .thumb { position: absolute; left: 0; top: 3px; bottom: 3px; z-index: -1; border-radius: 9px; background: rgba(255, 255, 255, 0.15); box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08); }
  .thumb.ready { transition: transform 0.42s cubic-bezier(0.22, 1, 0.36, 1), width 0.42s cubic-bezier(0.22, 1, 0.36, 1); }
  .seg button { flex: 1; border: 0; background: none; padding: 7px 10px; border-radius: 9px; font-size: 14px; font-weight: 600; color: var(--text-2); white-space: nowrap; transition: color 0.25s; }
  .seg button:hover:not(.on) { color: var(--text); }
  .seg button.on { color: var(--text); }
  .seg button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
  .ico { display: inline-flex; opacity: 0.7; transition: opacity 0.25s; }
  .on .ico { opacity: 1; }
  .thumb[style*='--c'] { background: color-mix(in srgb, var(--c) 20%, rgba(255, 255, 255, 0.08)); box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3), 0 0 14px color-mix(in srgb, var(--c) 22%, transparent), inset 0 1px 0 rgba(255, 255, 255, 0.08); }
</style>
