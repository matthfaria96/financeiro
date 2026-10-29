import { costName } from '$lib/core/catalog';
import { monthOf, shortDate, type Month } from '$lib/core/dates';
import { store } from '$lib/data/store.svelte';
import type { Entry } from '$lib/data/types';
import { accountOf, billDueOf, categoryOf, costOf, kindOf, rootOf } from '$lib/features/model';

/** Lançamentos do mês em CSV (com BOM para o Excel abrir os acentos certo). */
export function exportCSV(month: Month, entries: Entry[]) {
  const rows = [['Data', 'Descrição', 'Valor', 'Categoria', 'Subcategoria', 'Fixo/sazonal', 'Estabelecimento', 'De quem', 'Conta', 'Fatura', 'Parcela', 'Descrição do banco', 'Comentário']];
  for (const e of entries.filter((x) => monthOf(x.date) === month && !x.is_mirror).toSorted((a, b) => a.date.localeCompare(b.date))) {
    const category = categoryOf(e);
    const due = billDueOf(e);
    rows.push([
      shortDate(e.date), e.title, (e.amount_cents / 100).toFixed(2).replace('.', ','), rootOf(category)?.name ?? '', category?.parent_id ? category.name : '',
      kindOf(e) === 'expense' ? costName[costOf(e)] : '', store.merchantById.get(e.merchant_id ?? '')?.name ?? '', store.personById.get(e.person_id ?? '')?.name ?? '',
      accountOf(e)?.name ?? '', due ? shortDate(due) : '', e.installment_total > 1 ? `${e.installment_current}/${e.installment_total}` : '', e.original_title, e.notes
    ]);
  }
  const text = rows.map((row) => row.map((cell) => (/[;"\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: `Lancamentos-${month}.csv` });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  store.toast(`Planilha de ${rows.length - 1} lançamentos baixada (pasta Downloads).`);
}
