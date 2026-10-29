<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import { ui } from '$lib/ui/ui.svelte';
  /** `back` é só o destino de reserva: quem chegou navegando volta para a tela de onde veio. */
  let { title, children, back = '#/mais', top = false }: { title: string; children?: Snippet; back?: string; top?: boolean } = $props();
  function goBack(event: MouseEvent) {
    if (!ui.navigations || event.metaKey || event.ctrlKey) return;
    event.preventDefault();
    history.back();
  }
</script>

<header class="row between">
  <span class="row" style="gap: 10px; min-width: 0"><a class="icon-btn back" class:menu={top} href={back} aria-label="Voltar" onclick={goBack}><Icon name="chevron-left" /></a><h1 class="ellipsis">{title}</h1></span>
  {#if children}<div class="row" style="gap: 8px">{@render children()}</div>{/if}
</header>

<style>
  /* `top`: tela que já está no menu lateral; no computador a seta de voltar sobra. */
  @media (min-width: 960px) { .back.menu { display: none; } h1 { font-size: 30px; } }
  h1 { margin: 6px 0; font: 700 26px var(--font-display); letter-spacing: -0.02em; }
</style>
