<script lang="ts">
  import Icon from './Icon.svelte';
  import { hint } from './hint';
  import { haptic } from '$lib/features/pwa.svelte';

  /**
   * Botão flutuante "+" (Lançamentos, Notas): vidro verde fixo no canto, com um brilho que pulsa de leve
   * para mostrar que ele está ali. Acompanha a barra de abas quando ela encolhe ou some.
   */
  let { label, detail, onclick }: { label: string; detail: string; onclick: () => void } = $props();
</script>

<button class="fab" aria-label={label} onclick={() => { haptic(); onclick(); }} use:hint={[label, detail]}><Icon name="plus" size={24} stroke={2.4} /></button>

<style>
  .fab { position: fixed; z-index: 45; right: 22px; bottom: calc(96px + env(safe-area-inset-bottom)); width: 58px; height: 58px; border-radius: 50%; display: grid; place-items: center;
    color: #d4fff0; border: 1px solid rgba(120, 255, 210, 0.35);
    background: radial-gradient(circle at 30% 25%, rgba(70, 230, 180, 0.55), rgba(20, 120, 90, 0.55) 70%);
    backdrop-filter: blur(22px) saturate(1.8); -webkit-backdrop-filter: blur(22px) saturate(1.8);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 14px 36px rgba(0, 0, 0, 0.45), 0 0 22px rgba(43, 212, 164, 0.35);
    animation: fab-in 0.5s var(--spring) 0.2s backwards, glow 3.2s ease-in-out 1s infinite;
    transition: bottom 0.42s cubic-bezier(0.22, 1, 0.36, 1), transform 0.25s var(--spring), filter 0.2s; }
  /* Anel que se expande e some, de tempos em tempos: chama o olho sem incomodar. */
  .fab::after { content: ''; position: absolute; inset: -1px; border-radius: 50%; border: 2px solid rgba(43, 212, 164, 0.6); opacity: 0; animation: ring 3.2s ease-out 1s infinite; pointer-events: none; }
  .fab:hover { transform: translateY(-2px) scale(1.05); filter: brightness(1.15); }
  .fab:active { transform: scale(0.92); }
  @keyframes fab-in { from { opacity: 0; transform: scale(0.6) translateY(12px); } }
  @keyframes glow { 0%, 100% { box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 14px 36px rgba(0, 0, 0, 0.45), 0 0 18px rgba(43, 212, 164, 0.28); } 50% { box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 14px 36px rgba(0, 0, 0, 0.45), 0 0 32px rgba(43, 212, 164, 0.55); } }
  @keyframes ring { 0% { opacity: 0.7; transform: scale(1); } 45%, 100% { opacity: 0; transform: scale(1.5); } }
  @media (max-width: 959px) {
    :global(html.bar-compact) .fab { bottom: calc(70px + env(safe-area-inset-bottom)); }
    :global(html.bar-gone) .fab { bottom: calc(18px + env(safe-area-inset-bottom)); }
  }
  @media (min-width: 960px) { .fab { right: 32px; bottom: 32px; width: 60px; height: 60px; } }
  @media (prefers-reduced-motion: reduce) { .fab, .fab::after { animation: none; } }
</style>
