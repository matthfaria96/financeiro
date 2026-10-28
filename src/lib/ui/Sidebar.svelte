<script lang="ts">
  import { page } from '$app/state';
  import { store } from '$lib/data/store.svelte';
  import { organizer } from '$lib/data/organizer.svelte';
  import { ui } from './ui.svelte';
  import { money } from '$lib/core/money';
  import Icon from './Icon.svelte';
  import BankCard from './BankCard.svelte';
  import { hint } from './hint';
  import { balanceOf, inScopeAccount } from '$lib/features/model';

  /** Menu lateral do computador: tudo à mão (visão, organizar, contas com saldo, cadastros e ajustes). */
  interface Link {
    path: string;
    label: string;
    icon: string;
    color: string;
    count?: number | null;
  }
  const sections = $derived<{ id: string; title: string; links: Link[] }[]>([
    { id: 'visao', title: 'Visão geral', links: [
      { path: '/', label: 'Início', icon: 'home', color: '#2bd4a4' },
      { path: '/transacoes', label: 'Transações', icon: 'transactions', color: '#3987e5' },
      { path: '/relatorios', label: 'Relatórios', icon: 'reports', color: '#9085e9' },
      { path: '/relatorios/planilha', label: 'Mês a mês', icon: 'table', color: '#38d9f5' },
      { path: '/contas-fixas', label: 'Contas fixas', icon: 'calendar', color: '#ff9f1c' },
      { path: '/a-pagar', label: 'A pagar', icon: 'receipt', color: '#ff6b6b' }
    ] },
    { id: 'organizar', title: 'Organizar', links: [
      { path: '/mais/compras', label: 'Lista de compras', icon: 'basket', color: '#2bd4a4', count: organizer.shopping_lists.filter((l) => !l.done_at).length || null },
      { path: '/mais/projetos', label: 'Casa e compras', icon: 'house', color: '#38d9f5', count: organizer.project_items.filter((i) => !i.done).length || null },
      { path: '/mais/carro', label: 'Carro', icon: 'car', color: '#ff9f1c' }
    ] },
    { id: 'cadastros', title: 'Cadastros', links: [
      { path: '/mais/contas', label: 'Contas e cartões', icon: 'card', color: '#1e90ff' },
      { path: '/mais/categorias', label: 'Categorias', icon: 'home', color: '#ff9f1c' },
      { path: '/mais/estabelecimentos', label: 'Estabelecimentos', icon: 'store', color: '#e056fd' },
      { path: '/mais/pessoas', label: 'Pessoas', icon: 'users', color: '#ff8fab' },
      ...(store.workspacesEnabled ? [{ path: '/mais/areas', label: 'Áreas de trabalho', icon: 'layers', color: '#2ec4b6' }] : [])
    ] },
    { id: 'sistema', title: 'Sistema', links: [
      { path: '/mais/importacoes', label: 'Importações', icon: 'history', color: '#4dd0e1' },
      { path: '/mais/compartilhar', label: 'Compartilhar', icon: 'share', color: '#ff8fab' },
      { path: '/mais/ajustes', label: 'Ajustes', icon: 'settings', color: '#8e8e93' }
    ] }
  ]);

  const route = $derived(page.route.id ?? '/');
  const allPaths = $derived(sections.flatMap((s) => s.links.map((l) => l.path)));
  // O link mais específico que contém a rota atual ("/relatorios/planilha" ganha de "/relatorios").
  const active = $derived(allPaths.filter((p) => route === p || (p !== '/' && route.startsWith(`${p}/`))).sort((a, b) => b.length - a.length)[0] ?? '');
  const accounts = $derived(store.accounts.filter((a) => !a.archived && inScopeAccount(a)).toSorted((a, b) => a.sort_order - b.sort_order));

  let closed = $state<Record<string, boolean>>(read());
  function read(): Record<string, boolean> {
    try {
      return JSON.parse(localStorage.getItem('financeiro.sidebar') ?? '{}');
    } catch {
      return {};
    }
  }
  function toggle(id: string) {
    closed = { ...closed, [id]: !closed[id] };
    try {
      localStorage.setItem('financeiro.sidebar', JSON.stringify(closed));
    } catch {
      // aba privada
    }
  }
</script>

{#snippet head(id: string, title: string)}
  <button class="head" onclick={() => toggle(id)} aria-expanded={!closed[id]}>{title}<Icon name={closed[id] ? 'chevron-right' : 'chevron-down'} size={12} /></button>
{/snippet}

<nav class="sidebar glass" aria-label="Seções">
  <div class="brand"><span class="logo"><Icon name="trending-up" size={17} stroke={2.6} /></span><span class="grow">Financeiro</span>
    <button class="icon-btn sm" aria-label="Novo lançamento" onclick={() => (ui.newEntryOpen = true)} use:hint={['Novo lançamento', 'Anote um gasto ou entrada à mão (dinheiro, por exemplo).']}><Icon name="plus" size={16} /></button>
  </div>
  <div class="scroll">
    {#each sections.slice(0, 2) as section (section.id)}
      {@render head(section.id, section.title)}
      {#if !closed[section.id]}
        {#each section.links as link (link.path)}
          <a href="#{link.path}" class="link" class:on={active === link.path} aria-current={active === link.path ? 'page' : undefined}>
            <span class="ico" style:--c={link.color}><Icon name={link.icon} size={15} stroke={2.2} /></span><span class="grow ellipsis">{link.label}</span>
            {#if link.count}<span class="count">{link.count}</span>{/if}
          </a>
        {/each}
      {/if}
    {/each}

    {@render head('contas', 'Contas')}
    {#if !closed.contas}
      {#each accounts as account (account.id)}
        {@const balance = account.kind === 'creditCard' ? -balanceOf(account) : balanceOf(account)}
        <a href="#/contas/{account.id}" class="link acc" class:on={route === '/contas/[id]' && page.params.id === account.id}>
          <BankCard {account} width={30} /><span class="grow ellipsis">{account.name}</span><span class="bal num" class:owed={account.kind === 'creditCard'}>{money(balance, { cents: false })}</span>
        </a>
      {/each}
      <button class="link add" onclick={() => (ui.newAccountOpen = true)}><span class="ico plain"><Icon name="plus" size={14} /></span>Cadastrar conta</button>
    {/if}

    {#each sections.slice(2) as section (section.id)}
      {@render head(section.id, section.title)}
      {#if !closed[section.id]}
        {#each section.links as link (link.path)}
          <a href="#{link.path}" class="link" class:on={active === link.path} aria-current={active === link.path ? 'page' : undefined}>
            <span class="ico" style:--c={link.color}><Icon name={link.icon} size={15} stroke={2.2} /></span><span class="grow ellipsis">{link.label}</span>
          </a>
        {/each}
      {/if}
    {/each}
  </div>
  <div class="bottom">
    <button class="btn primary block import" onclick={() => ui.startImport()} use:hint={['Importar extrato', 'Escolha a conta e o arquivo do banco (OFX, CSV ou PDF). Também dá para arrastar o arquivo para a janela.']}>
      <Icon name="import" size={17} />Importar extrato
    </button>
    <div class="who caption ellipsis">{store.demo ? 'Demonstração: dados fictícios, nada é salvo.' : store.userEmail}</div>
  </div>
</nav>

<style>
  .sidebar { display: flex; flex-direction: column; position: sticky; top: 0; height: 100dvh; padding: 14px 10px 12px; border-width: 0 1px 0 0; border-radius: 0; }
  .brand { display: flex; align-items: center; gap: 10px; font: 700 17px var(--font-display); padding: 4px 6px 12px; }
  .logo { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; color: #b8ffe6; background: linear-gradient(160deg, #1d7a5e, #06140f); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12), 0 4px 14px rgba(43, 212, 164, 0.25); }
  .icon-btn.sm { width: 28px; height: 28px; }
  .scroll { flex: 1; overflow-y: auto; scrollbar-width: none; margin: 0 -4px; padding: 0 4px; }
  .scroll::-webkit-scrollbar { display: none; }
  .head { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 12px 8px 4px; border: 0; background: none; font-size: 11.5px; font-weight: 600; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.06em; }
  .head :global(svg) { opacity: 0; transition: opacity 0.15s; }
  .head:hover :global(svg) { opacity: 1; }
  .link { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 34px; padding: 5px 8px; border-radius: 9px; border: 0; background: none; text-align: left; color: var(--text); font-size: 14px; transition: background 0.15s; }
  .link:hover { background: rgba(255, 255, 255, 0.055); }
  .link.on { background: rgba(255, 255, 255, 0.11); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06); }
  .ico { width: 24px; height: 24px; border-radius: 7px; display: grid; place-items: center; flex: none; color: #fff; background: linear-gradient(160deg, var(--c), color-mix(in srgb, var(--c) 62%, black)); box-shadow: inset 0 0 0 0.5px rgba(255, 255, 255, 0.2); }
  .ico.plain { background: rgba(255, 255, 255, 0.07); color: var(--text-2); }
  .count { font-size: 12px; color: var(--text-2); font-variant-numeric: tabular-nums; }
  .acc { min-height: 36px; }
  .bal { font-size: 12.5px; color: var(--text-2); }
  .bal.owed { color: #ffb38a; }
  .add { color: var(--text-2); }
  .bottom { padding-top: 10px; border-top: 1px solid var(--stroke); display: flex; flex-direction: column; gap: 8px; }
  .import { box-shadow: 0 6px 20px rgba(43, 212, 164, 0.25); background: linear-gradient(180deg, #3fe3b4, #20b98d); }
  .who { padding: 0 4px; }
</style>
