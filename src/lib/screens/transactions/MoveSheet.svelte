<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import Sheet from '$lib/ui/Sheet.svelte';
  import BankCard from '$lib/ui/BankCard.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import { moveEntries } from '$lib/features/imports.svelte';
  import { inScopeAccount } from '$lib/features/model';

  /** Mover lançamentos (ou uma importação inteira) para outra conta, com resumo antes e resultado depois. */
  let { open = $bindable(), ids, title = 'Mover para outra conta', ondone }: { open: boolean; ids: string[]; title?: string; ondone?: () => void } = $props();
  let destination = $state<string | null>(null);
  let result = $state<{ moved: number; removed: number } | null>(null);
  let busy = $state(false);

  $effect(() => {
    if (open) {
      destination = null;
      result = null;
    }
  });

  const entries = $derived(store.entries.filter((e) => ids.includes(e.id) && !e.is_mirror));
  const sources = $derived(new Set(entries.map((e) => e.account_id)));
  const duplicates = $derived.by(() => {
    if (!destination) return 0;
    const keys = new Set((store.entriesByAccount.get(destination) ?? []).map((e) => e.import_key));
    return entries.filter((e) => e.import_key && keys.has(e.import_key)).length;
  });

  async function move() {
    if (!destination) return;
    busy = true;
    result = await moveEntries(entries.map((e) => e.id), destination);
    busy = false;
    store.toast(`${result.moved} lançamentos movidos.`);
    ondone?.();
  }
</script>

<Sheet bind:open {title}>
  {#snippet actions()}
    {#if !result}<button class="btn primary" disabled={!destination || busy} onclick={move}>Mover</button>{/if}
  {/snippet}
  {#if result}
    <div class="stack" style="padding-top: 12px">
      <b class="pos row" style="gap: 8px"><Icon name="check-circle" size={20} />{result.moved} lançamentos movidos para {store.accountById.get(destination ?? '')?.name}</b>
      {#if result.removed}<p class="muted small">{result.removed} já existiam lá e saíram da conta antiga (sem duplicar).</p>{/if}
      <p class="muted small">Os saldos das duas contas já consideram a mudança.</p>
      <button class="btn primary" onclick={() => (open = false)}>Concluir</button>
    </div>
  {:else}
    <div class="form-title">{entries.length} lançamentos · estão em {[...sources].map((id) => store.accountById.get(id)?.name).join(', ')}</div>
    <div class="stack-sm">
      {#each store.accounts.filter((a) => !sources.has(a.id) && !a.archived && a.kind !== 'savings' && inScopeAccount(a)) as account (account.id)}
        <button class="option" class:on={destination === account.id} onclick={() => (destination = account.id)}>
          <BankCard {account} width={52} /><span class="grow">{account.name}</span><Icon name={destination === account.id ? 'check-circle' : 'circle'} size={22} />
        </button>
      {/each}
    </div>
    {#if destination}<p class="small" class:warn={duplicates > 0} class:muted={!duplicates} style="margin: 12px 4px">{duplicates ? `${duplicates} já existem no destino: saem da conta antiga em vez de duplicar.` : 'Nenhum destes lançamentos existe no destino.'}</p>{/if}
  {/if}
</Sheet>

<style>
  .option { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 14px; border: 1px solid var(--stroke); background: var(--card); text-align: left; color: var(--text-3); }
  .option .grow { color: var(--text); }
  .option.on { background: var(--accent-soft); border-color: rgba(43, 212, 164, 0.5); color: var(--accent); }
</style>
