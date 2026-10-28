<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import { bankInfo, bankList, type Bank } from '$lib/core/banks';
  import { hint } from '$lib/ui/hint';

  // Onde achar o arquivo em cada banco e qual formato preferir. Os bancos das contas cadastradas vêm primeiro.
  const mine = $derived([...new Set(store.accounts.filter((a) => !a.archived && a.kind !== 'cash').map((a) => bankInfo(a.bank).id))]);
  const ordered = $derived([...mine.map(bankInfo), ...bankList.filter((b) => !mine.includes(b.id))]);
  let picked = $state<Bank | null>(null);
  const selected = $derived(bankInfo(picked ?? ordered[0]?.id ?? 'nubank'));
</script>

<div class="stack-sm guide">
  <div class="scroll-x" role="tablist" aria-label="Banco">
    {#each ordered as b (b.id)}
      <button class="chip" class:active={selected.id === b.id} role="tab" aria-selected={selected.id === b.id} onclick={() => (picked = b.id)}
        use:hint={[b.name, 'Mostra onde exportar o extrato e a fatura deste banco.']}>
        <span class="dot" style:background="linear-gradient(135deg, {b.colors[0]}, {b.colors[1]})"></span>{b.name}</button>
    {/each}
  </div>
  <div class="row step"><span class="badge">Conta</span><span class="small">{selected.checking}</span></div>
  <div class="row step"><span class="badge">Cartão</span><span class="small">{selected.card}</span></div>
  <p class="caption">Prefira OFX (às vezes chamado “Money”): traz um código único por lançamento e o saldo da conta, então reimportar nunca duplica. CSV funciona igual; planilha do Excel, salve como CSV. PDF é lido por aproximação e pede conferência. Os menus mudam com as versões dos apps: se não achar, procure “Exportar”, “Salvar” ou “Compartilhar” no extrato.</p>
</div>

<style>
  .dot { width: 12px; height: 12px; border-radius: 4px; flex: none; }
  .step { align-items: flex-start; gap: 10px; }
  .badge { flex: none; width: 58px; text-align: center; font-size: 12px; font-weight: 700; padding: 3px 0; border-radius: 7px; background: var(--card-2); border: 1px solid var(--stroke); color: var(--text-2); }
  .guide p { margin: 4px 0 0; }
</style>
