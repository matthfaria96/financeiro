<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import { organizer } from '$lib/data/organizer.svelte';
  import SectionTitle from '$lib/ui/SectionTitle.svelte';
  import MoreRow from '$lib/screens/more/MoreRow.svelte';
  import { inScopeAccount } from '$lib/features/model';

  /** Configuração: tudo o que não é do dia a dia num lugar só (estilo Ajustes do Mac). */
</script>

<div class="page narrow">
  <h1 class="title">Configuração</h1>

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
    <MoreRow href="#/mais/compartilhar" title="Compartilhar" detail="Notas (listas, desejos, transporte) com sua esposa." icon="share" color="#FF8FAB" count={organizer.shared.length || null} />
    <MoreRow href="#/mais/ajustes" title="Conta e preferências" detail="Senha, convite, previsão e demonstração." icon="settings" color="#8E8E93" />
  </div>

  <SectionTitle title="Análises" />
  <div class="card flush list">
    <MoreRow href="#/relatorios" title="Relatórios" detail="Por categoria, pessoa ou conta, mês a mês." icon="reports" color="#9085E9" />
    <MoreRow href="#/relatorios/planilha" title="Mês a mês" detail="Todos os meses lado a lado, como planilha." icon="table" color="#38D9F5" />
  </div>
</div>

<style>
  .title { margin: 6px 4px; font: 700 30px var(--font-display); letter-spacing: -0.02em; }
</style>
