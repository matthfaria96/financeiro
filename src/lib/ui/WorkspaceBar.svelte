<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import Icon from './Icon.svelte';
  import { hint } from './hint';
  import { ambients } from '$lib/features/ambient';

  /** Troca de ambiente (Pessoal / Empresa / Tudo). Some quando só existe um. `compact`: só no celular. */
  let { compact = true }: { compact?: boolean } = $props();
  const list = $derived(ambients());
</script>

{#if list.length > 1}
  <div class="switch" class:compact role="tablist" aria-label="Ambiente">
    {#each list as w (w.id)}
      <button class:on={store.scopeId === w.id} style:--c={w.color} role="tab" aria-selected={store.scopeId === w.id} onclick={() => store.setWorkspace(w.id)}
        use:hint={[w.name, w.kind === 'business' ? 'Só as contas e os gastos da empresa.' : 'Só as suas contas pessoais.']}><Icon name={w.symbol} size={14} stroke={2.4} /><span class="ellipsis">{w.name}</span></button>
    {/each}
    <button class:on={!store.scopeId} style:--c="#E8F5EF" role="tab" aria-selected={!store.scopeId} onclick={() => store.setWorkspace('')} use:hint={['Tudo', 'Todos os ambientes juntos.']}><Icon name="layers" size={14} stroke={2.4} /><span>Tudo</span></button>
  </div>
{/if}

<style>
  .switch { display: flex; gap: 4px; padding: 3px; border-radius: 13px; background: rgba(255, 255, 255, 0.06); border: 1px solid var(--stroke); min-width: 0; }
  .switch button { flex: 1; min-width: 0; display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 32px; padding: 0 10px; border: 0; border-radius: 10px; background: none; color: var(--text-2); font-size: 13.5px; font-weight: 600; white-space: nowrap; transition: background 0.2s, color 0.2s; }
  .switch button.on { color: #04140e; background: var(--c); }
  @media (min-width: 960px) { .switch.compact { display: none; } }
</style>
