<script lang="ts">
  import Icon from './Icon.svelte';
  let { symbol, color, size = 36 }: { symbol: string; color: string; size?: number } = $props();
</script>

<span class="ci" style:width="{size}px" style:height="{size}px" style:color={color} style:border-radius="{size * 0.3}px" style:background="color-mix(in srgb, {color} 16%, transparent)" aria-hidden="true">
  <Icon name={symbol} size={size * 0.48} />
</span>

<style>
  .ci { display: inline-grid; place-items: center; flex: none; }
</style>
