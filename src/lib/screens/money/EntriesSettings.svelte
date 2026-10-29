<script lang="ts">
  import { goto } from '$app/navigation';
  import Sheet from '$lib/ui/Sheet.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import { store } from '$lib/data/store.svelte';
  import { ui } from '$lib/ui/ui.svelte';
  import { inScopeBill } from '$lib/features/model';

  /** Configurar Lançamentos: contas fixas (mensais e anuais), categorias e estabelecimentos. */
  let { open = $bindable() }: { open: boolean } = $props();
  const bills = $derived(store.bills.filter((b) => b.active && inScopeBill(b)));
  const monthly = $derived(bills.filter((b) => b.frequency !== 'yearly').length);
  const yearly = $derived(bills.filter((b) => b.frequency === 'yearly').length);

  function openBills() {
    open = false;
    ui.billsOpen = true;
  }
  function go(path: string) {
    open = false;
    void goto(path);
  }
</script>

<Sheet bind:open title="Configurar Lançamentos">
  <div class="form-group first">
    <button class="form-row item" onclick={openBills}>
      <span class="ico" style:--c="#ff9f1c"><Icon name="calendar" size={17} /></span>
      <span class="grow">Contas fixas<span class="caption block">{monthly} mensais · {yearly} anuais · aluguel, luz, IPVA…</span></span>
      <Icon name="chevron-right" size={15} class="faint" />
    </button>
    <button class="form-row item" onclick={() => go('#/mais/categorias')}>
      <span class="ico" style:--c="#f2a33a"><Icon name="tag" size={17} /></span>
      <span class="grow">Categorias<span class="caption block">Criar, renomear e organizar as subcategorias.</span></span>
      <Icon name="chevron-right" size={15} class="faint" />
    </button>
    <button class="form-row item" onclick={() => go('#/mais/estabelecimentos')}>
      <span class="ico" style:--c="#d65ce0"><Icon name="store" size={17} /></span>
      <span class="grow">Estabelecimentos<span class="caption block">Lojas reconhecidas e seus logos.</span></span>
      <Icon name="chevron-right" size={15} class="faint" />
    </button>
  </div>
  <a class="general" href="#/mais" onclick={() => (open = false)}>Todas as configurações</a>
</Sheet>

<style>
  .first { margin-top: 12px; }
  .item { width: 100%; border: 0; background: none; text-align: left; font-size: 15.5px; }
  .ico { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; flex: none; color: #fff; background: linear-gradient(160deg, var(--c), color-mix(in srgb, var(--c) 60%, black)); }
  .block { display: block; margin-top: 1px; }
  .general { display: block; text-align: center; margin-top: 22px; font-size: 12px; color: var(--text-3); }
</style>
