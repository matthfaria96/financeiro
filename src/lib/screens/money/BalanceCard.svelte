<script lang="ts">
  import { money } from '$lib/core/money';
  import Icon from '$lib/ui/Icon.svelte';
  import BankCard from '$lib/ui/BankCard.svelte';
  import Tally from '$lib/ui/Tally.svelte';
  import { hint } from '$lib/ui/hint';
  import BalanceFixSheet from './BalanceFixSheet.svelte';
  import type { MonthAnalysis } from '$lib/features/analytics';
  import { store } from '$lib/data/store.svelte';
  import { bankGroups, type BankGroup } from '$lib/features/bankGroups';

  /** Saldo financeiro: cada conta e o total. Conta sem saldo de referência aparece como estimada. */
  let { analysis, hidden = [], title = 'Saldo financeiro', current = true }: { analysis: MonthAnalysis; hidden?: string[]; title?: string; /** Mês atual: mostra o que está em aberto nos cartões (só faz sentido hoje). */ current?: boolean } = $props();
  const shown = $derived(analysis.balances.filter((b) => !hidden.includes(b.account.id)));
  // O que sobrou no fim do mês, quando informado no Ajustar, vale no lugar da soma.
  const informed = $derived(analysis.adjustment?.closing ?? null);
  const total = $derived(informed ?? shown.reduce((s, b) => s + b.cents, 0));
  const estimated = $derived(shown.filter((b) => b.estimated).length);
  // Uma linha por banco: saldo da conta (e caixinha) com o cartão do mesmo banco embaixo.
  const groups = $derived(bankGroups(store.accounts.filter((a) => !a.archived && !hidden.includes(a.id))).filter((g) => g.accounts.some((a) => a.kind !== 'creditCard') || g.cardOpen > 0));
  // Saldo do grupo no fim do mês escolhido (vem da análise do mês, não do saldo de hoje).
  const groupBalance = (g: BankGroup) => g.accounts.reduce((s, a) => s + (shown.find((b) => b.account.id === a.id)?.cents ?? 0), 0);
  const isEstimated = (g: BankGroup) => g.accounts.some((a) => shown.find((b) => b.account.id === a.id)?.estimated);
  const cardsOpen = $derived(groups.reduce((s, g) => s + g.cardOpen, 0));
  let fixOpen = $state(false);
</script>

<section class="card">
  <div class="card-head"><h3>{title}</h3>
    <div class="row" style="gap: 6px">
      <button class="btn close" onclick={() => (fixOpen = true)} use:hint={['Fechar o mês', 'Digite quanto tinha (conta + caixinha): acerta o saldo e lança o rendimento.']}>Fechar o mês</button>
    </div>
  </div>
  {#if estimated && informed === null}
    <button class="warnbox" onclick={() => (fixOpen = true)} use:hint={['Saldo estimado', 'O extrato não trouxe o saldo: o app somou só os lançamentos importados, começando do zero.']}>
      <Icon name="alert" size={16} /><span class="grow">{estimated === 1 ? 'Um saldo está estimado' : `${estimated} saldos estão estimados`}: o extrato não traz o saldo.</span><b>Informar</b>
    </button>
  {/if}
  <div class="rows">
    {#each groups as group (group.key)}
      {@const guess = isEstimated(group)}
      {@const hasMoney = group.accounts.some((a) => a.kind !== 'creditCard')}
      <a class="row item" href="#/contas/{group.main.id}"><BankCard account={group.main} width={38} />
        <span class="grow" style="min-width: 0"><span class="ellipsis block">{group.name}</span>{#if current && group.cardOpen > 0}<span class="caption">{hasMoney ? 'Cartão' : 'Só cartão'}: {money(group.cardOpen, { cents: false })} em aberto</span>{/if}</span>
        {#if guess}<span class="pill guess">estimado</span>{/if}
        {#if hasMoney}<span class="num" class:neg={groupBalance(group) < 0} class:faint={guess} title={guess ? "Estimado: o extrato não trouxe o saldo" : undefined}>{guess ? "≈ " : ""}<Tally cents={groupBalance(group)} /></span>{:else}<span class="num faint">—</span>{/if}</a>
    {:else}
      <a class="muted small" href="#/mais/contas">{analysis.balances.length ? 'Todas as contas estão escondidas.' : 'Cadastre suas contas para ver o saldo.'}</a>
    {/each}
  </div>
  <div class="row between total"><span class="muted">Total{informed !== null ? ' (informado no ajuste)' : estimated ? ' (estimado)' : ''}</span><b class="num"><Tally cents={total} /></b></div>
  {#if current && cardsOpen > 0}<div class="row between cards"><span class="caption">Em aberto nos cartões (vai para as faturas)</span><span class="num caption">{money(cardsOpen, { cents: false })}</span></div>{/if}
</section>
<BalanceFixSheet bind:open={fixOpen} />

<style>
  .close { height: 32px; padding: 0 12px; font-size: 13px; }
  .warnbox { display: flex; align-items: center; gap: 10px; width: 100%; margin-bottom: 8px; padding: 10px 12px; border-radius: 12px; border: 1px solid rgba(255, 166, 61, 0.35); background: rgba(255, 166, 61, 0.1); color: var(--warning); font-size: 13.5px; text-align: left; }
  .warnbox b { color: var(--text); white-space: nowrap; }
  .rows { display: flex; flex-direction: column; }
  .item { gap: 12px; padding: 8px 0; color: inherit; font-size: 15px; }
  .item + .item { border-top: 1px solid var(--stroke); }
  @media (max-width: 600px) { .guess { display: none; } }
  .guess { color: var(--warning); background: rgba(255, 166, 61, 0.12); }
  .block { display: block; }
  .cards { margin-top: 6px; gap: 12px; }
  .cards .num { white-space: nowrap; }
  .total { margin-top: 8px; padding-top: 12px; border-top: 1px solid var(--stroke-strong); }
  .total b { font: 600 22px var(--font-display); }
</style>
