<script lang="ts">
  import Icon from './Icon.svelte';
  /** "Configurar" discreto no pé da tela (Início, Notas): quase some, mas está sempre no mesmo lugar. */
  let { onclick, label = 'Configurar' }: { onclick: () => void; label?: string } = $props();
</script>

<button class="configure" {onclick}><Icon name="settings" size={14} />{label}</button>

<style>
  .configure { align-self: center; display: inline-flex; align-items: center; gap: 6px; margin-top: 14px; padding: 7px 14px; border: 0; border-radius: 999px; background: none;
    font-size: 13.5px; font-weight: 500; color: var(--text-3); transition: color 0.2s, background 0.2s, transform 0.2s var(--spring); }
  .configure:hover { color: var(--text-2); background: rgba(255, 255, 255, 0.05); }
  .configure:active { transform: scale(0.95); }
</style>
