<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import { centsToInput, money, parseCents } from '$lib/core/money';
  import { monthTitle, type Month } from '$lib/core/dates';
  import type { MonthAdjustment } from '$lib/data/types';
  import Sheet from '$lib/ui/Sheet.svelte';
  import Segmented from '$lib/ui/Segmented.svelte';
  import type { MonthAnalysis } from '$lib/features/analytics';

  /**
   * Acertar o mês: quanto ganhou ao todo, quanto gastou ao todo e quanto sobrou nas contas no último dia.
   * Entradas e saídas guardam só a diferença (com motivo); o que sobrou substitui o saldo calculado do mês.
   */
  let { open = $bindable(), month, analysis }: { open: boolean; month: Month; analysis: MonthAnalysis } = $props();
  let income = $state('');
  let expense = $state('');
  let reason = $state<MonthAdjustment['reason']>('juros');
  let note = $state('');
  let closing = $state('');
  const base = $derived({ income: analysis.incomeTotal - (analysis.adjustment?.income ?? 0), expense: analysis.expenseTotal - (analysis.adjustment?.expense ?? 0),
    closing: analysis.balances.reduce((s, b) => s + b.cents, 0) });

  $effect(() => {
    if (!open) return;
    income = centsToInput(analysis.incomeTotal); expense = centsToInput(analysis.expenseTotal);
    reason = analysis.adjustment?.reason ?? 'juros'; note = analysis.adjustment?.note ?? '';
    closing = analysis.adjustment?.closing != null ? centsToInput(analysis.adjustment.closing) : '';
  });
  const diffIn = $derived((parseCents(income) ?? base.income) - base.income);
  const diffOut = $derived((parseCents(expense) ?? base.expense) - base.expense);
  // Vazio ou igual ao calculado: não guarda (o saldo continua vindo dos lançamentos).
  const closingCents = $derived.by(() => {
    const value = closing.trim() ? parseCents(closing) : null;
    return value === null || value === base.closing ? null : value;
  });
  const balance = $derived(base.income + diffIn - (base.expense + diffOut));

  async function save() {
    const all = { ...(store.household?.settings.adjustments ?? {}) };
    if (!diffIn && !diffOut && closingCents === null && !note.trim()) delete all[month];
    else all[month] = { income: diffIn, expense: diffOut, closing: closingCents, reason, note: note.trim() };
    await store.updateSettings({ adjustments: all });
    store.toast('Mês ajustado.');
    open = false;
  }
  async function clear() {
    const all = { ...(store.household?.settings.adjustments ?? {}) };
    delete all[month];
    await store.updateSettings({ adjustments: all });
    open = false;
  }
</script>

<Sheet bind:open title="Ajustar {monthTitle(month).split(' ')[0].toLowerCase()}">
  {#snippet actions()}<button class="btn primary" onclick={save}>Salvar</button>{/snippet}
  <p class="muted small intro">Se o mês não bate com o banco, digite os valores certos. A diferença fica registrada como ajuste, com o motivo.</p>
  <div class="form-group">
    <label class="form-row"><span class="field-label grow">Ganhei ao todo<span class="caption block">Calculado: {money(base.income)}{diffIn ? ` · ajuste ${money(diffIn)}` : ''}</span></span><input class="field num amount" inputmode="decimal" bind:value={income} /></label>
    <label class="form-row"><span class="field-label grow">Gastei ao todo<span class="caption block">Calculado: {money(base.expense)}{diffOut ? ` · ajuste ${money(diffOut)}` : ''}</span></span><input class="field num amount" inputmode="decimal" bind:value={expense} /></label>
    <div class="form-row"><span class="field-label grow">Balanço do mês<span class="caption block">Ganhei − gastei</span></span><b class="num" class:pos={balance >= 0} class:neg={balance < 0}>{money(balance)}</b></div>
  </div>
  <div class="form-group" style="margin-top: 12px">
    <label class="form-row"><span class="field-label grow">Sobrou nas contas<span class="caption block">No último dia do mês · calculado: {money(base.closing)}</span></span><input class="field num amount" inputmode="decimal" placeholder={centsToInput(base.closing)} bind:value={closing} /></label>
  </div>
  <p class="form-footer">Opcional. Some o que tinha em todas as contas, caixinhas e dinheiro no fim do mês: esse valor passa a valer como saldo do mês.</p>
  <div class="form-title">Motivo</div>
  <Segmented label="Motivo" bind:value={reason} options={[{ value: 'juros', label: 'Juros' }, { value: 'antecipacao', label: 'Antecipação de fatura' }, { value: 'outro', label: 'Outro' }]} />
  <div class="form-title">Observação</div>
  <div class="form-group"><textarea class="field" rows="3" placeholder="ex.: paguei a fatura de novembro adiantada" bind:value={note}></textarea></div>
  {#if analysis.adjustment}<button class="btn ghost danger" style="margin-top: 12px" onclick={clear}>Tirar o ajuste</button>{/if}
</Sheet>

<style>
  .intro { margin: 12px 4px; line-height: 1.45; }
  .block { display: block; font-weight: 400; }
  .amount { max-width: 130px; }
  textarea.field { padding: 12px 16px; }
</style>
