<script lang="ts">
  import { organizer } from '$lib/data/organizer.svelte';
  import type { ShoppingItem, ShoppingList } from '$lib/data/organizerTypes';
  import { itemEmoji, parseItem } from '$lib/core/shopping';
  import Icon from '$lib/ui/Icon.svelte';
  import { hint } from '$lib/ui/hint';
  import { itemsOf } from '$lib/features/shopping';

  /**
   * Uma lista: escrever e adicionar, marcar no carrinho, e à direita "repete" (↻, vai para a próxima lista)
   * ou "não repete" (✕, compra de uma vez só). Toque no nome para corrigir; apagar o texto tira o item.
   */
  let { list, readonly = false }: { list: ShoppingList; readonly?: boolean } = $props();
  const items = $derived(itemsOf(list));
  const pending = $derived(items.filter((i) => !i.checked));
  const inCart = $derived(items.filter((i) => i.checked));
  let text = $state('');
  let editingId = $state('');
  let editText = $state('');

  async function add(event: SubmitEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    const parsed = text.split(/[,;\n]/).map(parseItem).filter((p) => p.name);
    const start = Math.max(0, ...items.map((i) => i.sort_order + 1));
    text = '';
    await organizer.insert('shopping_items', parsed.map((p, index) => ({ list_id: list.id, name: p.name, quantity: p.quantity, checked: false, repeat: true, sort_order: start + index })));
  }

  const toggle = (item: ShoppingItem) => !readonly && organizer.update('shopping_items', item.id, { checked: !item.checked });
  const toggleRepeat = (item: ShoppingItem) => organizer.update('shopping_items', item.id, { repeat: !item.repeat });

  function startEdit(item: ShoppingItem) {
    if (readonly) return;
    editingId = item.id;
    editText = [item.quantity, item.name].filter(Boolean).join(' ');
  }

  async function saveEdit(item: ShoppingItem) {
    const parsed = parseItem(editText);
    editingId = '';
    if (!parsed.name) return organizer.remove('shopping_items', [item.id]);
    await organizer.update('shopping_items', item.id, { name: parsed.name, quantity: parsed.quantity });
  }

  const focus = (node: HTMLInputElement) => node.focus();
</script>

{#snippet row(item: ShoppingItem)}
  <div class="item" class:checked={item.checked}>
    <button class="box" onclick={() => toggle(item)} disabled={readonly} aria-label={item.checked ? `Tirar ${item.name} do carrinho` : `Pegar ${item.name}`} aria-pressed={item.checked}>
      <Icon name={item.checked ? 'check' : 'circle'} size={item.checked ? 16 : 24} stroke={item.checked ? 3 : 1.6} />
    </button>
    {#if editingId === item.id}
      <input class="input grow" bind:value={editText} use:focus onblur={() => saveEdit(item)} onkeydown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') editingId = ''; }} aria-label="Editar item (apague o texto para tirar)" />
    {:else}
      <span class="emoji" aria-hidden="true">{itemEmoji(item.name)}</span>
      <button class="name grow" onclick={() => startEdit(item)} use:hint={[item.name, 'Toque para corrigir o nome ou a quantidade. Apague o texto para tirar da lista.']}>
        <span>{item.name}</span>{#if item.quantity}<span class="qty">{item.quantity}</span>{/if}
      </button>
      {#if !readonly}
        <button class="repeat" class:off={!item.repeat} onclick={() => toggleRepeat(item)} aria-pressed={item.repeat} aria-label={item.repeat ? 'Repete na próxima lista' : 'Não repete'}
          use:hint={[item.repeat ? 'Repete' : 'Não repete', item.repeat ? 'Vai para a próxima lista quando gerar uma nova. Toque para marcar como compra de uma vez só.' : 'Compra de uma vez só: não vai para a próxima lista. Toque para repetir.']}>
          <Icon name={item.repeat ? 'refresh' : 'x'} size={15} stroke={2.2} />
        </button>
      {/if}
    {/if}
  </div>
{/snippet}

{#if !readonly}
  <form class="add" onsubmit={add}>
    <input class="input" bind:value={text} placeholder="Adicionar: 2 leite, pão, 1 kg carne…" aria-label="Adicionar itens" enterkeyhint="done" autocomplete="off" />
    <button class="btn primary" disabled={!text.trim()} aria-label="Adicionar"><Icon name="plus" size={18} /></button>
  </form>
{/if}

<div class="columns">
  <div class="stack-sm">
    <div class="col-title caption">FALTA PEGAR · {pending.length}</div>
    <div class="card flush">
      {#each pending as item (item.id)}{@render row(item)}{:else}<p class="muted small pad">{items.length ? 'Tudo no carrinho! 🎉' : 'Lista vazia. Escreva acima; vírgula separa vários itens.'}</p>{/each}
    </div>
  </div>
  {#if inCart.length}
    <div class="stack-sm">
      <div class="row between col-title"><span class="caption">NO CARRINHO · {inCart.length}</span>
        {#if !readonly}<button class="btn ghost" onclick={() => inCart.forEach((i) => organizer.update('shopping_items', i.id, { checked: false }))}>Desmarcar tudo</button>{/if}</div>
      <div class="card flush cart">{#each inCart as item (item.id)}{@render row(item)}{/each}</div>
    </div>
  {/if}
</div>

<style>
  .add { display: flex; gap: 8px; }
  .add .btn { height: 46px; width: 52px; padding: 0; }
  .columns { display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr); align-items: start; }
  @media (min-width: 1000px) { .columns { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  .col-title { margin: 2px 6px 0; min-height: 28px; display: flex; align-items: center; }
  .cart { opacity: 0.85; }
  .item { display: flex; align-items: center; gap: 6px; padding: 4px 10px 4px 6px; min-height: 54px; }
  .item + .item { border-top: 1px solid var(--stroke); }
  .box { width: 44px; height: 44px; border: 0; background: none; display: grid; place-items: center; color: var(--text-3); flex: none; }
  .checked .box { color: #04140e; }
  .checked .box :global(svg) { background: var(--accent); border-radius: 50%; padding: 4px; width: 26px; height: 26px; }
  .emoji { width: 36px; height: 36px; border-radius: 11px; display: grid; place-items: center; font-size: 20px; flex: none; background: rgba(255, 255, 255, 0.05); }
  .name { border: 0; background: none; text-align: left; padding: 10px 4px; display: flex; align-items: baseline; gap: 8px; font-size: 16.5px; min-width: 0; }
  .checked .name span:first-child { text-decoration: line-through; color: var(--text-3); }
  .qty { font-size: 13px; color: var(--text-2); background: var(--card-2); border: 1px solid var(--stroke); padding: 1px 7px; border-radius: 7px; white-space: nowrap; }
  .repeat { width: 34px; height: 34px; border-radius: 10px; border: 1px solid rgba(43, 212, 164, 0.35); background: var(--accent-soft); color: var(--accent); display: grid; place-items: center; flex: none; }
  .repeat.off { border-color: var(--stroke-strong); background: rgba(255, 255, 255, 0.04); color: var(--text-3); }
  .pad { padding: 16px; margin: 0; }
</style>
