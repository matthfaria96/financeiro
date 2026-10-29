<script lang="ts">
  import { store, describe } from '$lib/data/store.svelte';
  import { organizer } from '$lib/data/organizer.svelte';
  import { supabase } from '$lib/data/backend';
  import Sheet from '$lib/ui/Sheet.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import { hint } from '$lib/ui/hint';

  /**
   * Adicionar familiar: nome, e-mail e o que ela pode ver. O servidor cria o acesso com senha provisória
   * (trocada no primeiro login) e põe a pessoa na casa (tudo) ou no espaço compartilhado (só as Notas).
   */
  let { open = $bindable() }: { open: boolean } = $props();
  let name = $state('');
  let email = $state('');
  let access = $state<'notes' | 'all'>('notes');
  let busy = $state(false);
  let error = $state('');
  let fallbackCode = $state('');
  let result = $state<{ email: string; password: string | null } | null>(null);
  let copied = $state(false);

  $effect(() => {
    if (open) { name = ''; email = ''; access = 'notes'; error = ''; fallbackCode = ''; result = null; copied = false; }
  });

  const site = typeof location === 'undefined' ? '' : `${location.origin}${location.pathname}`;
  const message = $derived(result
    ? `Oi${name ? `, ${name.split(' ')[0]}` : ''}! Criei seu acesso ao nosso Financeiro: ${site}\nE-mail: ${result.email}${result.password ? `\nSenha provisória: ${result.password}\nNo primeiro acesso você cria a sua senha.` : '\nEntre com a sua senha de sempre.'}`
    : '');

  async function targetHousehold(): Promise<string> {
    if (access === 'all') return store.household!.id;
    if (!organizer.shared.length) await organizer.createSpace('Família');
    return organizer.shared[0].id;
  }

  async function invite() {
    busy = true;
    error = '';
    try {
      const householdId = await targetHousehold();
      if (store.demo) {
        result = { email: email.trim(), password: 'Fin-demo-123456' };
        return;
      }
      const { data, error: fail } = await supabase().functions.invoke('convidar', { body: { email: email.trim(), name: name.trim(), householdId } });
      if (fail) {
        // Função ainda não publicada no servidor: oferece o código de convite como alternativa.
        const notDeployed = /404|Failed to send|FunctionsFetchError|not found/i.test(`${fail.name} ${fail.message}`);
        if (notDeployed) {
          fallbackCode = access === 'all' ? store.household?.invite_code ?? '' : organizer.spaceById.get(householdId)?.invite_code ?? '';
          error = 'O convite automático ainda não foi ativado no servidor.';
          return;
        }
        const body = await (fail as { context?: Response }).context?.json?.().catch(() => null);
        throw new Error(body?.error ?? fail.message);
      }
      result = { email: email.trim(), password: (data as { password: string | null }).password };
      await organizer.refreshSpaces().catch(() => {});
    } catch (e) {
      error = describe(e);
    } finally {
      busy = false;
    }
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }
</script>

<Sheet bind:open title="Adicionar familiar">
  {#snippet actions()}{#if !result}<button class="btn primary" disabled={busy || !email.includes('@')} onclick={invite}>{busy ? 'Criando…' : 'Convidar'}</button>{/if}{/snippet}
  {#if result}
    <div class="done stack">
      <span class="ok"><Icon name="check-circle" size={34} /></span>
      <b>Acesso pronto para {name || result.email}</b>
      <p class="small muted">Mande esta mensagem para ela (WhatsApp, por exemplo):</p>
      <pre class="msg">{message}</pre>
      <button class="btn primary" onclick={() => copy(message)}><Icon name={copied ? 'check' : 'copy'} size={15} />{copied ? 'Copiado' : 'Copiar mensagem'}</button>
    </div>
  {:else}
    <div class="form-group" style="margin-top: 10px">
      <label class="form-row"><span class="field-label">Nome</span><input class="field" placeholder="ex.: Júlia" bind:value={name} /></label>
      <label class="form-row"><span class="field-label">E-mail</span><input class="field" type="email" autocomplete="off" placeholder="email@exemplo.com" bind:value={email} /></label>
    </div>
    <div class="form-title">O que ela pode ver</div>
    <div class="options">
      <button class="option card" class:on={access === 'notes'} onclick={() => (access = 'notes')} use:hint={['Só o compartilhado', 'Listas, desejos e transporte que você colocar em "Quem vê: compartilhado". O seu financeiro continua só seu.']}>
        <span class="ico"><Icon name="list-checks" size={18} /></span><span class="grow"><b>Só o que eu compartilhar</b><span class="caption block">Notas compartilhadas (mercado, desejos, carro). Ela também ganha o financeiro dela, separado.</span></span>
      </button>
      <button class="option card" class:on={access === 'all'} onclick={() => (access = 'all')} use:hint={['Acesso total', 'Vê e edita todo o seu financeiro: contas, lançamentos e relatórios.']}>
        <span class="ico"><Icon name="users" size={18} /></span><span class="grow"><b>Tudo, inclusive o financeiro</b><span class="caption block">Contas, lançamentos, relatórios e Notas. Ideal para quem divide as contas da casa.</span></span>
      </button>
    </div>
    {#if error}
      <div class="card warnbox stack-sm">
        <span class="small">{error}</span>
        {#if fallbackCode}<span class="small muted">Enquanto isso: crie o login dela e peça para ela entrar com este código em Perfil › Família:</span>
          <button class="btn" onclick={() => copy(fallbackCode)}><Icon name={copied ? 'check' : 'copy'} size={15} />{fallbackCode}</button>{/if}
      </div>
    {/if}
    <p class="form-footer">O app cria o acesso dela com uma senha provisória; no primeiro login ela escolhe a própria senha.</p>
  {/if}
</Sheet>

<style>
  .options { display: flex; flex-direction: column; gap: 10px; }
  .option { display: flex; align-items: center; gap: 14px; text-align: left; padding: 14px 16px; }
  .option.on { border-color: var(--accent); background: var(--accent-soft); }
  .option b { font-size: 15px; }
  .ico { width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; flex: none; background: rgba(255, 255, 255, 0.07); color: var(--text-2); }
  .on .ico { color: var(--accent); }
  .block { display: block; margin-top: 2px; }
  .warnbox { margin-top: 12px; border-color: rgba(255, 166, 61, 0.4); }
  .done { align-items: center; text-align: center; padding: 16px 4px; }
  .done p { margin: 0; }
  .ok { color: var(--positive); }
  .msg { width: 100%; white-space: pre-wrap; text-align: left; font: 13.5px/1.5 var(--font); background: rgba(255, 255, 255, 0.05); border: 1px solid var(--stroke); border-radius: 12px; padding: 12px; margin: 0; }
</style>
