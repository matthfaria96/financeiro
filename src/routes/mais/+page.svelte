<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import SectionTitle from '$lib/ui/SectionTitle.svelte';
  import MoreRow from '$lib/screens/more/MoreRow.svelte';
  import { inScopeAccount } from '$lib/features/model';
  import { organizer } from '$lib/data/organizer.svelte';
  const openLists = $derived(organizer.shopping_lists.filter((l) => !l.done_at).length);
  const pendingItems = $derived(organizer.project_items.filter((i) => !i.done).length);
</script>

<div class="page">
  <h1 class="title">Mais</h1>
  <SectionTitle title="Cadastros" />
  <div class="card flush list">
    <MoreRow href="#/mais/contas" title="Contas e cartões" detail="Bancos, cartões, investimentos e dinheiro." icon="card" color="#1E90FF" count={store.accounts.filter(inScopeAccount).length} />
    <MoreRow href="#/mais/categorias" title="Categorias" detail="Categorias, subcategorias e fixo ou variável." icon="home" color="#FF9F1C" count={store.categories.filter((c) => !c.parent_id).length} />
    <MoreRow href="#/mais/estabelecimentos" title="Estabelecimentos" detail="Logos e fotos, e como cada lugar é reconhecido." icon="store" color="#E056FD" count={store.merchants.length} />
    <MoreRow href="#/mais/pessoas" title="Pessoas" detail="De quem é cada gasto: você, esposa, casa, filho…" icon="users" color="#FF8FAB" count={store.people.length} />
    {#if store.workspacesEnabled}<MoreRow href="#/mais/areas" title="Áreas de trabalho" detail="Espaços separados, cada um com suas contas." icon="layers" color="#2EC4B6" count={store.workspaces.length} />{/if}
  </div>
  <SectionTitle title="Organizar" />
  <div class="card flush list">
    <MoreRow href="#/mais/compras" title="Lista de compras" detail="Lista do mercado: marque no carrinho e duplique para a próxima." icon="basket" color="#2BD4A4" count={openLists || null} />
    <MoreRow href="#/mais/projetos" title="Casa e compras" detail="Apartamento e compras planejadas: prioridade, valor e o que já foi feito." icon="house" color="#38D9F5" count={pendingItems || null} />
    <MoreRow href="#/mais/carro" title="Carro" detail="Abastecimentos com km/L, gastos, seguro, IPVA e plano de revisões." icon="car" color="#FF9F1C" count={organizer.vehicles.length || null} />
    <MoreRow href="#/mais/compartilhar" title="Compartilhar" detail="Escolha o que sua esposa vê; ela faz o mesmo com o dela." icon="share" color="#FF8FAB" count={organizer.shared.length || null} />
  </div>
  <SectionTitle title="Arquivos" />
  <div class="card flush list"><MoreRow href="#/mais/importacoes" title="Importações" detail="Arquivos importados: mover para outra conta ou desfazer." icon="history" color="#4DD0E1" count={store.import_batches.length} /></div>
  <SectionTitle title="App" />
  <div class="card flush list"><MoreRow href="#/mais/ajustes" title="Ajustes" detail="Casa e convite, previsão, áreas de trabalho e conta." icon="settings" color="#8E8E93" /></div>
</div>

<style>
  .title { margin: 6px 4px; font: 700 30px var(--font-display); letter-spacing: -0.02em; }
</style>
