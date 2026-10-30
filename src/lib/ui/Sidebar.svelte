<script lang="ts">
  import { page } from '$app/state';
  import { store } from '$lib/data/store.svelte';
  import { ui } from './ui.svelte';
  import Icon from './Icon.svelte';
  import { hint } from './hint';
  import { isProfileRoute, sectionOf, sections } from './nav';
  import ProfileAvatar from './ProfileAvatar.svelte';
  import { profileName } from '$lib/features/profile';

  /** Menu lateral fino do computador: Início, Lançamentos e Notas; Importar e o perfil (com as configurações) embaixo. */
  const active = $derived(sectionOf(page.route.id ?? '/'));
  const ordered = $derived([sections[1], sections[0], sections[2]]);
  const onProfile = $derived(isProfileRoute(page.route.id ?? ''));
</script>

<nav class="sidebar glass" aria-label="Seções">
  <div class="brand"><span class="logo"><Icon name="trending-up" size={17} stroke={2.6} /></span>Financeiro</div>
  <div class="links">
    {#each ordered as s (s.id)}
      <a href={s.href} class="link" class:on={active === s.id && !onProfile} aria-current={active === s.id && !onProfile ? "page" : undefined}>
        <span class="ico" style:--c={s.color}><Icon name={s.icon} size={17} stroke={2.2} /></span>{s.label}
      </a>
    {/each}
  </div>
  <div class="bottom">
    <button class="btn primary block import" onclick={() => ui.startImport()} use:hint={['Importar extrato', 'Escolha a conta e o arquivo do banco (OFX, CSV ou PDF). Também dá para arrastar o arquivo para a janela.']}>
      <Icon name="import" size={17} />Importar extrato
    </button>
    <a class="who" class:on={onProfile} href="#/mais" use:hint={['Perfil', 'Família, contas, categorias e todas as configurações.']}>
      <ProfileAvatar size={30} /><span class="grow ellipsis"><b class="line ellipsis">{profileName()}</b><span class="caption ellipsis line">{store.demo ? 'Demonstração' : store.userEmail}</span></span><Icon name="chevron-right" size={14} class="faint" />
    </a>
  </div>
</nav>

<style>
  .sidebar { display: flex; flex-direction: column; position: sticky; top: 0; height: 100dvh; padding: 16px 12px 12px; border-width: 0 1px 0 0; border-radius: 0; }
  .brand { display: flex; align-items: center; gap: 10px; font: 700 17px var(--font-display); padding: 4px 6px 22px; }
  .logo { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; color: #b8ffe6; background: linear-gradient(160deg, #1d7a5e, #06140f); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12), 0 4px 14px rgba(43, 212, 164, 0.25); }
  .links { display: flex; flex-direction: column; gap: 4px; flex: 1; }
  .link { display: flex; align-items: center; gap: 12px; min-height: 44px; padding: 6px 10px; border-radius: 12px; color: var(--text); font-size: 15.5px; font-weight: 500; transition: background 0.2s, transform 0.2s cubic-bezier(0.22, 1, 0.36, 1); }
  .link:hover { background: rgba(255, 255, 255, 0.055); }
  .link:active { transform: scale(0.97); }
  .ico { transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1); }
  .link:hover .ico { transform: scale(1.06); }
  .link.on { background: rgba(255, 255, 255, 0.11); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06); }
  .ico { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; flex: none; color: #fff; background: linear-gradient(160deg, var(--c), color-mix(in srgb, var(--c) 62%, black)); box-shadow: inset 0 0 0 0.5px rgba(255, 255, 255, 0.2); }
  .bottom { display: flex; flex-direction: column; gap: 10px; padding-top: 10px; border-top: 1px solid var(--stroke); }
  /* O degradê fica fixo (degradê não anima); no hover só acende um brilho por cima, suave. */
  .import { position: relative; isolation: isolate; overflow: hidden; box-shadow: 0 6px 20px rgba(43, 212, 164, 0.25); background: linear-gradient(180deg, #3fe3b4, #20b98d); }
  .import::after { content: ''; position: absolute; inset: 0; z-index: -1; background: linear-gradient(180deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.04)); opacity: 0; transition: opacity 0.25s var(--ease); }
  .import:hover { background: linear-gradient(180deg, #3fe3b4, #20b98d); box-shadow: 0 8px 24px rgba(43, 212, 164, 0.32); }
  .import:hover::after { opacity: 1; }
  .who { display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 12px; color: inherit; font-size: 14px; transition: background 0.2s; }
  .who:hover, .who.on { background: rgba(255, 255, 255, 0.07); }
  .line { display: block; }

</style>
