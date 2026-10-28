<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from '$lib/ui/Icon.svelte';
  let { title, children, back = '#/mais' }: { title: string; children?: Snippet; back?: string } = $props();
</script>

<header class="row between">
  <span class="row" style="gap: 10px; min-width: 0"><a class="icon-btn back" class:menu={back === '#/mais'} href={back} aria-label="Voltar"><Icon name="chevron-left" /></a><h1 class="ellipsis">{title}</h1></span>
  {#if children}<div class="row" style="gap: 8px">{@render children()}</div>{/if}
</header>

<style>
  /* No computador, as telas de Mais estão no menu lateral: a seta de voltar para Mais sobra. */
  @media (min-width: 960px) { .back.menu { display: none; } h1 { font-size: 30px; } }
  h1 { margin: 6px 0; font: 700 26px var(--font-display); letter-spacing: -0.02em; }
</style>
