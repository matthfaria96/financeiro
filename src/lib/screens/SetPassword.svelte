<script lang="ts">
  import { store, describe } from '$lib/data/store.svelte';
  let password = $state('');
  let repeat = $state('');
  let busy = $state(false);
  let message = $state('');
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (password.length < 8) return void (message = 'Use pelo menos 8 caracteres.');
    if (password !== repeat) return void (message = 'As duas senhas não são iguais.');
    busy = true;
    try {
      await store.changePassword(password);
      history.replaceState(null, '', location.pathname + '#/');
      await store.enter(store.userId, store.userEmail);
      store.toast('Senha nova salva.');
    } catch (error) {
      message = describe(error);
    } finally {
      busy = false;
    }
  }
</script>

<div class="wrap">
  <form class="panel stack" onsubmit={submit}>
    <h1>Senha nova</h1>
    <p class="muted">Para {store.userEmail}. Depois você entra direto.</p>
    <input class="input" type="password" autocomplete="new-password" placeholder="Senha nova (8+ caracteres)" bind:value={password} required />
    <input class="input" type="password" autocomplete="new-password" placeholder="Repita a senha" bind:value={repeat} required />
    <button class="btn primary lg block" disabled={busy}>Salvar e entrar</button>
    {#if message}<p class="small neg">{message}</p>{/if}
  </form>
</div>

<style>
  .wrap { min-height: 100dvh; display: grid; place-items: center; padding: 24px; }
  .panel { width: min(380px, 100%); text-align: center; }
  h1 { margin: 0; font: 700 28px var(--font-display); }
  p { margin: 0; }
</style>
