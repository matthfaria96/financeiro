<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import SubHeader from '$lib/screens/more/SubHeader.svelte';
  import MoreRow from '$lib/screens/more/MoreRow.svelte';
  import { inScopeBill } from '$lib/features/model';

  /** Configurar Lançamentos: contas fixas, categorias, estabelecimentos, de quem é cada gasto e importações. */
  const bills = $derived(store.bills.filter((b) => b.active && inScopeBill(b)));
  const monthly = $derived(bills.filter((b) => b.frequency !== 'yearly').length);
  const yearly = $derived(bills.filter((b) => b.frequency === 'yearly').length);
</script>

<div class="page narrow">
  <SubHeader title="Configurar Lançamentos" back="#/transacoes" />
  <div class="card flush list">
    <MoreRow href="#/contas-fixas" title="Contas fixas" detail="{monthly} mensais · {yearly} anuais · aluguel, luz, IPVA…" icon="calendar" color="#FF9F1C" />
  </div>
  <div class="card flush list">
    <MoreRow href="#/mais/categorias" title="Categorias" detail="Criar, renomear e organizar as subcategorias." icon="tag" color="#F2A33A" />
    <MoreRow href="#/mais/estabelecimentos" title="Estabelecimentos" detail="Lojas reconhecidas e seus logos." icon="store" color="#E056FD" />
    <MoreRow href="#/mais/pessoas" title="De quem é cada gasto" detail="Eu, esposa, casa, filho… (etiquetas nos lançamentos)." icon="users" color="#FF8FAB" />
  </div>
  <div class="card flush list">
    <MoreRow href="#/mais/importacoes" title="Importações" detail="Extratos importados: mover ou desfazer." icon="history" color="#4DD0E1" count={store.import_batches.length || null} />
  </div>
</div>
