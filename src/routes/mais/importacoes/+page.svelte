<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import { shortDate } from '$lib/core/dates';
  import Icon from '$lib/ui/Icon.svelte';
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
  {#each batches as batch (batch.id)}
    <div class="card stack-sm">
      <b class="row ellipsis" style="gap: 8px"><Icon name="file" size={16} color="var(--accent)" />{batch.file_name}</b>
      <span class="caption">{batch.summary}</span>
      <span class="caption">{shortDate(batch.imported_at.slice(0, 10))} · {store.accountById.get(batch.account_id ?? '')?.name ?? 'conta apagada'} · {count(batch.id)} lançamentos</span>
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

<MoveSheet bind:open={moveOpen} ids={store.entries.filter((e) => e.batch_id === moving && !e.is_mirror).map((e) => e.id)} title="Mover importação" ondone={() => {}} />
