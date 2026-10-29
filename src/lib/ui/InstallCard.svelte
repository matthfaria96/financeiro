<script lang="ts">
  import Icon from './Icon.svelte';
  import { pwa } from '$lib/features/pwa.svelte';
  import { store } from '$lib/data/store.svelte';

  /**
   * Convite para instalar o app (ícone na tela de início, abre em tela cheia, funciona sem internet).
   * Android/Chrome: botão Instalar. iPhone/iPad: o passo a passo do Safari. `dismissible`: some e não volta neste aparelho.
   */
  let { dismissible = false }: { dismissible?: boolean } = $props();
  const KEY = 'financeiro.instalar-dispensado';
  let dismissed = $state((() => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } })());
  function dismiss() {
    dismissed = true;
    try { localStorage.setItem(KEY, '1'); } catch { /* aba privada */ }
  }
  async function install() {
    if (await pwa.install()) store.toast('App instalado: procure o ícone do Financeiro na tela de início.');
  }
  const show = $derived(pwa.canInstall && !(dismissible && (dismissed || !pwa.mobile)));
</script>

{#if show}
  <section class="card install">
    <span class="logo"><Icon name="trending-up" size={22} stroke={2.6} /></span>
    <div class="grow">
      <b>Instale o app</b>
      {#if pwa.installEvent}
        <p class="caption">Ícone na tela de início, abre em tela cheia e funciona sem internet.</p>
      {:else}
        <p class="caption">No Safari, toque em <span class="glyph"><Icon name="share" size={13} /></span> <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>. Abre em tela cheia e funciona sem internet.</p>
      {/if}
    </div>
    <div class="actions">
      {#if pwa.installEvent}<button class="btn primary sm" onclick={install}>Instalar</button>{/if}
      {#if dismissible}<button class="icon-btn close" aria-label="Agora não" onclick={dismiss}><Icon name="x" size={15} /></button>{/if}
    </div>
  </section>
{/if}

<style>
  .install { display: flex; align-items: center; gap: 14px; padding: 14px 14px 14px 16px; background: linear-gradient(135deg, rgba(43, 212, 164, 0.14), rgba(57, 135, 229, 0.08)); border-color: rgba(43, 212, 164, 0.25); }
  .logo { width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; flex: none; color: #b8ffe6; background: linear-gradient(160deg, #1d7a5e, #06140f); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12), 0 6px 18px rgba(43, 212, 164, 0.25); }
  b { font-size: 15px; }
  p { margin: 3px 0 0; line-height: 1.4; }
  p b { font-size: inherit; color: var(--text); }
  .glyph { display: inline-grid; place-items: center; width: 20px; height: 20px; border-radius: 6px; vertical-align: -5px; background: rgba(255, 255, 255, 0.1); color: #6fb6ff; }
  .actions { display: flex; align-items: center; gap: 6px; flex: none; }
  .sm { height: 34px; padding: 0 14px; font-size: 14px; }
  .close { width: 30px; height: 30px; }
</style>
