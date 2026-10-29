<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import { money } from '$lib/core/money';
  import Sheet from '$lib/ui/Sheet.svelte';
  import Toggle from '$lib/ui/Toggle.svelte';
  import BankCard from '$lib/ui/BankCard.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import { ui } from '$lib/ui/ui.svelte';
  import { balanceOf, inScopeAccount } from '$lib/features/model';

  /** Configurar o Início: quais contas, investimentos e dinheiro entram no Saldo (vale para a casa toda). */
  let { open = $bindable() }: { open: boolean } = $props();
  const accounts = $derived(store.accounts.filter((a) => !a.archived && inScopeAccount(a)).toSorted((a, b) => a.sort_order - b.sort_order));
  const hidden = $derived(store.household?.settings.home_hidden ?? []);

  function set(id: string, visible: boolean) {
    const next = visible ? hidden.filter((h) => h !== id) : [...new Set([...hidden, id])];
    void store.updateSettings({ home_hidden: next });
  }
</script>

<Sheet bind:open title="Configurações do Início">
  <p class="muted small intro">Escolha o que aparece no Saldo financeiro. Esconder não apaga nada.</p>
  <div class="form-group">
    {#each accounts as account (account.id)}
      {@const visible = !hidden.includes(account.id)}
      <div class="form-row">
        <BankCard {account} width={40} />
        <span class="grow"><span class="block">{account.name}</span><span class="caption">{account.kind === 'creditCard' ? `Cartão · ${money(Math.max(0, -balanceOf(account)))} em aberto` : money(balanceOf(account))}</span></span>
        <Toggle label="Mostrar {account.name}" checked={visible} onchange={(v) => set(account.id, v)} />
      </div>
    {:else}
      <div class="form-row muted small">Nenhuma conta cadastrada.</div>
    {/each}
  </div>
  <div class="row between links">
    <button class="btn ghost" onclick={() => { open = false; ui.newAccountOpen = true; }}><Icon name="plus" size={15} />Cadastrar conta ou dinheiro</button>
    <a class="btn ghost muted-link" href="#/mais" onclick={() => (open = false)}>Configurações gerais</a>
  </div>
</Sheet>

<style>
  .intro { margin: 12px 4px; }
  .block { display: block; }
  .links { margin-top: 10px; flex-wrap: wrap; }
  .muted-link { color: var(--text-2); }
</style>
