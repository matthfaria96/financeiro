<script lang="ts">
  import Icon from '$lib/ui/Icon.svelte';
  import { hint } from '$lib/ui/hint';
  let { href, title, detail, icon, color, count = null }: { href: string; title: string; detail: string; icon: string; color: string; count?: number | null } = $props();
</script>

<a class="list-row" {href} use:hint={[title, detail]}>
  <span class="tile" style:background="linear-gradient(160deg, {color}, color-mix(in srgb, {color} 70%, black))"><Icon name={icon} size={17} color="#fff" stroke={2.2} /></span>
  <span class="grow stack-sm" style="gap: 1px; min-width: 0"><span>{title}</span><span class="caption ellipsis">{detail}</span></span>
  {#if count !== null}<span class="muted num">{count}</span>{/if}
  <Icon name="chevron-right" size={15} class="faint" />
</a>

<style>
  .tile { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; flex: none; }
</style>
