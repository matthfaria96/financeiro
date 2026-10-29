<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import { money } from '$lib/core/money';
  import { ui } from '$lib/ui/ui.svelte';
  import Toggle from '$lib/ui/Toggle.svelte';
  import BankCard from '$lib/ui/BankCard.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import SectionTitle from '$lib/ui/SectionTitle.svelte';
  import { hint } from '$lib/ui/hint';
  import SubHeader from '$lib/screens/more/SubHeader.svelte';
  import MoreRow from '$lib/screens/more/MoreRow.svelte';
  import { balanceOf, inScopeAccount } from '$lib/features/model';

  /** Configurar o Início: o que entra no Saldo, as contas e cartões e a previsão (vale para a casa toda). */
  const accounts = $derived(store.accounts.filter((a) => !a.archived && inScopeAccount(a)).toSorted((a, b) => a.sort_order - b.sort_order));
  const hidden = $derived(store.household?.settings.home_hidden ?? []);
  let months = $state(store.forecastMonths);
  $effect(() => {
    if (months >= 2 && months <= 12 && months !== store.forecastMonths) void store.updateSettings({ forecast_months: months });
  });

  function set(id: string, visible: boolean) {
    const next = visible ? hidden.filter((h) => h !== id) : [...new Set([...hidden, id])];
    void store.updateSettings({ home_hidden: next });
  }
</script>

<div class="page narrow">
  <SubHeader title="Configurar o Início" back="#/" />

  <SectionTitle title="Saldo financeiro" />
  <div class="form-group">
    {#each accounts as account (account.id)}
      <div class="form-row">
        <BankCard {account} width={40} />
        <span class="grow"><span class="block">{account.name}</span><span class="caption">{account.kind === 'creditCard' ? `Cartão · ${money(Math.max(0, -balanceOf(account)))} em aberto` : money(balanceOf(account))}</span></span>
        <Toggle label="Mostrar {account.name}" checked={!hidden.includes(account.id)} onchange={(v) => set(account.id, v)} />
      </div>
    {:else}
      <div class="form-row muted small">Nenhuma conta cadastrada.</div>
    {/each}
    <button class="form-row plain accent" onclick={() => (ui.newAccountOpen = true)}><Icon name="plus" size={16} />Cadastrar conta, cartão ou dinheiro</button>
  </div>
  <p class="form-footer">Desligue o que não quer ver no Saldo. Esconder não apaga nada.</p>

  <div class="card flush list" style="margin-top: 14px">
    <MoreRow href="#/mais/contas" title="Contas e cartões" detail="Bancos, cartões, investimentos e dinheiro: editar, arquivar, ordem." icon="card" color="#1E90FF" count={accounts.length} />
  </div>

  <SectionTitle title="Previsão" />
  <div class="form-group">
    <label class="form-row" use:hint={['Média do variável', 'Quantos meses entram na previsão (o que deve entrar e o variável). Com menos histórico, usa os que houver.']}>
      <span class="field-label">Média dos últimos</span><input class="field" type="number" min="2" max="12" bind:value={months} /><span class="muted">meses</span></label>
  </div>
</div>

<style>
  .block { display: block; }
  .plain { width: 100%; border: 0; background: none; text-align: left; }
  .accent { color: var(--accent); font-weight: 500; }
</style>
