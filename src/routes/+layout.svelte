<script lang="ts">
  import '../app.css';
  import { onMount, type Snippet } from 'svelte';
  import { page } from '$app/state';
  import { store } from '$lib/data/store.svelte';
  import { organizer } from '$lib/data/organizer.svelte';
  import { ui } from '$lib/ui/ui.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import Toasts from '$lib/ui/Toasts.svelte';
  import Sidebar from '$lib/ui/Sidebar.svelte';
  import { sectionOf, sections } from '$lib/ui/nav';
  import { hint } from '$lib/ui/hint';
  import Login from '$lib/screens/Login.svelte';
  import Onboarding from '$lib/screens/Onboarding.svelte';
  import SetPassword from '$lib/screens/SetPassword.svelte';
  import ImportFlow from '$lib/screens/import/ImportFlow.svelte';
  import EntryEditor from '$lib/screens/transactions/EntryEditor.svelte';
  import NewEntry from '$lib/screens/transactions/NewEntry.svelte';
  import AccountEditor from '$lib/screens/accounts/AccountEditor.svelte';
  import BillsSheet from '$lib/screens/bills/BillsSheet.svelte';
  import { seedDemo } from '$lib/features/demoData';
  import { exitDemo } from '$lib/data/demoMode';

  let { children }: { children: Snippet } = $props();

  // Celular: os três botões (Lançamentos, Início, Notas). Configuração fica no Início.
  const tabs = sections;
  const active = $derived(sectionOf(page.route.id ?? '/'));

  let dragging = $state(false);

  // Carro, casa e listas: carregam quando a casa pessoal está pronta; saem junto com o login.
  $effect(() => {
    if (store.status === 'ready' && store.household) void organizer.start();
    if (store.status === 'signedOut') organizer.reset();
  });

  onMount(async () => {
    await store.start();
    if (store.demo) {
      // ?demo&vazio: demonstração sem dados, para ver o primeiro acesso.
      if (!new URLSearchParams(location.search).has('vazio')) await seedDemo();
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
    <Sidebar />
    <main>
      {#if store.demo}
        <div class="demo-bar glass" role="status">
          <Icon name="sparkles" size={16} /><span class="grow"><b>Demonstração</b> · dados fictícios, nada é salvo e nada mexe na sua conta</span>
          <button class="btn sm" onclick={exitDemo}>Sair</button>
        </div>
      {/if}
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
  <AccountEditor bind:open={ui.newAccountOpen} />
  <BillsSheet />
  {#if dragging}<div class="dropzone"><Icon name="import" size={40} /><p>Solte os extratos para importar</p></div>{/if}
{/if}
<Toasts />

<style>
  .splash { min-height: 100dvh; display: grid; place-items: center; align-content: center; gap: 12px; }
  .logo { width: 72px; height: 72px; border-radius: 20px; display: grid; place-items: center; color: #b8ffe6; background: linear-gradient(160deg, #14503e, #050c09); box-shadow: 0 10px 40px rgba(43, 212, 164, 0.25), inset 0 0 0 1px rgba(255, 255, 255, 0.08); }
  .shell { min-height: 100dvh; }
  main { min-width: 0; }
  .shell > :global(.sidebar) { display: none; }
  .tabbar {
    position: fixed; z-index: 50; left: 12px; right: 12px; bottom: calc(10px + env(safe-area-inset-bottom));
    display: grid; grid-template-columns: repeat(3, 1fr); height: 66px; border-radius: 30px; padding: 0 6px;
    background: rgba(28, 36, 33, 0.66); backdrop-filter: blur(24px) saturate(1.8); -webkit-backdrop-filter: blur(24px) saturate(1.8);
    border: 1px solid rgba(255, 255, 255, 0.12); box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
  }
  .tabbar a { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; color: var(--text-2); font-size: 10.5px; font-weight: 600; border-radius: 24px; transition: color 0.2s; }
  .tabbar a.on { color: var(--accent); }
  .tabbar a span { white-space: nowrap; }
  @media (min-width: 960px) {
    .shell { display: grid; grid-template-columns: 220px minmax(0, 1fr); }
    .tabbar { display: none; }
    .shell > :global(.sidebar) { display: flex; }
    main { padding-top: 0; }
  }
  .demo-bar { position: sticky; top: 8px; z-index: 40; margin: 8px 16px 0; display: flex; align-items: center; gap: 10px; padding: 8px 10px 8px 14px; border-radius: 14px; font-size: 13.5px; color: var(--text-2); }
  .demo-bar b { color: var(--warning); }
  .demo-bar :global(svg) { color: var(--warning); flex: none; }
  .demo-bar .btn.sm { height: 30px; padding: 0 12px; font-size: 13px; }
  @media (min-width: 960px) { .demo-bar { margin: 12px auto 0; max-width: 1108px; width: calc(100% - 72px); } }
  .dropzone { position: fixed; inset: 12px; z-index: 150; border-radius: 28px; border: 2px dashed var(--accent); background: rgba(8, 18, 15, 0.85); display: grid; place-items: center; align-content: center; gap: 8px; color: var(--accent); font-weight: 600; pointer-events: none; }
</style>
