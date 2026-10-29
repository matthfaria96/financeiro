<script lang="ts" generics="T">
  let { options, value = $bindable(), label, onchange }: { options: { value: T; label: string }[]; value: T; label: string; onchange?: (value: T) => void } = $props();
</script>

<div class="seg" role="radiogroup" aria-label={label}>
  {#each options as option (String(option.value))}
    <button type="button" role="radio" aria-checked={value === option.value} class:on={value === option.value} onclick={() => { value = option.value; onchange?.(option.value); }}>{option.label}</button>
  {/each}
</div>

<style>
  .seg { display: flex; padding: 3px; gap: 2px; border-radius: 12px; background: rgba(255, 255, 255, 0.07); border: 1px solid var(--stroke); }
  .seg button { flex: 1; border: 0; background: none; padding: 7px 10px; border-radius: 9px; font-size: 14px; font-weight: 600; color: var(--text-2); white-space: nowrap; transition: background 0.25s var(--ease), color 0.2s; }
  .seg button.on { background: rgba(255, 255, 255, 0.14); color: var(--text); box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3); }
</style>
