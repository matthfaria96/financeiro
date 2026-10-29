<script lang="ts" generics="T">
  import { tick } from 'svelte';
  import Icon from './Icon.svelte';
  import { fold } from '$lib/core/text';

  /**
   * Seletor do app (no lugar do <select> nativo, que ficava diferente em cada navegador e sumia atrás de etiquetas).
   * A lista abre por cima de tudo (vai para o <body>, então funciona dentro das janelas), com busca quando há
   * muitas opções e teclado (↑ ↓ Enter Esc). `variant`: field (dentro de formulário), chip (filtro), title (mês).
   */
  interface Option<V> {
    value: V;
    label: string;
    group?: string;
    hint?: string;
    color?: string;
  }
  let { value = $bindable(), options, onchange, variant = 'field', label, placeholder = 'Escolher', active = false, display = '', face }: {
    value: T;
    options: Option<T>[];
    onchange?: (value: T) => void;
    variant?: 'field' | 'chip' | 'title';
    label: string;
    placeholder?: string;
    active?: boolean;
    display?: string;
    /** Aparência própria do botão (ex.: etiqueta colorida da categoria). */
    face?: import('svelte').Snippet;
  } = $props();

  let open = $state(false);
  let query = $state('');
  let cursor = $state(0);
  let trigger = $state<HTMLButtonElement>();
  let pos = $state({ left: 0, top: 0, width: 0, up: false, max: 320 });

  const current = $derived(options.find((o) => o.value === value));
  const searchable = $derived(options.length > 10);
  const shown = $derived(query ? options.filter((o) => fold(`${o.label} ${o.group ?? ''}`).includes(fold(query))) : options);

  /** Leva a lista para o <body>: assim nada a corta (janelas com rolagem ou com transform). */
  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return { destroy: () => node.remove() };
  }

  async function toggle() {
    if (open) return close();
    const box = trigger!.getBoundingClientRect();
    const below = innerHeight - box.bottom - 12;
    const up = below < 240 && box.top > below;
    pos = { left: Math.min(box.left, innerWidth - Math.max(box.width, 220) - 8), top: up ? box.top - 6 : box.bottom + 6, width: Math.max(box.width, 220), up, max: Math.min(360, (up ? box.top : below) - 12) };
    query = '';
    cursor = Math.max(0, options.findIndex((o) => o.value === value));
    open = true;
    await tick();
    document.querySelector<HTMLElement>('.select-pop [data-on="true"]')?.scrollIntoView({ block: 'nearest' });
  }

  function close() {
    open = false;
    trigger?.focus();
  }

  function choose(option: Option<T>) {
    value = option.value;
    onchange?.(option.value);
    close();
  }

  function keydown(event: KeyboardEvent) {
    if (!open) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
    else if (event.key === 'ArrowDown') { event.preventDefault(); cursor = Math.min(shown.length - 1, cursor + 1); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); cursor = Math.max(0, cursor - 1); }
    else if (event.key === 'Enter' && shown[cursor]) { event.preventDefault(); choose(shown[cursor]); }
  }

  const focus = (node: HTMLInputElement) => node.focus();
</script>

<svelte:window onkeydowncapture={keydown} onresize={() => open && close()} />

<button bind:this={trigger} type="button" class="select {variant}" class:custom={!!face} class:active class:empty={!current} onclick={toggle} aria-haspopup="listbox" aria-expanded={open} aria-label={label}>
  {#if face}{@render face()}{:else}
    {#if current?.color}<i style:background={current.color}></i>{/if}
    <span class="ellipsis">{display || current?.label || placeholder}</span>
    <Icon name="chevron-down" size={variant === 'title' ? 16 : 13} />
  {/if}
</button>

{#if open}
  <div use:portal>
    <div class="select-back" role="presentation" onclick={close}></div>
    <div class="select-pop" class:up={pos.up} style:left="{pos.left}px" style:top="{pos.top}px" style:width="{pos.width}px" style:max-height="{pos.max}px" role="listbox" aria-label={label}>
      {#if searchable}<input class="search" placeholder="Buscar…" bind:value={query} use:focus oninput={() => (cursor = 0)} aria-label="Buscar opção" />{/if}
      <div class="items">
        {#each shown as option, index (index)}
          {#if option.group && option.group !== shown[index - 1]?.group}<div class="group">{option.group}</div>{/if}
          <button type="button" class="item" class:cursor={index === cursor} data-on={option.value === value} role="option" aria-selected={option.value === value}
            onclick={() => choose(option)} onpointerenter={() => (cursor = index)}>
            {#if option.color}<i style:background={option.color}></i>{/if}
            <span class="grow"><span class="ellipsis block">{option.label}</span>{#if option.hint}<span class="caption">{option.hint}</span>{/if}</span>
            {#if option.value === value}<Icon name="check" size={15} stroke={2.6} />{/if}
          </button>
        {:else}
          <div class="none caption">Nada encontrado.</div>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  .select { display: inline-flex; align-items: center; gap: 7px; min-width: 0; max-width: 100%; border: 0; background: none; color: var(--text); font: inherit; cursor: pointer; }
  .select.custom { padding: 0; }
  .select.field { justify-content: flex-end; width: 100%; min-height: 34px; padding: 6px 0; text-align: right; }
  .select.field :global(svg) { color: var(--text-3); flex: none; }
  .select.empty { color: var(--text-3); }
  .select.chip { height: 36px; padding: 0 12px 0 14px; border-radius: 12px; border: 1px solid var(--stroke); background: var(--card-2); font-size: 14.5px; font-weight: 500; white-space: nowrap; }
  .select.chip.active { color: var(--accent); background: var(--accent-soft); border-color: rgba(43, 212, 164, 0.35); }
  .select.title { padding: 8px 16px; border-radius: 999px; border: 1px solid var(--stroke-strong); background: rgba(255, 255, 255, 0.07); font: 600 19px var(--font-display); }
  .select:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 10px; }
  i { width: 9px; height: 9px; border-radius: 3px; flex: none; }
  :global(.select-back) { position: fixed; inset: 0; z-index: 300; }
  :global(.select-pop) { position: fixed; z-index: 301; display: flex; flex-direction: column; overflow: hidden; border-radius: 14px; padding: 6px;
    background: #1a221f; border: 1px solid var(--stroke-strong); box-shadow: 0 18px 50px rgba(0, 0, 0, 0.55); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
    animation: pop 0.22s cubic-bezier(0.22, 1, 0.36, 1); transform-origin: top center; }
  :global(.select-pop.up) { transform: translateY(-100%); animation-name: pop-up; }
  @keyframes pop { from { opacity: 0; transform: translateY(-6px) scale(0.98); } }
  @keyframes pop-up { from { opacity: 0; transform: translateY(calc(-100% + 6px)) scale(0.98); } }
  .search { flex: none; margin: 2px 2px 6px; height: 36px; border-radius: 10px; border: 1px solid var(--stroke-strong); background: rgba(255, 255, 255, 0.06); padding: 0 10px; color: var(--text); outline: none; font: inherit; font-size: 14px; }
  /* Celular: 16 px no campo de busca evita o zoom automático do iPhone. */
  @media (pointer: coarse) { .search { font-size: 16px; } }
  .items { overflow-y: auto; overscroll-behavior: contain; }
  .group { padding: 8px 10px 4px; font-size: 11.5px; font-weight: 700; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.05em; }
  .item { display: flex; align-items: center; gap: 9px; width: 100%; min-height: 38px; padding: 6px 10px; border: 0; border-radius: 9px; background: none; color: var(--text); text-align: left; font: inherit; font-size: 14.5px; cursor: pointer; }
  .item { transition: background 0.12s; }
  .item.cursor { background: rgba(255, 255, 255, 0.08); }
  .item[data-on='true'] { color: var(--accent); }
  .item :global(svg) { flex: none; }
  .block { display: block; }
  .none { padding: 10px; }
</style>
