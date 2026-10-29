<script lang="ts">
  import { slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { store } from '$lib/data/store.svelte';
  import { prefs } from '$lib/ui/prefs.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import Toggle from '$lib/ui/Toggle.svelte';
  import SectionTitle from '$lib/ui/SectionTitle.svelte';
  import SubHeader from '$lib/screens/more/SubHeader.svelte';
  import MoreRow from '$lib/screens/more/MoreRow.svelte';

  /** Configurar Lançamentos: como o mês é mostrado (o que paga × o que gastou), categorias, estabelecimentos, pessoas e importações. */
  let info = $state(false);
</script>

<div class="page narrow">
  <SubHeader title="Configurar Lançamentos" back="#/transacoes" />

  <SectionTitle title="Como o mês é mostrado" />
  <div class="form-group">
    <div class="form-row">
      <span class="field-label grow">Mostrar compras pelo dia em que foram feitas<span class="caption block">{prefs.creditByPurchase ? 'Ligado: o mês mostra o que você gastou nele.' : 'Desligado: o mês mostra o que você paga nele.'}</span></span>
      <button class="icon-btn info" class:on={info} aria-label="Como funciona" aria-expanded={info} onclick={() => (info = !info)}><Icon name="info" size={16} /></button>
      <Toggle label="Mostrar compras pelo dia em que foram feitas" checked={prefs.creditByPurchase} onchange={(v) => prefs.setCreditByPurchase(v)} />
    </div>
    {#if info}
      <div class="explain" transition:slide={{ duration: 280, easing: cubicOut }}>
        <p><b>Desligado (padrão) — o que você paga no mês.</b> O que sai do seu bolso naquele mês: contas, Pix e as faturas do cartão que vencem nele. Compra parcelada entra só com a parcela do mês: R$ 10.000 em 5x aparecem como <b>R$ 2.000 · Parcela 2/5</b>.</p>
        <p><b>Ligado — o que você gastou no mês.</b> Cada compra no dia em que foi feita, com o valor inteiro, mesmo parcelada: os mesmos R$ 10.000 em 5x aparecem uma vez, no mês da compra, como <b>R$ 10.000 · 5x de R$ 2.000</b>.</p>
        <p class="muted">A Previsão do Início usa sempre o que você paga. A escolha vale só neste aparelho.</p>
      </div>
    {/if}
  </div>

  <SectionTitle title="Organização" />
  <div class="card flush list">
    <MoreRow href="#/mais/categorias" title="Categorias" detail="Criar, renomear e organizar as subcategorias." icon="tag" color="#F2A33A" />
    <MoreRow href="#/mais/estabelecimentos" title="Estabelecimentos" detail="Lojas reconhecidas e seus logos." icon="store" color="#E056FD" />
    <MoreRow href="#/mais/pessoas" title="De quem é cada gasto" detail="Eu, esposa, casa, filho… (etiquetas nos lançamentos)." icon="users" color="#FF8FAB" />
  </div>
  <div class="card flush list" style="margin-top: 12px">
    <MoreRow href="#/mais/importacoes" title="Importações" detail="Extratos importados: mover ou desfazer." icon="history" color="#4DD0E1" count={store.import_batches.length || null} />
  </div>
</div>

<style>
  .block { display: block; margin-top: 2px; font-weight: 400; }
  .info { width: 32px; height: 32px; color: var(--text-2); flex: none; }
  .info.on { color: var(--accent); border-color: rgba(43, 212, 164, 0.4); background: var(--accent-soft); }
  .explain { padding: 4px 16px 14px; overflow: hidden; }
  .explain p { margin: 10px 0 0; font-size: 14px; line-height: 1.5; color: var(--text-2); }
  .explain b { color: var(--text); }
</style>
