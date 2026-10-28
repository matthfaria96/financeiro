<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import { shortMonth, type Month } from '$lib/core/dates';
  import { money } from '$lib/core/money';
  import { sheetCSV, type SheetRow } from '$lib/core/sheet';
  import Icon from '$lib/ui/Icon.svelte';
  import Segmented from '$lib/ui/Segmented.svelte';
  import WorkspaceBar from '$lib/ui/WorkspaceBar.svelte';
  import { hint } from '$lib/ui/hint';
  import SubHeader from '$lib/screens/more/SubHeader.svelte';
  import { inScope, inScopeAccount } from '$lib/features/model';
  import { monthRange, monthStatus, sheetData, type CreditMonth, type SheetGrouping } from '$lib/features/sheet';

  let grouping = $state<SheetGrouping>('category');
  let creditMonth = $state<CreditMonth>('bill');
  let count = $state(12);
  let open = $state(new Set<string>());
  let scroller = $state<HTMLDivElement>();

  const months = $derived(monthRange(count, creditMonth === 'bill' ? 3 : 0));
  const closed = $derived(months.filter((m) => monthStatus(m) === 'closed'));
  const data = $derived(sheetData(store.entries.filter(inScope), store.accounts.filter(inScopeAccount), months, grouping, creditMonth));
  const label = (key: string) => data.labels.get(key) ?? { name: key, color: '#78909C' };
  const average = (values: Map<Month, number | null>) => {
    const list = closed.map((m) => values.get(m)).filter((v): v is number => v != null);
    return list.length ? Math.round(list.reduce((a, b) => a + b, 0) / list.length) : null;
  };
  const statusIcon = { closed: 'check-circle', current: 'star', future: 'clock' } as const;
  const statusHint = { closed: 'Mês fechado.', current: 'Mês atual: ainda vai mudar.', future: 'Previsto: só o que já está comprometido no cartão (faturas e parcelas).' } as const;

  function toggle(key: string) {
    const next = new Set(open);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    open = next;
  }

  // Abre com o mês atual como última coluna visível (os anteriores à esquerda, como na planilha).
  $effect(() => {
    void months;
    const current = scroller?.querySelector<HTMLElement>('th.current');
    if (scroller && current) requestAnimationFrame(() => (scroller!.scrollLeft = current.offsetLeft + current.offsetWidth - scroller!.clientWidth + 8));
  });

  function download() {
    const header = ['', ...months.map(shortMonth), 'Média'];
    const rows: { label: string; values: (number | null)[] }[] = [];
    const push = (name: string, row: SheetRow | Map<Month, number | null>) => {
      const values = row instanceof Map ? row : row.total;
      rows.push({ label: name, values: [...months.map((m) => values.get(m) ?? (row instanceof Map ? null : 0)), average(values as Map<Month, number | null>)] });
    };
    const section = (title: string, row: SheetRow) => {
      push(title, row);
      for (const group of row.children) {
        push(`  ${label(group.key).name}`, group);
        for (const sub of group.children) push(`    ${label(sub.key).name}`, sub);
      }
    };
    section('ENTRADAS', data.sheet.sections.income);
    push('SAÍDAS', data.sheet.spent);
    section('No crédito (faturas)', data.sheet.sections.credit);
    section('No débito (conta e dinheiro)', data.sheet.sections.debit);
    push('BALANÇO DO MÊS', data.balance);
    push('SALDO NO FIM DO MÊS', data.endBalance);
    const blob = new Blob([sheetCSV(header, rows)], { type: 'text/csv;charset=utf-8' });
    const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `Mes-a-mes-${months[0]}-a-${months.at(-1)}.csv` });
    link.click();
    URL.revokeObjectURL(link.href);
    store.toast(`Planilha salva em Downloads: ${link.download}`);
  }
</script>

{#snippet cells(values: Map<Month, number | null>, tone = false)}
  {#each months as m (m)}
    {@const v = values.get(m) ?? null}
    <td class="num" class:future={monthStatus(m) === 'future'} class:pos={tone && v !== null && v > 0} class:neg={tone && v !== null && v < 0}>{v ? money(v, { cents: false }) : v === 0 && monthStatus(m) !== 'future' ? '—' : ''}</td>
  {/each}
  {@const avg = average(values)}
  <td class="num avg" class:pos={tone && avg !== null && avg > 0} class:neg={tone && avg !== null && avg < 0}>{avg ? money(avg, { cents: false }) : ''}</td>
{/snippet}

{#snippet section(title: string, row: SheetRow, color: string)}
  <tr class="total"><th scope="row" style:--c={color}>{title}</th>{@render cells(row.total)}</tr>
  {#each row.children as group (group.key)}
    {@const g = label(group.key)}
    {@const id = `${row.key}:${group.key}`}
    <tr class="group" onclick={() => toggle(id)}>
      <th scope="row"><span class="row" style="gap: 6px"><Icon name={open.has(id) ? 'chevron-down' : 'chevron-right'} size={13} class="faint" /><i style:background={g.color}></i><span class="ellipsis">{g.name}</span></span></th>
      {@render cells(group.total)}
    </tr>
    {#if open.has(id)}
      {#each group.children as sub (sub.key)}<tr class="sub"><th scope="row"><span class="ellipsis">{label(sub.key).name}</span></th>{@render cells(sub.total)}</tr>{/each}
    {/if}
  {/each}
{/snippet}

<div class="page wide">
  <SubHeader title="Mês a mês" back="#/relatorios">
    <button class="icon-btn" aria-label="Baixar planilha" onclick={download} use:hint={['Baixar planilha', 'Salva esta tabela em CSV para abrir no Excel, Numbers ou Google Planilhas.']}><Icon name="export" /></button>
  </SubHeader>
  <WorkspaceBar />
  <div class="controls">
    <Segmented label="Agrupar" bind:value={grouping} options={[{ value: 'category', label: 'Por categoria' }, { value: 'person', label: 'Por pessoa' }]} />
    <Segmented label="Crédito" bind:value={creditMonth} options={[{ value: 'bill', label: 'Crédito no mês da fatura' }, { value: 'purchase', label: 'No mês da compra' }]} />
    <select class="input period" bind:value={count} aria-label="Período" use:hint={['Período', 'Quantos meses para trás aparecem.']}>
      <option value={6}>6 meses</option><option value={12}>12 meses</option><option value={24}>24 meses</option>
    </select>
  </div>
  <div class="card flush scroll" bind:this={scroller}>
    <table>
      <thead>
        <tr><th></th>
          {#each months as m (m)}{@const s = monthStatus(m)}<th class="month" class:future={s === 'future'} class:current={s === 'current'} use:hint={[shortMonth(m), statusHint[s]]}><Icon name={statusIcon[s]} size={12} class={s === 'current' ? 'warn' : s === 'closed' ? 'pos' : 'faint'} /> {shortMonth(m)}</th>{/each}
          <th class="month" use:hint={['Média', 'Média dos meses fechados mostrados.']}>Média</th>
        </tr>
      </thead>
      <tbody>
        {@render section('ENTRADAS', data.sheet.sections.income, 'var(--positive)')}
        <tr class="spacer"><td colspan={months.length + 2}></td></tr>
        <tr class="total big"><th scope="row" style:--c="var(--negative)">SAÍDAS</th>{@render cells(data.sheet.spent)}</tr>
        {@render section('No crédito (faturas)', data.sheet.sections.credit, '#b388ff')}
        {@render section('No débito (conta e dinheiro)', data.sheet.sections.debit, '#38d9f5')}
        <tr class="spacer"><td colspan={months.length + 2}></td></tr>
        <tr class="total big"><th scope="row" style:--c="var(--accent)" use:hint={['Balanço', 'Entradas − saídas do mês.']}>BALANÇO DO MÊS</th>{@render cells(data.balance, true)}</tr>
        <tr class="total"><th scope="row" style:--c="var(--text-2)" use:hint={['Saldo', 'Conta corrente + dinheiro no último dia do mês.']}>Saldo no fim do mês</th>{@render cells(data.endBalance)}</tr>
        {#if [...data.endInvested.values()].some((v) => v !== null)}
          <tr class="total"><th scope="row" style:--c="var(--text-2)">Investido no fim do mês</th>{@render cells(data.endInvested)}</tr>
        {/if}
      </tbody>
    </table>
  </div>
  <p class="form-footer">Crédito no mês da fatura é como na sua planilha: a compra conta no mês em que a fatura vence. Pagamento de fatura e transferências entre contas não entram (senão contaria duas vezes). Toque numa linha para ver as subcategorias.</p>
</div>

<style>
  .page.wide { max-width: 1240px; }
  .controls { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .period { width: auto; height: 40px; }
  .scroll { overflow-x: auto; }
  table { border-collapse: separate; border-spacing: 0; font-size: 13.5px; white-space: nowrap; min-width: 100%; }
  th, td { padding: 8px 12px; text-align: right; }
  thead th { position: sticky; top: 0; font-size: 12px; font-weight: 600; color: var(--text-2); background: #121a17; border-bottom: 1px solid var(--stroke); }
  tbody th { position: sticky; left: 0; z-index: 1; text-align: left; font-weight: 500; background: #121a17; max-width: 220px; min-width: 190px; border-right: 1px solid var(--stroke); }
  thead th:first-child { left: 0; z-index: 2; position: sticky; }
  @media (max-width: 600px) { tbody th { min-width: 150px; max-width: 150px; } }
  .total th { font-weight: 700; color: var(--c); }
  .total td { font-weight: 600; }
  .big td, .big th { font-size: 14.5px; }
  .group { cursor: pointer; }
  .group:hover td, .group:hover th { background: #18211d; }
  .group th { padding-left: 14px; }
  .group i { width: 8px; height: 8px; border-radius: 50%; flex: none; }
  .sub th { padding-left: 44px; color: var(--text-2); font-weight: 400; }
  .sub td { color: var(--text-2); }
  .future { color: var(--text-3); font-style: italic; }
  .avg { color: var(--text-2); border-left: 1px solid var(--stroke); }
  .spacer td { height: 8px; padding: 0; }
  tbody tr + tr td, tbody tr + tr th { border-top: 1px solid rgba(255, 255, 255, 0.035); }
</style>
