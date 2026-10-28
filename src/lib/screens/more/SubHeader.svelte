<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from '$lib/ui/Icon.svelte';
  let { title, children }: { title: string; children?: Snippet } = $props();
</script>

<header class="row between">
  <span class="row" style="gap: 10px; min-width: 0"><a class="icon-btn" href="#/mais" aria-label="Voltar"><Icon name="chevron-left" /></a><h1 class="ellipsis">{title}</h1></span>
  {#if children}<div class="row" style="gap: 8px">{@render children()}</div>{/if}
</header>

<style>
  h1 { margin: 6px 0; font: 700 26px var(--font-display); letter-spacing: -0.02em; }
</style>
