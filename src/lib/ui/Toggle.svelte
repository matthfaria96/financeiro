<script lang="ts">
  let { checked = $bindable(), label, onchange }: { checked: boolean; label: string; onchange?: (checked: boolean) => void } = $props();
</script>

<button type="button" role="switch" aria-checked={checked} aria-label={label} class="toggle" class:on={checked} onclick={() => { checked = !checked; onchange?.(checked); }}>
  <span></span>
</button>

<style>
  .toggle { width: 51px; height: 31px; border-radius: 999px; border: 0; padding: 2px; background: rgba(255, 255, 255, 0.16); transition: background 0.25s; flex: none; }
  .toggle span { display: block; width: 27px; height: 27px; border-radius: 50%; background: #fff; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3); transition: transform 0.3s var(--ease); }
  .toggle.on { background: var(--accent); }
  .toggle.on span { transform: translateX(20px); }
</style>
