<script lang="ts">
  import { enterDemo } from '$lib/data/demoMode';
  import { store, describe } from '$lib/data/store.svelte';
  import Segmented from '$lib/ui/Segmented.svelte';
  import AuthShowcase from './AuthShowcase.svelte';

  let mode = $state<'create' | 'join'>('create');
  let house = $state('Nossa casa');
  let name = $state('');
  let code = $state('');
  let busy = $state(false);
  let message = $state('');

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    message = '';
    try {
      if (mode === 'create') await store.createHousehold(house, name);
      else await store.joinHousehold(code, name);
    } catch (error) {
      message = describe(error);
    } finally {
      busy = false;
    }
  }
</script>

<div class="wrap">
  <div class="side"><AuthShowcase /></div>
  <form class="panel stack glass-panel" onsubmit={submit}>
    <h1>Bem-vindo</h1>
    <p class="muted">Os dados ficam numa "casa". Quem é da casa (você, sua esposa…) vê e edita tudo junto.</p>
    <Segmented label="Como começar" bind:value={mode} options={[{ value: 'create', label: 'Criar minha casa' }, { value: 'join', label: 'Entrar com código' }]} />
    <input class="input" placeholder="Seu nome (ex.: Matheus)" bind:value={name} required />
    {#if mode === 'create'}
      <input class="input" placeholder="Nome da casa" bind:value={house} />
    {:else}
      <input class="input" placeholder="Código de convite (ex.: 4F9A2C1B)" bind:value={code} required autocapitalize="characters" />
      <p class="caption">Quem criou a casa encontra o código em Perfil › Conta e preferências.</p>
    {/if}
    <button class="btn primary lg block" disabled={busy}>{mode === 'create' ? 'Criar e começar' : 'Entrar na casa'}</button>
    {#if message}<p class="small neg">{message}</p>{/if}
    <button type="button" class="btn ghost" onclick={() => enterDemo(true)}>Ver a demonstração (nova aba)</button>
    <button type="button" class="btn ghost" onclick={() => store.signOut()}>Sair ({store.userEmail})</button>
  </form>
</div>

<style>
  .wrap { min-height: 100dvh; display: grid; place-items: center; padding: 24px; gap: 64px; }
  .side { display: none; }
  @media (min-width: 1000px) {
    .wrap { grid-template-columns: minmax(0, 560px) 420px; justify-content: center; }
    .side { display: block; }
    .glass-panel { padding: 34px 30px; border-radius: 28px; background: rgba(22, 30, 27, 0.6); backdrop-filter: blur(28px) saturate(1.6); -webkit-backdrop-filter: blur(28px) saturate(1.6);
      border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 30px 80px rgba(0, 0, 0, 0.45); }
  }
  .panel { width: min(400px, 100%); text-align: center; }
  h1 { margin: 0; font: 700 30px var(--font-display); }
  p { margin: 0; }
</style>
