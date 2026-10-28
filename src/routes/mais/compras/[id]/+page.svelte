<script lang="ts">
  import { page } from '$app/state';
  import { organizer } from '$lib/data/organizer.svelte';
  import type { ShoppingItem } from '$lib/data/organizerTypes';
  import { parseItem } from '$lib/core/shopping';
  import { money } from '$lib/core/money';
  import Icon from '$lib/ui/Icon.svelte';
  import { hint } from '$lib/ui/hint';
  import SubHeader from '$lib/screens/more/SubHeader.svelte';
  import SharedBadge from '$lib/screens/organizer/SharedBadge.svelte';
  import ListSettings from '$lib/screens/shopping/ListSettings.svelte';
  import FinishSheet from '$lib/screens/shopping/FinishSheet.svelte';
  import { duplicateList, itemsOf, reopenList } from '$lib/features/shopping';

  const list = $derived(organizer.shopping_lists.find((l) => l.id === page.params.id));
  const items = $derived(list ? itemsOf(list) : []);
  const pending = $derived(items.filter((i) => !i.checked));
  const inCart = $derived(items.filter((i) => i.checked));
  let text = $state('');
  let settings = $state(false);
  let finishing = $state(false);
  let editingId = $state('');
  let editText = $state('');

  async function add(event: SubmitEvent) {
    event.preventDefault();
    if (!list || !text.trim()) return;
    const parsed = text.split(/[,;\n]/).map(parseItem).filter((p) => p.name);
    const start = Math.max(0, ...items.map((i) => i.sort_order + 1));
    text = '';
    await organizer.insert('shopping_items', parsed.map((p, index) => ({ list_id: list.id, name: p.name, quantity: p.quantity, checked: false, sort_order: start + index })));
  }

  const toggle = (item: ShoppingItem) => organizer.update('shopping_items', item.id, { checked: !item.checked });

  function startEdit(item: ShoppingItem) {
    editingId = item.id;
    editText = [item.quantity, item.name].filter(Boolean).join(' ');
  }

  async function saveEdit(item: ShoppingItem) {
    const parsed = parseItem(editText);
    editingId = '';
    if (!parsed.name) return organizer.remove('shopping_items', [item.id]);
    await organizer.update('shopping_items', item.id, { name: parsed.name, quantity: parsed.quantity });
  }

  async function again() {
    if (!list) return;
    const next = await duplicateList(list);
    location.hash = `#/mais/compras/${next.id}`;
  }

  const uncheckAll = () => organizer.shopping_items.filter((i) => i.list_id === list?.id && i.checked).forEach((i) => organizer.update('shopping_items', i.id, { checked: false }));
  const focus = (node: HTMLInputElement) => node.focus();
</script>

{#snippet row(item: ShoppingItem)}
  <div class="item" class:checked={item.checked}>
    <button class="box" onclick={() => toggle(item)} aria-label={item.checked ? `Tirar ${item.name} do carrinho` : `Pegar ${item.name}`} aria-pressed={item.checked}>
      <Icon name={item.checked ? 'check' : 'circle'} size={item.checked ? 16 : 24} stroke={item.checked ? 3 : 1.6} />
    </button>
    {#if editingId === item.id}
      <input class="input grow" bind:value={editText} use:focus onblur={() => saveEdit(item)} onkeydown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') editingId = ''; }} aria-label="Editar item" />
    {:else}
      <button class="name grow" onclick={() => toggle(item)} ondblclick={() => startEdit(item)}>
        <span>{item.name}</span>{#if item.quantity}<span class="qty">{item.quantity}</span>{/if}
      </button>
      <button class="icon-btn mini" onclick={() => startEdit(item)} aria-label="Editar {item.name}" use:hint={['Editar', 'Mudar nome ou quantidade. Apague o texto para tirar da lista.']}><Icon name="pencil" size={14} /></button>
      <button class="icon-btn mini" onclick={() => organizer.remove('shopping_items', [item.id])} aria-label="Tirar {item.name}" use:hint={['Tirar da lista', 'Remove o item desta lista.']}><Icon name="x" size={15} /></button>
    {/if}
  </div>
{/snippet}

<div class="page">
  {#if list}
    <SubHeader title={list.name} back="#/mais/compras">
      <button class="icon-btn" aria-label="Duplicar lista" onclick={again} use:hint={['Duplicar', 'Cria uma lista nova com estes itens, desmarcados.']}><Icon name="copy-plus" /></button>
      <button class="icon-btn" aria-label="Ajustes da lista" onclick={() => (settings = true)} use:hint={['Lista', 'Nome, total, quem vê e apagar.']}><Icon name="settings" /></button>
    </SubHeader>
    <div class="row sub"><SharedBadge householdId={list.household_id} />
      <span class="caption grow">{inCart.length} de {items.length} no carrinho{list.total_cents ? ` · deu ${money(list.total_cents)}` : ''}</span></div>

    {#if list.done_at}
      <div class="card row done-card"><Icon name="check-circle" size={20} /><span class="grow small">Compra finalizada.</span><button class="btn" onclick={() => reopenList(list!)}>Reabrir</button></div>
    {/if}

    <form class="add" onsubmit={add}>
      <input class="input" bind:value={text} placeholder="Adicionar: 2 leite, pão, 1 kg carne…" aria-label="Adicionar itens" enterkeyhint="done" autocomplete="off" />
      <button class="btn primary" disabled={!text.trim()} aria-label="Adicionar"><Icon name="plus" size={18} /></button>
    </form>

    <div class="card flush">
      {#each pending as item (item.id)}{@render row(item)}{:else}{#if items.length}<p class="muted small pad">Tudo no carrinho!</p>{:else}<p class="muted small pad">Lista vazia. Escreva acima; vírgula separa vários itens.</p>{/if}{/each}
    </div>

    {#if inCart.length}
      <div class="row between cart-title"><span class="caption">NO CARRINHO</span><button class="btn ghost" onclick={uncheckAll} use:hint={['Desmarcar tudo', 'Volta todos os itens para a lista.']}>Desmarcar tudo</button></div>
      <div class="card flush">{#each inCart as item (item.id)}{@render row(item)}{/each}</div>
    {/if}

    {#if !list.done_at && items.length}
      <button class="btn lg block finish" onclick={() => (finishing = true)} use:hint={['Finalizar compra', 'Anota o total e cria a próxima lista com os mesmos itens.']}><Icon name="check" size={18} />Finalizar compra</button>
    {/if}
    <ListSettings bind:open={settings} {list} />
    <FinishSheet bind:open={finishing} {list} />
  {:else}
    <SubHeader title="Lista" back="#/mais/compras" />
    <p class="muted">{organizer.loadedFor ? 'Lista não encontrada.' : 'Carregando…'}</p>
  {/if}
</div>

<style>
  .sub { margin: -6px 4px 0; gap: 8px; }
  .add { display: flex; gap: 8px; }
  .add .btn { height: 46px; width: 52px; padding: 0; }
  .item { display: flex; align-items: center; gap: 6px; padding: 4px 10px 4px 6px; min-height: 54px; }
  .item + .item { border-top: 1px solid var(--stroke); }
  .box { width: 44px; height: 44px; border: 0; background: none; display: grid; place-items: center; color: var(--text-3); flex: none; }
  .checked .box { color: #04140e; }
  .checked .box :global(svg) { background: var(--accent); border-radius: 50%; padding: 4px; width: 26px; height: 26px; }
  .name { border: 0; background: none; text-align: left; padding: 10px 0; display: flex; align-items: baseline; gap: 8px; font-size: 17px; min-width: 0; }
  .checked .name span:first-child { text-decoration: line-through; color: var(--text-3); }
  .qty { font-size: 13px; color: var(--text-2); background: var(--card-2); border: 1px solid var(--stroke); padding: 1px 7px; border-radius: 7px; white-space: nowrap; }
  .icon-btn.mini { width: 32px; height: 32px; border-color: transparent; background: none; opacity: 0.55; }
  .icon-btn.mini:hover { opacity: 1; }
  .pad { padding: 16px; margin: 0; }
  .cart-title { margin: 6px 4px 0; }
  .done-card { color: var(--positive); gap: 10px; }
  .finish { color: var(--accent); background: var(--accent-soft); border-color: rgba(43, 212, 164, 0.35); }
</style>
