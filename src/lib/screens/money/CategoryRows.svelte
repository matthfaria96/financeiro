<script lang="ts">
  import { money, percent } from '$lib/core/money';
  import { shortDay } from '$lib/core/dates';
  import { ui } from '$lib/ui/ui.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import CategoryIcon from '$lib/ui/CategoryIcon.svelte';
  import ChangeBadge from '$lib/ui/ChangeBadge.svelte';
  import EntryRow from '$lib/screens/EntryRow.svelte';
  import { spendDate } from '$lib/features/analytics';
  import { prefs } from '$lib/ui/prefs.svelte';
  import type { Group } from '$lib/features/analytics';
  import { slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  /** Categorias expansíveis: barra de fundo com a fatia, % e valor, variação para o mês anterior; toque abre os lançamentos.
   *  `flat`: linhas dentro de um cartão (separadas por linha fina), em vez de cartõezinhos soltos. */
  let { groups, previous = [], flat = false }: { groups: Group[]; previous?: Group[]; flat?: boolean } = $props();
  let open = $state<Set<string>>(new Set());
  const before = $derived(new Map(previous.map((g) => [g.key, g.cents])));
  const change = (g: Group) => { const old = before.get(g.key); return old ? (g.cents - old) / old : null; };
  function toggle(key: string) {
    const next = new Set(open);
    next.has(key) ? next.delete(key) : next.add(key);
    open = next;
  }
</script>

<div class="rows" class:flat>
  {#each groups as g, n (g.key)}
    {@const expanded = open.has(g.key)}
    <div class="group" class:expanded style:--c={g.color} style:--d="{Math.min(n, 10) * 35}ms">
      <button class="slice" style:--w="{g.share * 100}%" onclick={() => toggle(g.key)} aria-expanded={expanded}>
        <span class="bar" aria-hidden="true"></span>
        <CategoryIcon symbol={g.icon} color={g.color} size={38} />
        <span class="grow name"><span class="ellipsis">{g.label}</span><span class="caption">{percent(g.share)} · {g.entries.length} {g.entries.length === 1 ? 'lançamento' : 'lançamentos'}</span></span>
        <span class="val"><span class="num">{money(g.cents, { cents: false })}</span><ChangeBadge change={change(g)} /></span>
        <span class="chev"><Icon name="chevron-down" size={15} /></span>
      </button>
      {#if expanded}
        <div class="inner entries" transition:slide={{ duration: 320, easing: cubicOut }}>
          {#each g.entries as entry (entry.id)}
            <EntryRow {entry} compact when={shortDay(spendDate(entry))} purchase={prefs.creditByPurchase} onclick={() => ui.editEntry(entry.id)} />
          {/each}
        </div>
      {/if}
    </div>
  {:else}
    <p class="muted small">Nada neste mês.</p>
  {/each}
</div>

<style>
  .rows { display: flex; flex-direction: column; gap: 8px; }
  .group { border-radius: 16px; border: 1px solid var(--stroke); background: rgba(255, 255, 255, 0.025); overflow: hidden; animation: rise 0.45s var(--ease) both; animation-delay: var(--d);
    transition: border-color 0.25s, background 0.25s, box-shadow 0.25s; }
  .group:hover { border-color: var(--stroke-strong); background: rgba(255, 255, 255, 0.04); }
  .group.expanded { border-color: color-mix(in srgb, var(--c) 35%, transparent); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25); }
  .slice { position: relative; display: flex; align-items: center; gap: 14px; padding: 12px 14px; width: 100%; border: 0; background: none; text-align: left; isolation: isolate; }
  .slice:active { background: rgba(255, 255, 255, 0.03); }
  /* Fatia do mês: a barra de fundo cresce até a % da categoria. */
  .bar { position: absolute; inset: 0 auto 0 0; width: var(--w); z-index: -1; background: linear-gradient(90deg, color-mix(in srgb, var(--c) 22%, transparent), color-mix(in srgb, var(--c) 12%, transparent));
    transform-origin: left; animation: fill 0.9s cubic-bezier(0.22, 1, 0.36, 1) both; animation-delay: calc(var(--d) + 120ms); transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1); }
  @keyframes fill { from { transform: scaleX(0); } }
  .name { display: flex; flex-direction: column; gap: 1px; min-width: 0; font-size: 15px; }
  .val { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; white-space: nowrap; font-size: 15px; font-weight: 600; }
  .chev { display: grid; color: var(--text-3); transition: transform 0.35s var(--ease), color 0.2s; }
  .expanded .chev { transform: rotate(180deg); color: var(--text-2); }
  .inner { border-top: 1px solid var(--stroke); background: rgba(0, 0, 0, 0.12); }
  .flat { gap: 0; }
  .flat .group { border: 0; border-radius: 0; background: none; animation: none; }
  .flat .group + .group { border-top: 1px solid var(--stroke); }
  .flat .group:hover { background: rgba(255, 255, 255, 0.03); }
  .flat .group.expanded { box-shadow: none; background: rgba(255, 255, 255, 0.025); }
  .flat .slice { padding: 12px 18px; }
  .flat .bar { opacity: 0.85; }
  .flat .inner { background: rgba(0, 0, 0, 0.16); }
  .flat > .muted { padding: 14px 18px; margin: 0; }
</style>
