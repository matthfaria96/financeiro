<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import { organizer } from '$lib/data/organizer.svelte';
  import SectionTitle from '$lib/ui/SectionTitle.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import { hint } from '$lib/ui/hint';
  import MoreRow from '$lib/screens/more/MoreRow.svelte';
  import FamilySheet from '$lib/screens/settings/FamilySheet.svelte';
  import BusinessSheet from '$lib/screens/settings/BusinessSheet.svelte';
  import { ambients } from '$lib/features/ambient';
  import { inScopeAccount } from '$lib/features/model';

  /** Configuração: ambientes (pessoal/empresa), família e o resto do que não é do dia a dia. */
  let familyOpen = $state(false);
  let businessOpen = $state(false);
  const list = $derived(ambients());
  const fullAccess = $derived(store.members);
  const sharedMembers = $derived(organizer.shared.flatMap((space) => organizer.members.filter((m) => m.household_id === space.id).map((m) => ({ ...m, space: space.name }))));
  const nameOf = (m: { user_id: string; display_name: string }) => (m.user_id === store.userId ? 'Você' : m.display_name || 'Sem nome');
</script>

<div class="page narrow">
  <h1 class="title">Configuração</h1>

  <SectionTitle title="Ambientes" />
  <div class="ambients">
    {#if list.length}
      {#each list as w (w.id)}
        <button class="card amb" class:on={store.scopeId === w.id} style:--c={w.color} onclick={() => store.setWorkspace(w.id)} use:hint={[w.name, 'Toque para usar este ambiente. As contas, gastos e Notas mudam para os dele.']}>
          <span class="ico"><Icon name={w.symbol} size={20} color="#fff" /></span>
          <b>{w.name}</b><span class="caption">{w.kind === 'business' ? 'Empresa' : 'Pessoal'} · {store.accounts.filter((a) => a.workspace_id === w.id).length} contas</span>
        </button>
      {/each}
    {:else}
      <div class="card amb on" style:--c="#2BD4A4"><span class="ico"><Icon name="person" size={20} color="#fff" /></span><b>Pessoal</b><span class="caption">tudo junto, hoje</span></div>
    {/if}
    <button class="card amb add" onclick={() => (businessOpen = true)} use:hint={['Adicionar empresa', 'Um ambiente separado para o MEI: contas, clientes, DAS e limite de faturamento.']}>
      <span class="ico plus"><Icon name="plus" size={20} /></span><b>Adicionar empresa</b><span class="caption">MEI separado do pessoal</span>
    </button>
  </div>
  {#if list.length}<a class="link small" href="#/mais/areas">Ambiente de cada conta e editar ambientes</a>{/if}

  <SectionTitle title="Família"><button class="btn ghost" onclick={() => (familyOpen = true)}><Icon name="plus" size={15} />Adicionar</button></SectionTitle>
  <div class="card flush list">
    {#each fullAccess as m (m.user_id)}
      <div class="list-row"><span class="avatar">{nameOf(m).slice(0, 1)}</span><span class="grow">{nameOf(m)}</span><span class="pill full">Tudo</span></div>
    {/each}
    {#each sharedMembers.filter((m) => m.user_id !== store.userId && !fullAccess.some((f) => f.user_id === m.user_id)) as m (m.user_id + m.space)}
      <div class="list-row"><span class="avatar">{nameOf(m).slice(0, 1)}</span><span class="grow">{nameOf(m)}</span><span class="pill notes">Notas · {m.space}</span></div>
    {/each}
    <button class="list-row add-row" onclick={() => (familyOpen = true)}><span class="avatar plus"><Icon name="plus" size={15} /></span><span class="grow">Adicionar familiar</span><Icon name="chevron-right" size={15} class="faint" /></button>
  </div>
  <p class="form-footer"><b>Tudo</b>: vê e edita o financeiro. <b>Notas</b>: vê só o que você marcar como compartilhado (listas, desejos, carro). <a class="link" href="#/mais/compartilhar">Espaços compartilhados</a></p>

  <SectionTitle title="Suas contas" />
  <div class="card flush list">
    <MoreRow href="#/mais/contas" title="Contas e cartões" detail="Bancos, cartões, investimentos e dinheiro." icon="card" color="#1E90FF" count={store.accounts.filter(inScopeAccount).length} />
    <MoreRow href="#/mais/importacoes" title="Importações" detail="Extratos importados: mover ou desfazer." icon="history" color="#4DD0E1" count={store.import_batches.length || null} />
  </div>

  <SectionTitle title="Como o app organiza" />
  <div class="card flush list">
    <MoreRow href="#/mais/categorias" title="Categorias" detail="Mercado, casa, carro… e as subcategorias." icon="home" color="#FF9F1C" />
    <MoreRow href="#/mais/estabelecimentos" title="Estabelecimentos" detail="Lojas reconhecidas e seus logos." icon="store" color="#E056FD" />
    <MoreRow href="#/mais/pessoas" title="De quem é cada gasto" detail="Eu, esposa, casa, filho… (etiquetas nos lançamentos)." icon="users" color="#FF8FAB" />
  </div>

  <SectionTitle title="Análises" />
  <div class="card flush list">
    <MoreRow href="#/relatorios" title="Relatórios" detail="Por categoria, pessoa ou conta, mês a mês." icon="reports" color="#9085E9" />
    <MoreRow href="#/relatorios/planilha" title="Mês a mês" detail="Todos os meses lado a lado, como planilha." icon="table" color="#38D9F5" />
  </div>

  <SectionTitle title="Conta" />
  <div class="card flush list">
    <MoreRow href="#/mais/ajustes" title="Conta e preferências" detail="Senha, previsão, painéis avançados e demonstração." icon="settings" color="#8E8E93" />
  </div>
</div>
<FamilySheet bind:open={familyOpen} />
<BusinessSheet bind:open={businessOpen} />

<style>
  .title { margin: 6px 4px; font: 700 30px var(--font-display); letter-spacing: -0.02em; }
  .ambients { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 12px; }
  .amb { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; text-align: left; padding: 16px; }
  .amb.on { border-color: var(--c); box-shadow: 0 0 0 1px var(--c) inset, var(--shadow); }
  .amb b { margin-top: 8px; font-size: 16px; }
  .ico { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; background: linear-gradient(160deg, var(--c), color-mix(in srgb, var(--c) 55%, black)); }
  .ico.plus { background: rgba(255, 255, 255, 0.07); color: var(--accent); }
  .add { border-style: dashed; }
  .link { color: var(--accent); margin-left: 4px; }
  .avatar { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; flex: none; font-weight: 700; background: rgba(255, 143, 171, 0.18); color: #ff8fab; }
  .avatar.plus { background: var(--accent-soft); color: var(--accent); }
  .add-row { color: var(--accent); }
  .pill.full { color: var(--accent); background: var(--accent-soft); }
  .pill.notes { color: #ff8fab; background: rgba(255, 143, 171, 0.14); }
</style>
