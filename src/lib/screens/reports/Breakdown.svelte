<script lang="ts">
  import { addMonths, type Month } from '$lib/core/dates';
  import { money, percent } from '$lib/core/money';
  import type { Entry } from '$lib/data/types';
  import Icon from '$lib/ui/Icon.svelte';
  import ChangeBadge from '$lib/ui/ChangeBadge.svelte';
  import { hint } from '$lib/ui/hint';
  import { accountOf, categoryOf, costOf, fullName, kindOf } from '$lib/features/model';
  import { monthOf } from '$lib/core/dates';
  import { filter } from '../transactions/filter.svelte';
  import { goto } from '$app/navigation';
  import BarChart from '$lib/ui/charts/BarChart.svelte';
  import { shortMonth } from '$lib/core/dates';

  /** Fixo × variável (junta conta, dinheiro e cartão) ou meio de pagamento. Consumo pela data da compra. */
  let { month, entries, mode }: { month: Month; entries: Entry[]; mode: 'cost' | 'payment' } = $props();

  type Group = { id: string; title: string; icon: string; color: string; detail: string; test: (e: Entry) => boolean };
  const groups: Record<'cost' | 'payment', Group[]> = {
    cost: [
      { id: 'fixed', title: 'Fixo', icon: 'pin', color: '#3987e5', detail: 'Contas que se repetem, de qualquer conta ou cartão.', test: (e) => costOf(e) === 'fixed' },
      { id: 'variable', title: 'Variável', icon: 'activity', color: '#d95926', detail: 'Gastos que mudam de um mês para outro.', test: (e) => costOf(e) === 'variable' }
    ],
    payment: [
      { id: 'checking', title: 'Conta corrente', icon: 'bank', color: '#3987e5', detail: 'Débito, Pix, boletos e transferências para outras pessoas.', test: (e) => accountOf(e)?.kind === 'checking' },
      { id: 'cash', title: 'Dinheiro', icon: 'cash', color: '#199e70', detail: 'Gastos em espécie lançados na conta Dinheiro.', test: (e) => accountOf(e)?.kind === 'cash' },
      { id: 'card', title: 'Cartão', icon: 'card', color: '#d95926', detail: 'Compras no crédito deste mês (pagas nas próximas faturas).', test: (e) => accountOf(e)?.kind === 'creditCard' }
    ]
  };

  const expenses = (m: Month) => entries.filter((e) => !e.is_mirror && monthOf(e.date) === m && kindOf(e) === 'expense');
  const computed = $derived.by(() => {
    const now = expenses(month);
    const before = expenses(addMonths(month, -1));
    return groups[mode].map((g) => {
      const items = now.filter(g.test);
      const total = -items.reduce((s, e) => s + e.amount_cents, 0);
      const old = -before.filter(g.test).reduce((s, e) => s + e.amount_cents, 0);
      const byCategory = new Map<string, { name: string; color: string; cents: number }>();
      for (const e of items) {
        const c = categoryOf(e);
        const key = c?.id ?? 'none';
        const current = byCategory.get(key) ?? { name: fullName(c), color: c?.color ?? '#78909C', cents: 0 };
        current.cents -= e.amount_cents;
        byCategory.set(key, current);
      }
      return { ...g, total, change: old > 0 ? (total - old) / old : null, top: [...byCategory.values()].filter((x) => x.cents > 0).sort((a, b) => b.cents - a.cents).slice(0, 8) };
    });
  });
  const months = $derived(Array.from({ length: 6 }, (_, i) => addMonths(month, i - 5)));
  const trend = $derived(groups[mode].map((g) => ({ id: g.id, name: g.title, color: g.color, stack: 'all', values: months.map((m) => -expenses(m).filter(g.test).reduce((s, e) => s + e.amount_cents, 0)) })));
  const sum = $derived(Math.max(computed.reduce((s, g) => s + g.total, 0), 1));

  function open(id: string) {
    filter.set({ month, ...(mode === 'cost' ? { cost: id as 'fixed' | 'variable' } : {}) });
    goto('#/transacoes');
  }
</script>

<section class="card stack">
  <div class="bar">{#each computed.filter((g) => g.total > 0) as g (g.id)}<span style:width="{(g.total / sum) * 100}%" style:background={g.color}></span>{/each}</div>
  <div class="row" style="align-items: flex-start">
    {#each computed as g (g.id)}
      <div class="grow stack-sm" style="gap: 2px"><span class="small row" style="gap: 5px; color: {g.color}; font-weight: 600"><Icon name={g.icon} size={13} />{g.title}</span><span class="value-md">{money(g.total, { cents: false })}</span><span class="caption">{percent(g.total / sum)}</span></div>
    {/each}
  </div>
</section>

<section class="card">
  <div class="card-head"><h3>Últimos 6 meses</h3><span class="sub">pela data da compra</span></div>
  <BarChart labels={months.map((m) => shortMonth(m).slice(0, 3))} current={5} series={trend} height={200} title="{mode === 'cost' ? 'Fixo e variável' : 'Meio de pagamento'} nos últimos 6 meses" />
</section>

<div class="grid-{computed.length === 3 ? '3' : '2'}">
{#each computed as g (g.id)}
  <section class="card stack-sm" use:hint={[g.title, g.detail]}>
    <div class="row between"><b class="row" style="gap: 8px; color: {g.color}"><Icon name={g.icon} size={17} />{g.title}</b><span class="row" style="gap: 8px"><b class="num">{money(g.total)}</b><ChangeBadge change={g.change} /></span></div>
    <span class="caption">{g.detail}</span>
    {#if mode === 'cost'}<button class="btn ghost" style="align-self: flex-start; padding: 0" onclick={() => open(g.id)}>Ver lançamentos</button>{/if}
    {#each g.top as item (item.name)}
      <div class="row between small"><span class="row ellipsis" style="gap: 8px"><span class="dot" style:background={item.color}></span>{item.name}</span><span class="num">{money(item.cents, { cents: false })}</span></div>
    {:else}<span class="small muted">Nada neste mês.</span>{/each}
  </section>
{/each}
</div>

<style>
  .bar { display: flex; gap: 2px; height: 14px; border-radius: 7px; overflow: hidden; background: rgba(255, 255, 255, 0.06); }
  .bar span { height: 100%; transition: width 0.5s var(--ease); }
  .dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
</style>
