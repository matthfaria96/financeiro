<script lang="ts">
  import type { Snippet } from 'svelte';
  let { title, children }: { title: string; children?: Snippet } = $props();
</script>

<div class="section-title">
  <h2>{title}</h2>
  {#if children}<div>{@render children()}</div>{/if}
</div>
