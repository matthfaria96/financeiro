<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import { shortDate } from '$lib/core/dates';
  import Icon from '$lib/ui/Icon.svelte';
  import BankCard from '$lib/ui/BankCard.svelte';
  import { hint } from '$lib/ui/hint';
  import SubHeader from '$lib/screens/more/SubHeader.svelte';
  import MoveSheet from '$lib/screens/transactions/MoveSheet.svelte';
  import { undoImport } from '$lib/features/imports.svelte';

  let moving = $state<string | null>(null);
  let moveOpen = $state(false);
  let undoing = $state<string | null>(null);
  const batches = $derived(store.import_batches.toSorted((a, b) => b.imported_at.localeCompare(a.imported_at)));
  const count = (id: string) => store.entries.filter((e) => e.batch_id === id && !e.is_mirror).length;
</script>

<div class="page">
  <SubHeader title="Importações" />
  <div class="grid">
  {#each batches as batch (batch.id)}
    {@const account = store.accountById.get(batch.account_id ?? '')}
    {@const format = (batch.format || batch.file_name.split('.').pop() || '').toUpperCase()}
    <div class="card stack batch">
      <div class="row" style="gap: 14px">
        {#if account}<BankCard {account} width={92} />{:else}<span class="nocard"><Icon name="file" size={22} /></span>{/if}
        <div class="grow" style="min-width: 0">
          <b class="row ellipsis" style="gap: 8px"><span class="fmt" class:ofx={format === 'OFX'} class:pdf={format === 'PDF'}>{format}</span><span class="ellipsis">{batch.file_name}</span></b>
          <div class="caption ellipsis">{account?.name ?? 'Conta apagada'} · importado em {shortDate(batch.imported_at.slice(0, 10))}</div>
          <div class="caption">{batch.first_date ? `${shortDate(batch.first_date)} a ${shortDate(batch.last_date ?? batch.first_date)}` : ''}</div>
        </div>
      </div>
      <div class="row nums">
        <div><span class="caption">Lançamentos</span><b class="num">{count(batch.id)}</b></div>
        <div><span class="caption">Repetidos ignorados</span><b class="num">{batch.skipped_count}</b></div>
      </div>
      {#if undoing === batch.id}
        <div class="row" style="gap: 8px"><span class="grow small neg">Apagar os {count(batch.id)} lançamentos deste arquivo? O saldo volta ao de antes.</span><button class="btn" onclick={() => (undoing = null)}>Cancelar</button><button class="btn danger" onclick={async () => { await undoImport(batch.id); undoing = null; store.toast('Importação desfeita.'); }}>Desfazer</button></div>
      {:else}
        <div class="row" style="gap: 8px">
          <button class="btn" onclick={() => { moving = batch.id; moveOpen = true; }} use:hint={['Mover', 'Importou na conta errada? Passa tudo para a conta certa, sem duplicar.']}><Icon name="move" size={15} />Mover para outra conta</button>
          <button class="btn danger" onclick={() => (undoing = batch.id)} use:hint={['Desfazer', 'Apaga os lançamentos que vieram deste arquivo.']}><Icon name="history" size={15} />Desfazer</button>
        </div>
      {/if}
    </div>
  {:else}
    <div class="card small muted">Nada importado ainda. Os arquivos que você importar aparecem aqui.</div>
  {/each}
  </div>
</div>

<style>
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(420px, 100%), 1fr)); gap: 14px; }
  .batch { min-width: 0; }
  .batch :global(.row) { flex-wrap: wrap; }
  .nocard { width: 92px; height: 58px; border-radius: 9px; display: grid; place-items: center; background: rgba(255, 255, 255, 0.05); color: var(--text-3); flex: none; }
  .fmt { font-size: 10.5px; font-weight: 800; letter-spacing: 0.04em; padding: 2px 6px; border-radius: 5px; background: rgba(57, 135, 229, 0.18); color: #8fc0ff; flex: none; }
  .fmt.ofx { background: rgba(43, 212, 164, 0.16); color: var(--accent); }
  .fmt.pdf { background: rgba(255, 107, 91, 0.16); color: #ff9b8f; }
  .nums { gap: 24px; padding-top: 10px; border-top: 1px solid var(--stroke); }
  .nums > div { display: flex; flex-direction: column; gap: 2px; }
</style>

<MoveSheet bind:open={moveOpen} ids={store.entries.filter((e) => e.batch_id === moving && !e.is_mirror).map((e) => e.id)} title="Mover importação" ondone={() => {}} />
