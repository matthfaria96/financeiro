<script lang="ts">
  import Icon from './Icon.svelte';
  import { hint } from './hint';
  /** Botão só de ícone no canto do cartão (ajuste manual etc.): discreto, mas sempre no mesmo lugar. */
  let { icon = 'pencil', label, detail, onclick }: { icon?: string; label: string; detail: string; onclick: () => void } = $props();
</script>

<button class="corner" aria-label={label} {onclick} use:hint={[label, detail]}><Icon name={icon} size={15} stroke={2.1} /></button>

<style>
  .corner { width: 34px; height: 34px; flex: none; display: grid; place-items: center; border-radius: 11px; border: 1px solid var(--stroke-strong); background: rgba(255, 255, 255, 0.05);
    color: var(--text-2); transition: background 0.2s, color 0.2s, border-color 0.2s, transform 0.2s var(--spring); }
  .corner:hover { color: var(--accent); background: var(--accent-soft); border-color: rgba(43, 212, 164, 0.35); }
  .corner:active { transform: scale(0.9); }
</style>
