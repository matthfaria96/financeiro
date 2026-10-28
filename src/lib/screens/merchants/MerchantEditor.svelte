<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import type { Merchant } from '$lib/data/types';
  import { costName } from '$lib/core/catalog';
  import Sheet from '$lib/ui/Sheet.svelte';
  import Avatar from '$lib/ui/Avatar.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import Toggle from '$lib/ui/Toggle.svelte';
  import CategorySelect from '$lib/ui/CategorySelect.svelte';
  import { hint } from '$lib/ui/hint';
  import { palette } from '$lib/ui/look';
  import { applyMerchant, colorFor } from '$lib/features/rules';
  import { categoryCost } from '$lib/features/model';
  import { compressImage, hostOf, kilobytes } from '$lib/features/logos';
  import LogoSearch from './LogoSearch.svelte';

  /** Estabelecimento: logo/foto/emoji, como reconhecer na descrição do banco e o que aplicar. */
  let { open = $bindable(), merchant = null, suggestedName = '', suggestedPattern = '', onsaved }: {
    open: boolean; merchant?: Merchant | null; suggestedName?: string; suggestedPattern?: string; onsaved?: (merchant: Merchant) => void;
  } = $props();

  let name = $state('');
  let patterns = $state('');
  let emoji = $state('');
  let color = $state(palette[0]);
  let imageUrl = $state('');
  let imageData = $state('');
  let isLogo = $state(false);
  let website = $state('');
  let categoryId = $state<string | null>(null);
  let personId = $state<string | null>(null);
  let cost = $state<'' | 'fixed' | 'variable'>('');
  let rename = $state(false);
  let searching = $state(false);
  let confirmDelete = $state(false);
  let file: HTMLInputElement | undefined = $state();

  $effect(() => {
    if (!open) return;
    confirmDelete = false;
    if (merchant) {
      ({ name, patterns, emoji, color, website } = merchant);
      imageUrl = merchant.image_url; imageData = merchant.image_data; isLogo = merchant.is_logo; categoryId = merchant.category_id;
      personId = merchant.person_id; cost = merchant.cost_type; rename = !!merchant.rename_to;
    } else {
      name = suggestedName; patterns = suggestedPattern; emoji = ''; color = colorFor(suggestedName); imageUrl = ''; imageData = '';
      isLogo = false; website = ''; categoryId = null; personId = null; cost = ''; rename = false;
    }
  });

  const preview = $derived({ name: name || '?', emoji, color, image_url: imageUrl, image_data: imageData, is_logo: isLogo });
  const category = $derived(store.categoryById.get(categoryId ?? '') ?? null);

  async function choosePhoto(event: Event) {
    const picked = (event.currentTarget as HTMLInputElement).files?.[0];
    if (!picked) return;
    try {
      imageData = await compressImage(picked);
      imageUrl = '';
      isLogo = false;
    } catch {
      store.toast('Não consegui abrir esta imagem. Tente outra.', 'error');
    }
  }

  async function save() {
    const fields: Partial<Merchant> = {
      name: name.trim(), patterns: patterns.split(',').map((p) => p.trim()).filter(Boolean).join(', '), emoji: [...emoji.trim()].slice(0, 2).join(''),
      color, image_url: imageUrl, image_data: imageData, is_logo: isLogo && !!(imageUrl || imageData), website: hostOf(website) ?? website.trim(),
      category_id: categoryId, person_id: personId, cost_type: cost, rename_to: rename ? name.trim() : ''
    };
    let saved: Merchant;
    if (merchant) {
      await store.update('merchants', merchant.id, fields);
      saved = store.merchantById.get(merchant.id)!;
    } else {
      [saved] = await store.insert('merchants', [{ key: '', ...fields }]);
    }
    const count = await applyMerchant(saved);
    open = false;
    store.toast(count ? `Salvo e aplicado em ${count} lançamentos.` : 'Estabelecimento salvo.');
    onsaved?.(saved);
  }

  async function remove() {
    if (!merchant) return;
    await store.remove('merchants', [merchant.id]);
    open = false;
  }
</script>

<Sheet bind:open title={merchant ? 'Estabelecimento' : 'Novo estabelecimento'}>
  {#snippet actions()}<button class="btn primary" disabled={!name.trim()} onclick={save}>Salvar</button>{/snippet}
  <div class="preview"><Avatar merchant={preview} {category} size={88} /><b>{name || 'Novo estabelecimento'}</b></div>

  <div class="form-title">Avatar</div>
  <div class="form-group">
    <button class="form-row plain accent" onclick={() => (searching = true)} use:hint={['Buscar logo', 'Procura o logo da empresa pelo site (ex.: ifood.com.br) e mostra as opções.']}><Icon name="search" size={17} />Buscar logo na internet</button>
    <button class="form-row plain" onclick={() => file?.click()} use:hint={['Foto', 'Usa uma foto sua. Ela é reduzida e comprimida aqui mesmo (uns 5 KB).']}><Icon name="image" size={17} />Escolher foto ou imagem…</button>
    <input bind:this={file} type="file" accept="image/*" hidden onchange={choosePhoto} />
    {#if imageUrl || imageData}
      <div class="form-row"><span class="grow caption">{imageData ? `Foto salva: ${kilobytes(imageData.length * 0.75)}` : 'Logo por link (não ocupa espaço)'}</span><button class="btn danger" onclick={() => { imageUrl = ''; imageData = ''; isLogo = false; }}>Remover</button></div>
    {/if}
    <label class="form-row"><span class="field-label">Site</span><input class="field" placeholder="ex.: ifood.com.br" autocapitalize="off" bind:value={website} /></label>
    <label class="form-row"><span class="field-label">Emoji</span><input class="field" placeholder="opcional, ex.: 🍔" bind:value={emoji} /></label>
    <div class="form-row colors">{#each palette as c}<button class="swatch" class:on={c === color} style:background={c} aria-label="Cor {c}" onclick={() => (color = c)}></button>{/each}</div>
  </div>

  <div class="form-title">Reconhecimento</div>
  <div class="form-group">
    <label class="form-row"><span class="field-label">Nome</span><input class="field" bind:value={name} /></label>
    <label class="form-row" use:hint={['Como reconhecer', 'Trechos da descrição do banco, separados por vírgula. Ex.: ifood, ifd*. Sem diferença de maiúsculas e acentos.']}><span class="field-label">Quando a descrição tiver</span><input class="field" bind:value={patterns} placeholder="ifood, ifd*" /></label>
    <div class="form-row" use:hint={['Renomear', 'Ligado: todo lançamento reconhecido aparece com este nome. Desligado: mantém o nome do banco (útil no iFood, para ver o restaurante).']}><span class="field-label grow">Usar este nome nos lançamentos</span><Toggle label="Renomear" bind:checked={rename} /></div>
  </div>
  <p class="form-footer">Todo lançamento com um desses trechos recebe este avatar, a categoria e o dono abaixo.</p>

  <div class="form-title">O que aplicar</div>
  <div class="form-group">
    <label class="form-row"><span class="field-label">Categoria</span><span class="field"><CategorySelect value={categoryId} pill={false} allowNone onchange={(v) => (categoryId = v || null)} /></span></label>
    <label class="form-row"><span class="field-label">De quem</span><select class="field" bind:value={personId}><option value={null}>Não mudar</option>{#each store.people as p (p.id)}<option value={p.id}>{p.name}</option>{/each}</select></label>
    <label class="form-row"><span class="field-label">Tipo de gasto</span><select class="field" bind:value={cost}><option value="">Automático ({costName[categoryCost(category ?? undefined)].toLowerCase()})</option><option value="fixed">Fixo</option><option value="variable">Variável</option></select></label>
  </div>

  {#if merchant}
    <div class="form-group" style="margin-top: 18px">
      {#if confirmDelete}
        <div class="form-row"><span class="grow small neg">Apagar? Os lançamentos continuam, só perdem o avatar.</span><button class="btn danger" onclick={remove}>Apagar</button></div>
      {:else}
        <button class="form-row plain neg" onclick={() => (confirmDelete = true)}>Apagar estabelecimento</button>
      {/if}
    </div>
  {/if}
</Sheet>

<LogoSearch bind:open={searching} initial={website || name} onpick={(url, domain) => { imageUrl = url; imageData = ''; isLogo = true; if (!website) website = domain; }} />

<style>
  .preview { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 14px 0 4px; }
  .plain { background: none; border: 0; width: 100%; text-align: left; }
  .accent { color: var(--accent); }
  .colors { flex-wrap: wrap; gap: 10px; padding: 12px 16px; }
  .swatch { width: 26px; height: 26px; border-radius: 50%; border: 0; box-shadow: 0 0 0 2px transparent; }
  .swatch.on { box-shadow: 0 0 0 2px #121916, 0 0 0 4px #fff; }
</style>
