<script lang="ts">
  import '../app.css';
  import { onMount, type Snippet } from 'svelte';
  import { page } from '$app/state';
  import { store } from '$lib/data/store.svelte';
  import { ui } from '$lib/ui/ui.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import Toasts from '$lib/ui/Toasts.svelte';
  import { hint } from '$lib/ui/hint';
  import Login from '$lib/screens/Login.svelte';
  import Onboarding from '$lib/screens/Onboarding.svelte';
  import SetPassword from '$lib/screens/SetPassword.svelte';
  import ImportFlow from '$lib/screens/import/ImportFlow.svelte';
  import EntryEditor from '$lib/screens/transactions/EntryEditor.svelte';
  import NewEntry from '$lib/screens/transactions/NewEntry.svelte';
  import { seedDemo } from '$lib/features/demoData';

  let { children }: { children: Snippet } = $props();

  const tabs = [
    { href: '#/', id: '/', label: 'Início', icon: 'home' },
    { href: '#/transacoes', id: '/transacoes', label: 'Transações', icon: 'transactions' },
    { href: '#/relatorios', id: '/relatorios', label: 'Relatórios', icon: 'reports' },
    { href: '#/contas-fixas', id: '/contas-fixas', label: 'Contas fixas', icon: 'calendar' },
    { href: '#/mais', id: '/mais', label: 'Mais', icon: 'more' }
  ];
  const active = $derived.by(() => {
    const route = page.route.id ?? '/';
    if (route === '/') return '/';
    return tabs.find((tab) => tab.id !== '/' && route.startsWith(tab.id))?.id ?? (route.startsWith('/contas') || route.startsWith('/a-pagar') ? '/' : '/mais');
  });

  let dragging = $state(false);

  onMount(async () => {
    await store.start();
    if (store.demo) {
      await seedDemo();
      // Só na demonstração: ?abrir=importar | lancamento | conta, para conferir as folhas.
      const open = new URLSearchParams(location.search).get('abrir');
      if (open === 'importar') ui.startImport();
      if (open === 'conta') ui.newAccountOpen = true;
      if (open === 'lancamento') ui.editEntry(store.entries.find((e) => e.merchant_id && e.bill_due_date)?.id ?? '');
    }
  });

  // Arrastar arquivos de extrato para a janela abre a importação com eles.
  function drop(event: DragEvent) {
    event.preventDefault();
    dragging = false;
    const files = [...(event.dataTransfer?.files ?? [])];
    if (files.length && store.status === 'ready') ui.startImport(null, files);
  }
</script>

<svelte:window ondragover={(e) => { e.preventDefault(); dragging = store.status === 'ready'; }} ondragleave={(e) => { if (!e.relatedTarget) dragging = false; }} ondrop={drop} />

{#if store.status === 'loading'}
  <div class="splash"><div class="logo"><Icon name="trending-up" size={34} stroke={2.4} /></div></div>
{:else if store.status === 'signedOut'}
  <Login />
{:else if store.status === 'setPassword'}
  <SetPassword />
{:else if store.status === 'noHousehold'}
  <Onboarding />
{:else if store.status === 'error'}
  <div class="splash stack" style="padding: 32px; text-align: center">
    <Icon name="alert" size={40} color="var(--negative)" />
    <h2>Não consegui carregar seus dados</h2>
    <p class="muted">{store.error}</p>
    <button class="btn primary" onclick={() => location.reload()}>Tentar de novo</button>
  </div>
{:else}
  <div class="shell">
    <nav class="sidebar" aria-label="Seções">
      <div class="brand"><span class="logo sm"><Icon name="trending-up" size={18} stroke={2.6} /></span>Financeiro</div>
      {#each tabs as tab (tab.id)}
        <a href={tab.href} class="side-link" class:on={active === tab.id} aria-current={active === tab.id ? 'page' : undefined}>
          <Icon name={tab.icon} size={19} />{tab.label}
        </a>
      {/each}
      <div class="side-bottom">
        <button class="btn primary block" onclick={() => ui.startImport()} use:hint={['Importar extrato', 'Escolha a conta e o arquivo do banco (OFX, CSV ou PDF). Você confere antes de gravar.']}>
          <Icon name="import" size={17} />Importar extrato
        </button>
        {#if store.demo}<p class="caption" style="margin: 10px 4px 0">Demonstração: dados fictícios, nada é salvo.</p>{/if}
      </div>
    </nav>
    <main>
      {@render children()}
    </main>
    <nav class="tabbar" aria-label="Seções">
      {#each tabs as tab (tab.id)}
        <a href={tab.href} class:on={active === tab.id} aria-current={active === tab.id ? 'page' : undefined}>
          <Icon name={tab.icon} size={23} stroke={active === tab.id ? 2.3 : 1.9} /><span>{tab.label}</span>
        </a>
      {/each}
    </nav>
  </div>
  <ImportFlow />
  <EntryEditor />
  <NewEntry />
  {#if dragging}<div class="dropzone"><Icon name="import" size={40} /><p>Solte os extratos para importar</p></div>{/if}
{/if}
<Toasts />

<style>
  .splash { min-height: 100dvh; display: grid; place-items: center; align-content: center; gap: 12px; }
  .logo { width: 72px; height: 72px; border-radius: 20px; display: grid; place-items: center; color: #b8ffe6; background: linear-gradient(160deg, #14503e, #050c09); box-shadow: 0 10px 40px rgba(43, 212, 164, 0.25), inset 0 0 0 1px rgba(255, 255, 255, 0.08); }
  .logo.sm { width: 30px; height: 30px; border-radius: 9px; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1); }
  .shell { min-height: 100dvh; }
  main { min-width: 0; }
  .sidebar { display: none; }
  .tabbar {
    position: fixed; z-index: 50; left: 12px; right: 12px; bottom: calc(10px + env(safe-area-inset-bottom));
    display: grid; grid-template-columns: repeat(5, 1fr); height: 64px; border-radius: 30px; padding: 0 6px;
    background: rgba(28, 36, 33, 0.66); backdrop-filter: blur(24px) saturate(1.8); -webkit-backdrop-filter: blur(24px) saturate(1.8);
    border: 1px solid rgba(255, 255, 255, 0.12); box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
  }
  .tabbar a { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; color: var(--text-2); font-size: 10.5px; font-weight: 600; border-radius: 24px; transition: color 0.2s; }
  .tabbar a.on { color: var(--accent); }
  .tabbar a span { white-space: nowrap; }
  @media (min-width: 960px) {
    .shell { display: grid; grid-template-columns: var(--sidebar) 1fr; }
    .tabbar { display: none; }
    .sidebar {
      display: flex; flex-direction: column; gap: 2px; position: sticky; top: 0; height: 100dvh; padding: 18px 12px;
      background: rgba(18, 24, 22, 0.75); border-right: 1px solid var(--stroke); backdrop-filter: blur(20px);
    }
    .brand { display: flex; align-items: center; gap: 10px; font: 700 18px var(--font-display); padding: 4px 8px 18px; }
    .side-link { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 11px; color: var(--text-2); font-weight: 500; transition: background 0.2s, color 0.2s; }
    .side-link:hover { background: rgba(255, 255, 255, 0.05); color: var(--text); }
    .side-link.on { background: rgba(255, 255, 255, 0.09); color: var(--text); }
    .side-link.on :global(svg) { color: var(--accent); }
    .side-bottom { margin-top: auto; }
    main { padding-top: 12px; }
  }
  .dropzone { position: fixed; inset: 12px; z-index: 150; border-radius: 28px; border: 2px dashed var(--accent); background: rgba(8, 18, 15, 0.85); display: grid; place-items: center; align-content: center; gap: 8px; color: var(--accent); font-weight: 600; pointer-events: none; }
</style>
