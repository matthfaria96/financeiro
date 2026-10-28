<script lang="ts">
  /** Balão do gráfico: valor em destaque, nome da série depois (com um traço da cor da série). */
  let { x, y, title, rows, width }: { x: number; y: number; title: string; rows: { color: string; name: string; value: string }[]; width: number } = $props();
  const flip = $derived(x > width - 190);
</script>

<div class="tip" style:left="{x}px" style:top="{y}px" class:flip role="status">
  <div class="title">{title}</div>
  {#each rows as row, i (i)}<div class="line"><i style:background={row.color}></i><b>{row.value}</b><span>{row.name}</span></div>{/each}
</div>

<style>
  .tip { position: absolute; z-index: 5; pointer-events: none; transform: translate(12px, -50%); min-width: 150px; padding: 9px 11px; border-radius: 12px;
    background: rgba(28, 36, 33, 0.94); border: 1px solid rgba(255, 255, 255, 0.12); box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); display: flex; flex-direction: column; gap: 4px; font-size: 12.5px; }
  .tip.flip { transform: translate(calc(-100% - 12px), -50%); }
  .title { color: var(--text-2); font-weight: 600; margin-bottom: 1px; }
  .line { display: flex; align-items: center; gap: 7px; white-space: nowrap; }
  .line i { width: 12px; height: 3px; border-radius: 2px; flex: none; }
  .line b { font-variant-numeric: tabular-nums; color: var(--text); }
  .line span { color: var(--text-2); }
</style>
