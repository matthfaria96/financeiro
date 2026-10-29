<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import { organizer } from '$lib/data/organizer.svelte';
  import SectionTitle from '$lib/ui/SectionTitle.svelte';
  import Toggle from '$lib/ui/Toggle.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import { hint } from '$lib/ui/hint';
  import { prefs } from '$lib/ui/prefs.svelte';
  import MoreRow from '$lib/screens/more/MoreRow.svelte';
  import { inScopeAccount } from '$lib/features/model';

  /** Ajustes: tudo o que não é do dia a dia num lugar só (estilo Ajustes do Mac). */
  let full = $state(prefs.full);
  $effect(() => {
    if (full !== prefs.full) prefs.setFull(full);
  });
</script>

<div class="page narrow">
  <h1 class="title">Ajustes</h1>

  <div class="organize">
    <SectionTitle title="Organizar" />
    <div class="card flush list">
      <MoreRow href="#/mais/compras" title="Lista de compras" detail="Lista do mercado para marcar no carrinho." icon="basket" color="#2BD4A4" count={organizer.shopping_lists.filter((l) => !l.done_at).length || null} />
      <MoreRow href="#/mais/projetos" title="Casa e compras" detail="O que comprar ou contratar para a casa." icon="house" color="#38D9F5" />
      <MoreRow href="#/mais/carro" title="Carro" detail="Abastecimentos, gastos e revisões." icon="car" color="#FF9F1C" />
      <MoreRow href="#/relatorios" title="Relatórios" detail="Para onde foi o dinheiro e mês a mês." icon="reports" color="#9085E9" />
    </div>
  </div>

  <SectionTitle title="Suas contas" />
  <div class="card flush list">
    <MoreRow href="#/mais/contas" title="Contas e cartões" detail="Bancos, cartões, investimentos e dinheiro." icon="card" color="#1E90FF" count={store.accounts.filter(inScopeAccount).length} />
    <MoreRow href="#/mais/importacoes" title="Importações" detail="Extratos importados: mover ou desfazer." icon="history" color="#4DD0E1" count={store.import_batches.length || null} />
  </div>

  <SectionTitle title="Como o app organiza" />
  <div class="card flush list">
    <MoreRow href="#/mais/categorias" title="Categorias" detail="Mercado, casa, carro… e as subcategorias." icon="home" color="#FF9F1C" />
    <MoreRow href="#/mais/estabelecimentos" title="Estabelecimentos" detail="Lojas reconhecidas e seus logos." icon="store" color="#E056FD" />
    <MoreRow href="#/mais/pessoas" title="Pessoas" detail="De quem é cada gasto." icon="users" color="#FF8FAB" />
    {#if store.workspacesEnabled}<MoreRow href="#/mais/areas" title="Áreas de trabalho" detail="Espaços separados, cada um com suas contas." icon="layers" color="#2EC4B6" />{/if}
  </div>

  <SectionTitle title="Família e conta" />
  <div class="card flush list">
    <MoreRow href="#/mais/compartilhar" title="Compartilhar" detail="Lista, casa e carro com sua esposa." icon="share" color="#FF8FAB" count={organizer.shared.length || null} />
    <MoreRow href="#/mais/ajustes" title="Conta e preferências" detail="Senha, convite, previsão e demonstração." icon="settings" color="#8E8E93" />
  </div>

  <SectionTitle title="Visão" />
  <div class="form-group">
    <div class="form-row" use:hint={['Visão completa', 'Liga painéis extras: previsão do mês, Mês a mês e calendário de contas no menu, contas no menu e filtros a mais. Vale só neste aparelho.']}>
      <span class="ico"><Icon name="layers" size={16} color="#fff" /></span>
      <span class="grow"><span>Visão completa</span><span class="caption block">Mais painéis e gráficos. Desligada, o app mostra só o essencial.</span></span>
      <Toggle label="Visão completa" bind:checked={full} />
    </div>
  </div>
</div>

<style>
  .title { margin: 6px 4px; font: 700 30px var(--font-display); letter-spacing: -0.02em; }
  @media (min-width: 960px) { .organize { display: none; } }
  .ico { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; flex: none; background: linear-gradient(160deg, #7c8cf8, #3b4596); }
  .block { display: block; }
</style>
