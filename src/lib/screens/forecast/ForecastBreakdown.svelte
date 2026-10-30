<script lang="ts">
  import { money } from '$lib/core/money';
  import { store } from '$lib/data/store.svelte';
  import Avatar from '$lib/ui/Avatar.svelte';
  import { merchantForBill } from '$lib/screens/bills/billLook';
  import { spendKindColor, spendKindDetail, spendKindName, type ForecastLine, type SpendForecast, type SpendKind } from '$lib/features/spending';

  /** Fixas, variáveis e sazonais de um mês previsto, cada uma com os itens e de onde saiu o valor. */
  let { forecast }: { forecast: SpendForecast } = $props();
  const months = (n: number) => (n === 1 ? '1 mês' : `${n} meses`);
  const sections = $derived<{ kind: SpendKind; total: number; lines: ForecastLine[] }[]>([
    { kind: 'fixed', total: forecast.fixed.total, lines: forecast.fixed.bills },
    { kind: 'variable', total: forecast.variable.total, lines: forecast.variable.bills },
    { kind: 'seasonal', total: forecast.seasonal.cents, lines: [] }
  ]);
</script>

<div class="groups">
  {#each sections as section (section.kind)}
    <section class="card flush group" style:--c={spendKindColor[section.kind]}>
      <header>
        <i></i>
        <span class="grow"><b>{spendKindName[section.kind]}</b><span class="caption block">{spendKindDetail[section.kind]}</span></span>
        <b class="num total">{money(section.total, { cents: false })}</b>
      </header>
      {#if section.kind === 'seasonal'}
        <div class="line note">
          {#if forecast.seasonal.average.months}
            <span class="grow">Média de {months(forecast.seasonal.average.months)} com gasto sazonal</span><span class="num">{money(forecast.seasonal.average.cents, { cents: false })}</span>
          {:else}
            <span class="grow muted">Ainda sem meses com gasto sazonal para tirar a média.</span>
          {/if}
        </div>
        {#if forecast.seasonal.committed > 0}
          <div class="line note"><span class="grow">Já na fatura (compras e parcelas){forecast.seasonal.basis === 'committed' ? ' · passou da média, vale este' : ''}</span><span class="num">{money(forecast.seasonal.committed, { cents: false })}</span></div>
        {/if}
      {:else}
        {#each section.lines as line (line.bill.id)}
          <div class="line">
            <Avatar merchant={merchantForBill(line.bill) ?? null} category={store.categoryById.get(line.bill.category_id ?? '') ?? null} name={line.bill.name} size={30} />
            <span class="grow ellipsis">{line.bill.name}<span class="caption block">{line.bill.frequency === 'yearly' ? 'anual · ' : ''}dia {line.bill.day_of_month}{section.kind === 'variable' ? (line.months ? ` · média de ${months(line.months)}` : ' · sem histórico: valor cadastrado') : ''}</span></span>
            <span class="num">{money(line.cents, { cents: false })}</span>
          </div>
        {/each}
        {#if section.kind === 'fixed' && forecast.fixed.loose.cents > 0}
          <div class="line note"><span class="grow">Outros gastos fixos sem conta cadastrada<span class="caption block">média de {months(forecast.fixed.loose.months)} · <a class="link" href="#/contas-fixas">cadastrar como conta fixa</a></span></span><span class="num">{money(forecast.fixed.loose.cents, { cents: false })}</span></div>
        {/if}
        {#if !section.lines.length && !(section.kind === 'fixed' && forecast.fixed.loose.cents > 0)}
          <div class="line note"><span class="grow muted">{section.kind === 'fixed' ? 'Nenhuma conta fixa de valor igual neste mês.' : 'Nenhuma conta de valor variável (luz, água…) cadastrada.'}</span><a class="link small" href="#/contas-fixas">Contas fixas</a></div>
        {/if}
      {/if}
    </section>
  {/each}
</div>

<style>
  .groups { display: flex; flex-direction: column; gap: 12px; }
  header { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid var(--stroke); }
  i { width: 9px; height: 9px; border-radius: 50%; flex: none; background: var(--c); box-shadow: 0 0 12px color-mix(in srgb, var(--c) 55%, transparent); }
  header b { font-size: 15.5px; }
  .total { font: 600 18px var(--font-display); }
  .block { display: block; margin-top: 1px; }
  .line { display: flex; align-items: center; gap: 12px; padding: 9px 16px; font-size: 14.5px; }
  .line + .line { border-top: 1px solid var(--stroke); }
  .note { color: var(--text-2); }
  .num { white-space: nowrap; }
</style>
