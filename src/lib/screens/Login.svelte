<script lang="ts">
  import { enterDemo } from '$lib/data/demoMode';
  import { supabase } from '$lib/data/backend';
  import { store, describe } from '$lib/data/store.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import AuthShowcase from './AuthShowcase.svelte';

  let email = $state('');
  let password = $state('');
  let busy = $state(false);
  let message = $state('');
  let mode = $state<'login' | 'reset'>('login');

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    message = '';
    try {
      if (mode === 'reset') {
        const { error } = await supabase().auth.resetPasswordForEmail(email.trim(), { redirectTo: location.origin + location.pathname });
        if (error) throw error;
        message = 'Se o e-mail estiver cadastrado, chega um link para criar uma senha nova.';
      } else {
        const { data, error } = await supabase().auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw new Error(error.message.includes('Invalid') ? 'E-mail ou senha incorretos.' : error.message);
        await store.enter(data.user.id, data.user.email ?? '');
      }
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
    <div class="logo"><Icon name="trending-up" size={34} stroke={2.4} /></div>
    <h1>Financeiro</h1>
    <p class="muted">As contas da casa em qualquer aparelho. Só quem tem acesso à sua casa vê os dados.</p>
    <input class="input" type="email" autocomplete="email" placeholder="E-mail" bind:value={email} required />
    {#if mode === 'login'}
      <input class="input" type="password" autocomplete="current-password" placeholder="Senha" bind:value={password} required />
    {/if}
    <button class="btn primary lg block" disabled={busy}>{mode === 'login' ? 'Entrar' : 'Enviar link'}</button>
    {#if message}<p class="small" class:neg={mode === 'login'}>{message}</p>{/if}
    <button type="button" class="btn ghost" onclick={() => { mode = mode === 'login' ? 'reset' : 'login'; message = ''; }}>
      {mode === 'login' ? 'Esqueci a senha' : 'Voltar para entrar'}
    </button>
    <button type="button" class="btn demo" onclick={() => enterDemo()}><Icon name="sparkles" size={16} />Ver a demonstração</button>
    <p class="caption">A demonstração usa dados fictícios e não precisa de conta.</p>
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
  .panel { width: min(380px, 100%); text-align: center; align-items: stretch; }
  .logo { width: 76px; height: 76px; margin: 0 auto 4px; border-radius: 22px; display: grid; place-items: center; color: #b8ffe6; background: linear-gradient(160deg, #14503e, #050c09); box-shadow: 0 10px 40px rgba(43, 212, 164, 0.25), inset 0 0 0 1px rgba(255, 255, 255, 0.08); }
  h1 { margin: 0; font: 700 30px var(--font-display); letter-spacing: -0.02em; }
  p { margin: 0 0 8px; }
  .demo { margin-top: 8px; color: var(--accent); }
</style>
