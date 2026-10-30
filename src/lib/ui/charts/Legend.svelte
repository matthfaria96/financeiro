<script lang="ts">
  /** Legenda (sempre que há 2 séries ou mais). `line` para linhas, retângulo para barras e áreas. */
  let { items, line = false }: { items: { name: string; color: string }[]; line?: boolean } = $props();
</script>

<div class="legend">{#each items as item (item.name)}<span><i class:line style:background={item.color}></i>{item.name}</span>{/each}</div>

<style>
  .legend { display: flex; flex-wrap: wrap; gap: 4px 16px; font-size: 12.5px; color: var(--text-2); }
  .legend span { display: inline-flex; align-items: center; gap: 7px; }
  .legend i { width: 9px; height: 9px; border-radius: 50%; }
  .legend i.line { width: 14px; height: 3px; border-radius: 2px; }
</style>
