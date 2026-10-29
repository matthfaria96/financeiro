<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import { fold } from '$lib/core/text';
  import Icon from '$lib/ui/Icon.svelte';
  import Avatar from '$lib/ui/Avatar.svelte';
  import Sheet from '$lib/ui/Sheet.svelte';
  import { hint } from '$lib/ui/hint';
  import SubHeader from '$lib/screens/more/SubHeader.svelte';
  import MerchantEditor from '$lib/screens/merchants/MerchantEditor.svelte';
  import { fullName } from '$lib/features/model';
  import { money } from '$lib/core/money';
  import Segmented from '$lib/ui/Segmented.svelte';
  import { bestLogo, kilobytes } from '$lib/features/logos';
  import type { Merchant } from '$lib/data/types';

  let search = $state('');
  let editing = $state<Merchant | null>(null);
  let open = $state(false);
  const list = $derived(store.merchants.filter((m) => !search || fold(`${m.name} ${m.patterns}`).includes(fold(search))).toSorted((a, b) => a.name.localeCompare(b.name)));
  // Quantas vezes e quanto foi gasto em cada lugar (para ordenar e mostrar no cartão).
  const counts = $derived.by(() => {
    const map = new Map<string, number>();
    for (const e of store.entries) if (e.merchant_id) map.set(e.merchant_id, (map.get(e.merchant_id) ?? 0) + 1);
    return map;
  });
  const spent = $derived.by(() => {
    const map = new Map<string, number>();
    for (const e of store.entries) if (e.merchant_id && e.amount_cents < 0 && !e.is_mirror) map.set(e.merchant_id, (map.get(e.merchant_id) ?? 0) - e.amount_cents);
    return map;
  });
  let order = $state<'used' | 'name'>('used');
  const sorted = $derived(order === 'name' ? list : list.toSorted((a, b) => (spent.get(b.id) ?? 0) - (spent.get(a.id) ?? 0) || a.name.localeCompare(b.name)));
  const photoBytes = $derived(store.merchants.reduce((s, m) => s + Math.round(m.image_data.length * 0.75), 0));

  // Busca de logos de uma vez (guiada: resumo → etapas → resultado).
  let batchOpen = $state(false);
  let running = $state(false);
  let done = $state(false);
  let status = $state<Record<string, 'wait' | 'busy' | 'ok' | 'none'>>({});
  let targets = $state<Merchant[]>([]);
  function openBatch() {
    targets = store.merchants.filter((m) => !m.image_url && !m.image_data && m.website);
    status = {};
    done = false;
    batchOpen = true;
  }
  async function runBatch() {
    running = true;
    for (let i = 0; i < targets.length; i += 4) {
      const chunk = targets.slice(i, i + 4);
      chunk.forEach((m) => (status[m.id] = 'busy'));
      await Promise.all(chunk.map(async (m) => {
        const logo = await bestLogo(m.website);
        if (logo) await store.update('merchants', m.id, { image_url: logo.url, is_logo: true });
        status[m.id] = logo ? 'ok' : 'none';
      }));
    }
    running = false;
    done = true;
  }
</script>

<div class="page">
  <SubHeader title="Estabelecimentos"><button class="icon-btn" aria-label="Novo estabelecimento" onclick={() => { editing = null; open = true; }}><Icon name="plus" /></button></SubHeader>
  <button class="card row batch" onclick={openBatch} use:hint={['Buscar logos', 'Busca de uma vez o logo dos estabelecimentos que têm site e ainda não têm imagem.']}>
    <Icon name="sparkles" size={20} color="var(--accent)" /><span class="grow"><b>Buscar logos dos que não têm imagem</b><div class="caption">{store.merchants.filter((m) => m.image_url || m.image_data).length} com imagem · fotos ocupam {kilobytes(photoBytes)}; logos são só links</div></span><Icon name="chevron-right" size={15} class="faint" />
  </button>
  <div class="tools">
    <label class="search grow"><Icon name="search" size={17} class="faint" /><input placeholder="Buscar estabelecimento" bind:value={search} /></label>
    <div class="order"><Segmented label="Ordem" bind:value={order} options={[{ value: 'used', label: 'Mais gasto' }, { value: 'name', label: 'A–Z' }]} /></div>
  </div>
  <div class="grid">
    {#each sorted as merchant (merchant.id)}
      <button class="card merchant" onclick={() => { editing = merchant; open = true; }}>
        <Avatar {merchant} category={store.categoryById.get(merchant.category_id ?? '') ?? null} size={52} />
        <span class="name ellipsis">{merchant.name}</span>
        <span class="caption ellipsis">{fullName(store.categoryById.get(merchant.category_id ?? ''))}</span>
        <span class="foot"><b class="num">{spent.get(merchant.id) ? money(spent.get(merchant.id)!, { cents: false }) : '—'}</b><span class="caption">{counts.get(merchant.id) ?? 0}×</span></span>
      </button>
    {/each}
  </div>
  <p class="form-footer">O avatar aparece em destaque nos lançamentos e o ícone da categoria fica pequeno no canto. Para criar a partir de um lançamento, toque no avatar dele.</p>
</div>

<MerchantEditor bind:open merchant={editing} />

<Sheet bind:open={batchOpen} title="Buscar logos">
  {#snippet actions()}{#if !done}<button class="btn primary" disabled={running || !targets.length} onclick={runBatch}>Buscar</button>{/if}{/snippet}
  <p class="small muted" style="margin: 12px 4px">
    {#if done}{Object.values(status).filter((s) => s === 'ok').length} logos salvos. Os que não tinham logo bom continuam com o emoji; dá para buscar um por um.
    {:else if targets.length}Vou buscar o logo de {targets.length} estabelecimentos pelo site de cada um. Só o endereço do site é enviado.
    {:else}Todos os estabelecimentos com site já têm imagem.{/if}
  </p>
  <div class="card flush list">
    {#each targets as m (m.id)}
      <div class="list-row">
        <Avatar merchant={store.merchantById.get(m.id) ?? m} size={32} />
        <span class="grow stack-sm" style="gap: 0"><span class="small">{m.name}</span><span class="caption">{m.website}</span></span>
        {#if status[m.id] === 'busy'}<span class="caption">buscando…</span>{:else if status[m.id] === 'ok'}<Icon name="check-circle" size={18} color="var(--accent)" />{:else if status[m.id] === 'none'}<span class="caption">não achei bom</span>{/if}
      </div>
    {/each}
  </div>
</Sheet>

<style>
  .tools { display: flex; gap: 10px; flex-wrap: wrap; }
  .tools .search { min-width: 200px; }
  .order { width: 230px; }
  @media (max-width: 600px) { .order { width: 100%; } }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
  .merchant { display: flex; flex-direction: column; align-items: center; gap: 4px; text-align: center; padding: 18px 12px 14px; min-width: 0; }
  .merchant:hover { border-color: var(--stroke-strong); transform: translateY(-2px); }
  .merchant :global(.avatar) { margin-bottom: 8px; }
  .name { font-weight: 600; max-width: 100%; }
  .merchant .caption { max-width: 100%; }
  .foot { display: flex; gap: 8px; align-items: baseline; margin-top: 6px; }
  .batch { text-align: left; }
  .search { display: flex; align-items: center; gap: 8px; height: 44px; padding: 0 14px; border-radius: 14px; background: rgba(255, 255, 255, 0.07); border: 1px solid var(--stroke); }
  .search input { flex: 1; background: none; border: 0; outline: none; color: var(--text); }
</style>
