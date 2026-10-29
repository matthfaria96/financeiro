<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import Sheet from '$lib/ui/Sheet.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import { addBusiness } from '$lib/features/ambient';

  /** Adicionar empresa (MEI): cria o ambiente separado com DAS, listas de trabalho e o controle do limite. */
  let { open = $bindable() }: { open: boolean } = $props();
  let name = $state('');
  let busy = $state(false);
  $effect(() => {
    if (open) name = '';
  });

  async function create() {
    busy = true;
    try {
      const business = await addBusiness(name);
      store.setWorkspace(business.id);
      store.toast(`${business.name} criada. Cadastre as contas da empresa e mova-as para ela.`);
      open = false;
    } finally {
      busy = false;
    }
  }
</script>

<Sheet bind:open title="Adicionar empresa">
  {#snippet actions()}<button class="btn primary" disabled={busy} onclick={create}>Criar</button>{/snippet}
  <div class="form-group" style="margin-top: 10px">
    <label class="form-row"><span class="field-label">Nome</span><input class="field" placeholder="ex.: Faria Design (MEI)" bind:value={name} /></label>
  </div>
  <div class="stack-sm list">
    <span class="caption">O ambiente da empresa vem com:</span>
    <span class="row small"><Icon name="layers" size={15} />Contas, lançamentos e relatórios separados da vida pessoal</span>
    <span class="row small"><Icon name="briefcase" size={15} />Entradas agrupadas por cliente</span>
    <span class="row small"><Icon name="gauge" size={15} />Faturamento do ano × limite do MEI (R$ 81 mil)</span>
    <span class="row small"><Icon name="calendar" size={15} />DAS do MEI nas contas fixas (todo dia 20)</span>
    <span class="row small"><Icon name="list-checks" size={15} />Notas: notas fiscais a emitir, clientes a cobrar, insumos</span>
  </div>
  <p class="form-footer">Tudo que já existe fica no ambiente Pessoal. Depois, em Configuração › Ambientes, escolha de qual ambiente é cada conta.</p>
</Sheet>

<style>
  .list { margin: 16px 4px 0; }
  .list .row { gap: 10px; color: var(--text-2); }
  .list :global(svg) { color: var(--accent); flex: none; }
</style>
