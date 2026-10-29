<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import { centsToInput, money, parseCents } from '$lib/core/money';
  import { monthTitle, type Month } from '$lib/core/dates';
  import type { MonthAdjustment } from '$lib/data/types';
  import Sheet from '$lib/ui/Sheet.svelte';
  import Segmented from '$lib/ui/Segmented.svelte';
  import type { MonthAnalysis } from '$lib/features/analytics';

  /** Acertar o mês: digite o total real de entradas e saídas; a diferença fica registrada com motivo e observação. */
  let { open = $bindable(), month, analysis }: { open: boolean; month: Month; analysis: MonthAnalysis } = $props();
  let income = $state('');
  let expense = $state('');
  let reason = $state<MonthAdjustment['reason']>('juros');
  let note = $state('');
  const base = $derived({ income: analysis.incomeTotal - (analysis.adjustment?.income ?? 0), expense: analysis.expenseTotal - (analysis.adjustment?.expense ?? 0) });

  $effect(() => {
    if (!open) return;
    income = centsToInput(analysis.incomeTotal); expense = centsToInput(analysis.expenseTotal);
    reason = analysis.adjustment?.reason ?? 'juros'; note = analysis.adjustment?.note ?? '';
  });
  const diffIn = $derived((parseCents(income) ?? base.income) - base.income);
  const diffOut = $derived((parseCents(expense) ?? base.expense) - base.expense);

  async function save() {
    const all = { ...(store.household?.settings.adjustments ?? {}) };
    if (!diffIn && !diffOut && !note.trim()) delete all[month];
    else all[month] = { income: diffIn, expense: diffOut, reason, note: note.trim() };
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
  <p class="muted small intro">Se o total do mês não bate com o banco, digite o valor certo. A diferença fica registrada como ajuste, com o motivo.</p>
  <div class="form-group">
    <label class="form-row"><span class="field-label grow">Entradas<span class="caption block">Calculado: {money(base.income)}{diffIn ? ` · ajuste ${money(diffIn)}` : ''}</span></span><input class="field num amount" inputmode="decimal" bind:value={income} /></label>
    <label class="form-row"><span class="field-label grow">Saídas<span class="caption block">Calculado: {money(base.expense)}{diffOut ? ` · ajuste ${money(diffOut)}` : ''}</span></span><input class="field num amount" inputmode="decimal" bind:value={expense} /></label>
  </div>
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
