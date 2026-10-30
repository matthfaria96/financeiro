<script lang="ts">
  import { slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { money } from '$lib/core/money';
  import { store } from '$lib/data/store.svelte';
  import { spendKindColor } from '$lib/features/spending';

  /**
   * A explicação da previsão — a única do app (o (i) do card do Início e o da tela de Previsão abrem esta mesma).
   * Diz de onde vem a base, igual em todo mês, e por que um mês pode ficar acima dela.
   */
  let { open = false, base = 0 }: { open?: boolean; base?: number } = $props();
  const months = $derived(store.forecastMonths || 6);
</script>

{#if open}
  <div class="info" transition:slide={{ duration: 300, easing: cubicOut }}>
    <p class="lead">Todo mês parte da mesma base{base ? `, hoje ${money(base, { cents: false })}` : ''}:</p>
    <ul>
      <li><i style:background={spendKindColor.fixed}></i><span><b>Fixas</b>: o valor de cada conta fixa (aluguel, escola, assinaturas).</span></li>
      <li><i style:background={spendKindColor.variable}></i><span><b>Variáveis</b>: a média do que você pagou de luz, água… nos últimos {months} meses.</span></li>
      <li><i style:background={spendKindColor.seasonal}></i><span><b>Sazonais</b>: a média do resto (mercado, lazer, compras) nos últimos {months} meses.</span></li>
    </ul>
    <p class="small muted">As médias contam só os meses que tiveram gasto: com 2 meses de histórico, divide por 2, não por {months}.</p>
    <p class="lead">Um mês fica acima da base quando:</p>
    <ul>
      <li><i class="tag"></i><span>vence nele uma <b>conta anual</b> (IPVA, IPTU, seguro…);</span></li>
      <li><i class="tag"></i><span>a <b>fatura do cartão</b> daquele mês já tem mais compras e parcelas do que a média dos sazonais — aí vale o que já está na fatura.</span></li>
    </ul>
  </div>
{/if}

<style>
  .info { overflow: hidden; margin: 4px 0 12px; padding: 12px 14px; border-radius: 14px; background: rgba(255, 255, 255, 0.04); border: 1px solid var(--stroke); font-size: 13.5px; line-height: 1.5; color: var(--text-2); }
  .lead { margin: 0 0 6px; color: var(--text); font-weight: 500; }
  .lead + ul { margin-bottom: 8px; }
  ul { list-style: none; margin: 0 0 6px; padding: 0; display: flex; flex-direction: column; gap: 5px; }
  li { display: flex; gap: 9px; align-items: flex-start; }
  i { width: 9px; height: 9px; border-radius: 50%; flex: none; margin-top: 6px; }
  i.tag { background: var(--text-3); border-radius: 50%; width: 6px; height: 6px; margin: 8px 1px 0 2px; }
  b { color: var(--text); font-weight: 600; }
  p.small { margin: 0 0 10px; font-size: 12.5px; }
</style>
