<script lang="ts">
  import type { Notebook } from '$lib/data/organizerTypes';
  import Sheet from '$lib/ui/Sheet.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import { currentList, itemsOf, newList } from '$lib/features/shopping';

  /** "Gerar nova": manter os itens que repetem ou começar zerada. A lista atual vai para o histórico. */
  let { open = $bindable(), notebook }: { open: boolean; notebook: Notebook } = $props();
  const current = $derived(currentList(notebook));
  const items = $derived(current ? itemsOf(current) : []);
  const keepCount = $derived(items.filter((i) => i.repeat).length);
  const dropCount = $derived(items.length - keepCount);

  async function generate(keep: boolean) {
    await newList(notebook, keep);
    open = false;
  }
</script>

<Sheet bind:open title="Gerar nova lista">
  <p class="muted small intro">A lista atual vai para o histórico. Como quer começar a nova?</p>
  <div class="options">
    <button class="option card" onclick={() => generate(true)} disabled={!keepCount}>
      <span class="ico keep"><Icon name="refresh" size={20} /></span>
      <span class="grow"><b>Manter os itens</b><span class="caption">{keepCount} {keepCount === 1 ? 'item volta' : 'itens voltam'} desmarcados{dropCount ? ` · ${dropCount} que não ${dropCount === 1 ? 'repete fica' : 'repetem ficam'} de fora` : ''}</span></span>
    </button>
    <button class="option card" onclick={() => generate(false)}>
      <span class="ico"><Icon name="plus" size={20} /></span>
      <span class="grow"><b>Começar zerada</b><span class="caption">Uma lista vazia</span></span>
    </button>
  </div>
</Sheet>

<style>
  .intro { margin: 12px 4px; }
  .options { display: flex; flex-direction: column; gap: 10px; }
  .option { display: flex; align-items: center; gap: 14px; text-align: left; padding: 16px; }
  .option:hover { border-color: var(--stroke-strong); }
  .option:disabled { opacity: 0.45; }
  .option b { display: block; font-size: 16px; }
  .ico { width: 44px; height: 44px; border-radius: 13px; display: grid; place-items: center; flex: none; background: rgba(255, 255, 255, 0.07); color: var(--text-2); }
  .ico.keep { background: var(--accent-soft); color: var(--accent); }
</style>
