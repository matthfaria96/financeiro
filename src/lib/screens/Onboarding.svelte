<script lang="ts">
  import { store, describe } from '$lib/data/store.svelte';
  import Segmented from '$lib/ui/Segmented.svelte';

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
  <form class="panel stack" onsubmit={submit}>
    <h1>Bem-vindo</h1>
    <p class="muted">Os dados ficam numa "casa". Quem é da casa (você, sua esposa…) vê e edita tudo junto.</p>
    <Segmented label="Como começar" bind:value={mode} options={[{ value: 'create', label: 'Criar minha casa' }, { value: 'join', label: 'Entrar com código' }]} />
    <input class="input" placeholder="Seu nome (ex.: Matheus)" bind:value={name} required />
    {#if mode === 'create'}
      <input class="input" placeholder="Nome da casa" bind:value={house} />
    {:else}
      <input class="input" placeholder="Código de convite (ex.: 4F9A2C1B)" bind:value={code} required autocapitalize="characters" />
      <p class="caption">Quem criou a casa encontra o código em Mais › Ajustes.</p>
    {/if}
    <button class="btn primary lg block" disabled={busy}>{mode === 'create' ? 'Criar e começar' : 'Entrar na casa'}</button>
    {#if message}<p class="small neg">{message}</p>{/if}
    <button type="button" class="btn ghost" onclick={() => store.signOut()}>Sair ({store.userEmail})</button>
  </form>
</div>

<style>
  .wrap { min-height: 100dvh; display: grid; place-items: center; padding: 24px; }
  .panel { width: min(400px, 100%); text-align: center; }
  h1 { margin: 0; font: 700 30px var(--font-display); }
  p { margin: 0; }
</style>
