<script lang="ts">
  import Icon from './Icon.svelte';
  import { hint } from './hint';
  /** Mini botão no canto de um cartão: abre a análise com gráficos (ou outro atalho). */
  let { onclick, icon = 'reports', label = 'Ver gráfico', detail = 'Abre a análise com gráficos.' }: { onclick: () => void; icon?: string; label?: string; detail?: string } = $props();
</script>

<button class="mini" {onclick} aria-label={label} use:hint={[label, detail]}><Icon name={icon} size={15} stroke={2.2} /></button>

<style>
  .mini { width: 32px; height: 32px; border-radius: 10px; display: grid; place-items: center; flex: none; border: 1px solid var(--stroke-strong); background: rgba(255, 255, 255, 0.06); color: var(--text-2); transition: background 0.2s, color 0.2s, border-color 0.2s, transform 0.2s cubic-bezier(0.22, 1, 0.36, 1); }
  .mini:active { transform: scale(0.9); }
  .mini:hover { background: var(--accent-soft); color: var(--accent); border-color: rgba(43, 212, 164, 0.35); }
</style>
