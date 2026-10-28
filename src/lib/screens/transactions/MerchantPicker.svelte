<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import { fold } from '$lib/core/text';
  import Sheet from '$lib/ui/Sheet.svelte';
  import Avatar from '$lib/ui/Avatar.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import MerchantEditor from '../merchants/MerchantEditor.svelte';
  import type { Merchant } from '$lib/data/types';

  /** "Quem é este lançamento?": escolher um estabelecimento existente ou criar um novo. */
  let { open = $bindable(), suggestedName, suggestedPattern, onpick }: { open: boolean; suggestedName: string; suggestedPattern: string; onpick: (merchant: Merchant | null) => void } = $props();
  let search = $state('');
  let creating = $state(false);
  const list = $derived(store.merchants.filter((m) => !search || fold(`${m.name} ${m.patterns}`).includes(fold(search))).toSorted((a, b) => a.name.localeCompare(b.name)));
  function pick(merchant: Merchant | null) {
    onpick(merchant);
    open = false;
  }
</script>

<Sheet bind:open title="Quem é?">
  <div class="stack-sm" style="padding-top: 8px">
    <input class="input" placeholder="Buscar estabelecimento" bind:value={search} />
    <button class="opt accent" onclick={() => (creating = true)}><Icon name="plus" size={18} />Criar “{suggestedName}”</button>
    <button class="opt" onclick={() => pick(null)}><Icon name="ban" size={18} />Nenhum (usar o ícone da categoria)</button>
    <div class="card flush list">
      {#each list as merchant (merchant.id)}
        <button class="list-row" onclick={() => pick(merchant)}>
          <Avatar {merchant} category={store.categoryById.get(merchant.category_id ?? '') ?? null} size={36} />
          <span class="grow ellipsis">{merchant.name}</span>
        </button>
      {/each}
    </div>
  </div>
</Sheet>

<MerchantEditor bind:open={creating} merchant={null} {suggestedName} {suggestedPattern} onsaved={(m) => pick(m)} />

<style>
  .opt { display: flex; align-items: center; gap: 10px; padding: 12px; border-radius: 14px; border: 1px solid var(--stroke); background: var(--card); text-align: left; }
  .opt.accent { color: var(--accent); }
</style>
