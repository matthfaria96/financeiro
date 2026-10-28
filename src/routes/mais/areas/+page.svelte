<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import type { Workspace } from '$lib/data/types';
  import Icon from '$lib/ui/Icon.svelte';
  import CategoryIcon from '$lib/ui/CategoryIcon.svelte';
  import Sheet from '$lib/ui/Sheet.svelte';
  import SectionTitle from '$lib/ui/SectionTitle.svelte';
  import { palette } from '$lib/ui/look';
  import SubHeader from '$lib/screens/more/SubHeader.svelte';

  let open = $state(false);
  let editing = $state<Workspace | null>(null);
  let name = $state('');
  let color = $state(palette[6]);
  let symbol = $state('layers');
  const symbols = ['layers', 'person', 'heart', 'house', 'child', 'briefcase', 'car', 'pawprint'];
  function edit(w: Workspace | null) {
    editing = w;
    name = w?.name ?? '';
    color = w?.color ?? palette[6];
    symbol = w?.symbol ?? 'layers';
    open = true;
  }
  async function save() {
    if (editing) await store.update('workspaces', editing.id, { name: name.trim(), color, symbol });
    else await store.insert('workspaces', [{ name: name.trim(), color, symbol, sort_order: store.workspaces.length }]);
    open = false;
  }
</script>

<div class="page narrow">
  <SubHeader title="Áreas de trabalho"><button class="icon-btn" aria-label="Nova área" onclick={() => edit(null)}><Icon name="plus" /></button></SubHeader>
  <div class="card flush list">
    {#each store.workspaces.toSorted((a, b) => a.sort_order - b.sort_order) as w (w.id)}
      <button class="list-row" onclick={() => edit(w)}><CategoryIcon symbol={w.symbol} color={w.color} size={34} /><span class="grow">{w.name}</span><span class="muted small">{store.accounts.filter((a) => a.workspace_id === w.id).length} contas</span></button>
    {/each}
  </div>
  <p class="form-footer">Cada área é um espaço separado: só as contas dela, seus lançamentos, relatórios e contas fixas. Em Tudo você vê todas juntas.</p>
  <SectionTitle title="Área de cada conta" />
  <div class="form-group">
    {#each store.accounts as account (account.id)}
      <label class="form-row"><span class="field-label">{account.name}</span>
        <select class="field" value={account.workspace_id ?? ''} onchange={(e) => store.update('accounts', account.id, { workspace_id: e.currentTarget.value || null })}><option value="">Nenhuma</option>{#each store.workspaces as w (w.id)}<option value={w.id}>{w.name}</option>{/each}</select></label>
    {/each}
  </div>
</div>

<Sheet bind:open title={editing ? 'Área' : 'Nova área'}>
  {#snippet actions()}<button class="btn primary" disabled={!name.trim()} onclick={save}>Salvar</button>{/snippet}
  <div class="form-group" style="margin-top: 10px">
    <label class="form-row"><span class="field-label">Nome</span><input class="field" bind:value={name} /></label>
    <div class="form-row" style="gap: 6px; flex-wrap: wrap">{#each symbols as s}<button class="sym" class:on={s === symbol} style:--c={color} onclick={() => (symbol = s)} aria-label={s}><Icon name={s} size={18} /></button>{/each}</div>
    <div class="form-row" style="flex-wrap: wrap; gap: 10px">{#each palette as c}<button class="swatch" class:on={c === color} style:background={c} aria-label="Cor" onclick={() => (color = c)}></button>{/each}</div>
  </div>
  {#if editing}<button class="btn danger" style="margin-top: 16px" onclick={async () => { await store.remove('workspaces', [editing!.id]); open = false; }}>Apagar área (as contas ficam sem área)</button>{/if}
</Sheet>

<style>
  .sym { width: 40px; height: 40px; border-radius: 10px; border: 0; background: none; color: var(--text-2); display: grid; place-items: center; }
  .sym.on { color: var(--c); background: color-mix(in srgb, var(--c) 22%, transparent); }
  .swatch { width: 26px; height: 26px; border-radius: 50%; border: 0; }
  .swatch.on { box-shadow: 0 0 0 2px #121916, 0 0 0 4px #fff; }
</style>
