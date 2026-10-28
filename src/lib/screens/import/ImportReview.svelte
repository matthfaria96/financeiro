<script lang="ts">
  import { untrack } from 'svelte';
  import { store } from '$lib/data/store.svelte';
  import { bankName, dateRange } from '$lib/core/statement';
  import { money } from '$lib/core/money';
  import { shortDate } from '$lib/core/dates';
  import Icon from '$lib/ui/Icon.svelte';
  import BankCard from '$lib/ui/BankCard.svelte';
  import Avatar from '$lib/ui/Avatar.svelte';
  import Segmented from '$lib/ui/Segmented.svelte';
  import Toggle from '$lib/ui/Toggle.svelte';
  import CategorySelect from '$lib/ui/CategorySelect.svelte';
  import { hint } from '$lib/ui/hint';
  import { kindName, kindShort } from '$lib/ui/look';
  import { configureBills, configureInvestment, rebuildRows, type ImportDraft } from '$lib/features/imports.svelte';
  import { inScopeAccount } from '$lib/features/model';
  import type { AccountKind } from '$lib/data/types';

  let { draft, last, onback, onskip, onnext }: { draft: ImportDraft; last: boolean; onback?: () => void; onskip: () => void; onnext: () => void } = $props();

  const target = $derived(draft.targetAccount);
  const range = $derived(dateRange(draft.statement));
  const choices = $derived(store.accounts.filter((a) => (!a.archived && inScopeAccount(a)) || a.id === draft.target));
  const warning = $derived.by(() => {
    if (!target) return '';
    const s = draft.statement;
    if (s.bank !== 'other' && target.bank !== 'other' && s.bank !== target.bank) return `O arquivo parece ser do ${bankName[s.bank]}, e a conta é do ${bankName[target.bank]}.`;
    if ((s.kind === 'creditCard') !== (target.kind === 'creditCard')) return s.kind === 'creditCard' ? 'O arquivo parece ser fatura de cartão, e a conta não é cartão.' : 'O arquivo parece ser extrato de conta, e a conta é cartão.';
    return '';
  });
  const owner = $derived(store.personById.get(draft.defaultPersonId ?? target?.default_person_id ?? ''));

  // Inverter sinais muda chaves e sugestões: recalcula (mantendo o que o usuário mexeu).
  let lastInvert = untrack(() => draft.invertSigns);
  $effect(() => {
    if (draft.invertSigns === lastInvert) return;
    lastInvert = draft.invertSigns;
    rebuildRows(draft);
  });

  function retarget() {
    rebuildRows(draft);
    configureBills(draft);
    configureInvestment(draft);
  }
</script>

<div class="stack" style="padding-top: 8px">
  <div class="card row dest" use:hint={['Destino', 'De qual banco veio o arquivo e para qual conta os lançamentos vão.']}>
    <span class="file"><Icon name="file" size={26} /><span class="caption">{bankName[draft.statement.bank]}</span></span>
    <Icon name="arrow-right" size={20} color="var(--accent)" />
    {#if target}<BankCard account={target} width={74} />{:else}<span class="file" style="color: var(--accent)"><Icon name="plus" size={28} /></span>{/if}
    <span class="grow stack-sm" style="gap: 3px">
      <b>Vai para {target ? target.name : `uma conta nova: ${draft.newAccountName}`}</b>
      <span class="caption">{owner ? `de ${owner.name}` : 'sem dono definido'}{store.workspacesEnabled ? ` · ${store.workspaceById.get(target?.workspace_id ?? draft.newAccountWorkspace ?? '')?.name ?? 'sem área'}` : ''}</span>
      {#if warning}<span class="caption warn row" style="gap: 5px"><Icon name="alert" size={13} />{warning}</span>{/if}
    </span>
  </div>

  {#each draft.otherAccountMatches as match}
    <div class="card row small"><Icon name="alert" size={18} color="var(--warning)" /><span class="grow"><b>{match.count} destas linhas já estão em {match.name}.</b> Se o arquivo é dessa conta, troque o destino. Se foi importado lá por engano, mova em Mais › Importações.</span></div>
  {/each}

  <div class="form-title" style="margin-top: 6px">Arquivo</div>
  <div class="card stack-sm small">
    <b class="row" style="gap: 6px"><Icon name="file" size={15} color="var(--accent)" />{draft.fileName}</b>
    <span class="muted">{draft.summary}{range ? ` · de ${shortDate(range[0])} a ${shortDate(range[1])}` : ''}</span>
    {#if draft.statement.balanceCents !== undefined}<span class="muted">Saldo informado pelo banco: {money(draft.statement.balanceCents)} — a conta vai bater com ele.</span>{/if}
    {#each draft.statement.warnings as w}<span class="warn">{w}</span>{/each}
  </div>

  <div class="form-title">Destino</div>
  <div class="form-group">
    <label class="form-row" use:hint={['Conta', 'Escolhida pelo número da conta no arquivo ou pelo banco. Repetidos nesta conta são pulados.']}><span class="field-label">Conta</span>
      <select class="field" bind:value={draft.target} onchange={retarget}>
        {#each choices as a (a.id)}<option value={a.id}>{a.name} ({kindName[a.kind].toLowerCase()})</option>{/each}
        <option value="new">Nova conta…</option>
      </select></label>
    {#if draft.target === 'new'}
      <label class="form-row"><span class="field-label">Nome da nova conta</span><input class="field" bind:value={draft.newAccountName} /></label>
      <label class="form-row"><span class="field-label">Tipo</span><select class="field" bind:value={draft.newAccountKind} onchange={retarget}>{#each ['checking', 'creditCard', 'savings', 'cash'] as k}<option value={k}>{kindShort[k as AccountKind]}</option>{/each}</select></label>
      {#if store.workspacesEnabled}
        <label class="form-row"><span class="field-label">Área de trabalho</span><select class="field" bind:value={draft.newAccountWorkspace}><option value={null}>Nenhuma</option>{#each store.workspaces as w (w.id)}<option value={w.id}>{w.name}</option>{/each}</select></label>
      {/if}
    {/if}
    <label class="form-row" use:hint={['De quem é', 'Dono dos lançamentos deste arquivo, quando nenhum estabelecimento disser outra coisa.']}><span class="field-label">De quem é</span>
      <select class="field" bind:value={draft.defaultPersonId}><option value={null}>{target?.default_person_id ? `Padrão da conta (${store.personById.get(target.default_person_id)?.name})` : 'Ninguém'}</option>{#each store.people as p (p.id)}<option value={p.id}>{p.name}</option>{/each}</select></label>
    {#if draft.statement.kind === 'checking' && draft.statement.balanceCents === undefined && range}
      <label class="form-row" use:hint={['Saldo no fim do extrato', 'Este arquivo não traz o saldo. Digite o saldo nesse dia (veja no app do banco). O OFX já traz sozinho.']}><span class="field-label">Saldo em {shortDate(range[1])}</span><input class="field num" inputmode="decimal" placeholder="opcional" bind:value={draft.manualBalance} /></label>
    {/if}
    {#if draft.statement.bank === 'other'}
      <div class="form-row" use:hint={['Inverter sinais', 'Use se as compras aparecerem como entrada (comum em fatura de cartão de outros bancos).']}><span class="field-label grow">Inverter entradas e saídas</span><Toggle label="Inverter" bind:checked={draft.invertSigns} /></div>
    {/if}
  </div>

  {#if draft.isCard}
    <div class="form-title row" style="gap: 6px"><Icon name="card" size={14} />Faturas</div>
    <div class="form-group">
      <div class="form-row"><Segmented label="Faturas do arquivo" bind:value={draft.billSingle} options={[{ value: true, label: 'Uma fatura' }, { value: false, label: 'Vários meses' }]} /></div>
      {#if draft.billSingle}
        <label class="form-row" use:hint={['Vencimento', 'Dia em que esta fatura é paga. Preenchido pelo nome do arquivo ou pelo ciclo do cartão; confira.']}><span class="field-label">Vencimento da fatura</span><input class="field" type="date" bind:value={draft.billDue} /></label>
      {:else}
        <label class="form-row" use:hint={['Fechamento', 'Compras a partir deste dia vão para a fatura seguinte. Ajuste até os grupos baterem com o app do banco.']}><span class="field-label">Fecha no dia</span><input class="field" type="number" min="1" max="31" bind:value={draft.billClosingDay} /></label>
        <label class="form-row"><span class="field-label">Vence no dia</span><input class="field" type="number" min="1" max="31" bind:value={draft.billDueDay} /></label>
      {/if}
      {#each draft.billGroups as group (group.due)}
        <div class="form-row"><span class="grow"><b class="small">Fatura que vence {shortDate(group.due)}</b><div class="caption">{draft.billSingle ? '' : `Compras de ${shortDate(group.range[0])} a ${shortDate(group.range[1])} · `}{group.count} lançamentos</div></span><span class="num">{money(-group.cents)}</span></div>
      {/each}
    </div>
    <p class="form-footer">A compra aparece como informativo no mês em que foi feita e no "a pagar" do mês da fatura.</p>
  {/if}

  {#if draft.investmentCount}
    <div class="form-title row" style="gap: 6px"><Icon name="invest" size={14} />{draft.investmentCount} movimentos de caixinha/RDB</div>
    <div class="form-group">
      <label class="form-row" use:hint={['Investimento', 'Aplicação soma no investimento e resgate tira, sozinhos. O rendimento você corrige informando o saldo de hoje.']}><span class="field-label">Acompanhar em</span>
        <select class="field" value={draft.investment.type === 'existing' ? draft.investment.id : draft.investment.type} onchange={(e) => { const v = e.currentTarget.value; draft.investment = v === 'none' ? { type: 'none' } : v === 'new' ? { type: 'new' } : { type: 'existing', id: v }; }}>
          <option value="none">Não acompanhar</option>
          {#each store.accounts.filter((a) => a.kind === 'savings') as a (a.id)}<option value={a.id}>{a.name}</option>{/each}
          <option value="new">Nova: {draft.newInvestmentName}</option>
        </select></label>
      {#if draft.investment.type === 'new'}<label class="form-row"><span class="field-label">Nome</span><input class="field" bind:value={draft.newInvestmentName} /></label>{/if}
    </div>
  {/if}

  <div class="form-title">Lançamentos ({draft.rows.length})</div>
  <div class="card flush list">
    {#each draft.rows as row (row.index)}
      {@const category = store.categoryByKey.get(row.categoryKey) ?? null}
      {@const merchant = row.merchantId ? store.merchantById.get(row.merchantId) ?? null : null}
      <div class="line" class:dup={row.duplicate}>
        <input type="checkbox" checked={row.include} disabled={row.duplicate} onchange={(e) => { row.include = e.currentTarget.checked; row.includeEdited = true; }} aria-label="Importar esta linha" />
        <Avatar {merchant} {category} name={row.displayName} size={32} />
        <span class="grow stack-sm" style="gap: 1px; min-width: 0">
          <span class="ellipsis small">{row.displayName}</span>
          <span class="caption">{shortDate(row.transaction.date)}{row.transaction.installment ? ` · Parcela ${row.transaction.installment.current}/${row.transaction.installment.total}` : ''}
            {#if row.duplicate}<span> · já importado</span>{:else if row.possibleDuplicate}<span class="warn"> · talvez repetido</span>{/if}</span>
        </span>
        <CategorySelect value={row.categoryKey} byKey confident={row.confident} onchange={(key) => { row.categoryKey = key; row.categoryEdited = true; row.confident = true; }} />
        <span class="num small amt" class:pos={row.transaction.amountCents > 0}>{money(row.transaction.amountCents)}</span>
      </div>
    {/each}
  </div>
  <p class="form-footer">Em cinza: já existem nesta conta e serão pulados. "Talvez repetido": mesmo dia e valor de um lançamento importado em outro formato (OFX × CSV); vem desmarcado.</p>

  <div class="footer">
    <div class="grow"><b>{draft.newCount} novos</b><div class="caption">{draft.duplicateCount} já importados{draft.possibleCount ? ` · ${draft.possibleCount} talvez repetidos` : ''} · {draft.uncategorizedCount} sem categoria</div></div>
    {#if onback}<button class="btn" onclick={onback}>Voltar</button>{/if}
    <button class="btn" onclick={onskip}>Pular arquivo</button>
    <button class="btn primary" onclick={onnext}>{last ? 'Importar' : 'Próximo'}</button>
  </div>
</div>

<style>
  .dest { gap: 14px; }
  .file { display: flex; flex-direction: column; align-items: center; gap: 2px; width: 64px; color: var(--text-2); }
  .line { display: flex; align-items: center; gap: 10px; padding: 9px 14px; }
  .line.dup { opacity: 0.45; }
  .line input[type='checkbox'] { width: 18px; height: 18px; accent-color: var(--accent); flex: none; }
  .amt { min-width: 88px; text-align: right; }
  .footer { position: sticky; bottom: -20px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 12px 0 4px; background: linear-gradient(transparent, #121916 30%); }
</style>
