<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import Icon from './Icon.svelte';
  import { hint } from './hint';
</script>

{#if store.workspacesEnabled && store.workspaces.length}
  <div class="scroll-x" role="tablist" aria-label="Área de trabalho">
    <button class="ws" class:on={!store.scopeId} style:--c="#E8F5EF" onclick={() => store.setWorkspace('')} use:hint={['Tudo', 'Junta todas as áreas: contas e gastos de todo mundo.']}>
      <Icon name="layers" size={13} stroke={2.5} />Tudo
    </button>
    {#each store.workspaces.toSorted((a, b) => a.sort_order - b.sort_order) as workspace (workspace.id)}
      <button class="ws" class:on={store.scopeId === workspace.id} style:--c={workspace.color} onclick={() => store.setWorkspace(workspace.id)} use:hint={[workspace.name, 'Mostra só as contas desta área. O que você criar aqui fica nela.']}>
        <Icon name={workspace.symbol} size={13} stroke={2.5} />{workspace.name}
      </button>
    {/each}
  </div>
{/if}

<style>
  .ws {
    display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 14px; border-radius: 999px; white-space: nowrap;
    font-weight: 600; font-size: 15px; color: var(--c); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent);
    background: color-mix(in srgb, var(--c) 12%, transparent); transition: background 0.25s, color 0.25s;
  }
  .ws.on { background: var(--c); color: rgba(0, 0, 0, 0.85); border-color: transparent; }
</style>
