<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import Toggle from '$lib/ui/Toggle.svelte';
  import SectionTitle from '$lib/ui/SectionTitle.svelte';
  import { hint } from '$lib/ui/hint';
  import SubHeader from '$lib/screens/more/SubHeader.svelte';
  import { reapplyAll } from '$lib/features/rules';
  import { enterDemo, exitDemo } from '$lib/data/demoMode';

  let workspaces = $state(store.workspacesEnabled);
  let months = $state(store.forecastMonths);
  let reapplied = $state<number | null>(null);
  let confirmErase = $state(false);
  let copied = $state(false);
  let newPassword = $state('');
  let passwordMessage = $state('');
  async function savePassword() {
    if (newPassword.length < 8) return void (passwordMessage = 'Use pelo menos 8 caracteres.');
    try {
      await store.changePassword(newPassword);
      newPassword = '';
      passwordMessage = 'Senha trocada.';
    } catch (error) {
      passwordMessage = error instanceof Error ? error.message : 'Não foi possível trocar.';
    }
  }

  $effect(() => {
    if (workspaces !== store.workspacesEnabled) void toggleWorkspaces(workspaces);
  });
  $effect(() => {
    if (months !== store.forecastMonths) void store.updateSettings({ forecast_months: months });
  });

  async function toggleWorkspaces(on: boolean) {
    await store.updateSettings({ workspaces_enabled: on });
    if (on && !store.workspaces.length) {
      await store.insert('workspaces', [
        { name: 'Meu', symbol: 'person', color: '#2BD4A4', sort_order: 0 },
        { name: 'Esposa', symbol: 'heart', color: '#FF8FAB', sort_order: 1 },
        { name: 'Casa', symbol: 'house', color: '#38D9F5', sort_order: 2 }
      ]);
    }
    if (!on) store.setWorkspace('');
  }

  async function copyCode() {
    await navigator.clipboard.writeText(store.household?.invite_code ?? '');
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }
</script>

<div class="page narrow">
  <SubHeader title="Conta e preferências" />

  <SectionTitle title="Casa" />
  <div class="form-group">
    <div class="form-row"><span class="field-label">Nome</span><span class="field">{store.household?.name}</span></div>
    <div class="form-row"><span class="field-label">Quem participa</span><span class="field">{store.members.map((m) => m.display_name || 'sem nome').join(', ')}</span></div>
    <div class="form-row" use:hint={['Acesso total', 'Quem tiver uma conta e este código entra na sua casa e vê TODO o financeiro. Para mostrar só carro, casa e listas, use Mais › Compartilhar.']}>
      <span class="field-label">Código de acesso total</span><span class="field num code">{store.household?.invite_code}</span>
      <button class="btn" onclick={copyCode}><Icon name={copied ? 'check' : 'copy'} size={15} />{copied ? 'Copiado' : 'Copiar'}</button>
    </div>
    <button class="form-row plain" onclick={() => store.rotateInvite()} use:hint={['Trocar código', 'O código antigo deixa de valer (quem já entrou continua).']}><Icon name="refresh" size={16} />Gerar código novo</button>
  </div>
  <p class="form-footer">Este código dá acesso a todo o seu financeiro. Para compartilhar só carro, casa e listas de compras, use <a class="link" href="#/mais/compartilhar">Mais › Compartilhar</a>.</p>

  <SectionTitle title="Organização" />
  <div class="form-group">
    <div class="form-row" use:hint={['Áreas de trabalho', 'Separa contas inteiras em espaços (Meu, Esposa, Casa). Desligado, tudo junto e você separa por pessoa.']}><span class="field-label grow">Usar áreas de trabalho</span><Toggle label="Áreas de trabalho" bind:checked={workspaces} /></div>
    {#if store.workspacesEnabled}<a class="form-row" href="#/mais/areas"><span class="grow">Áreas e a conta de cada uma</span><Icon name="chevron-right" size={15} class="faint" /></a>{/if}
  </div>
  <p class="form-footer">Ligado: cada conta fica numa área e, ao escolher uma área no topo, o app mostra só ela — contas, lançamentos, relatórios, contas fixas e importação. "Tudo" junta todas.</p>

  <SectionTitle title="Previsão" />
  <div class="form-group">
    <label class="form-row" use:hint={['Média do variável', 'Quantos meses entram na previsão do variável e na comparação do saldo. Com menos histórico, usa os que houver.']}>
      <span class="field-label">Média dos últimos</span><input class="field" type="number" min="2" max="12" bind:value={months} /><span class="muted">meses</span></label>
  </div>

  <SectionTitle title="Manutenção" />
  <div class="form-group">
    <button class="form-row plain" onclick={async () => (reapplied = await reapplyAll())} use:hint={['Reaplicar', 'Recategoriza o que você não corrigiu à mão, com os estabelecimentos e palavras-chave atuais.']}><Icon name="wand" size={16} />Reaplicar estabelecimentos e palavras-chave</button>
    {#if reapplied !== null}<div class="form-row caption">{reapplied ? `${reapplied} lançamentos atualizados.` : 'Nada mudou.'}</div>{/if}
    {#if confirmErase}
      <div class="form-row"><span class="grow small neg">Apagar contas, lançamentos e cadastros desta casa? Não dá para desfazer.</span><button class="btn danger" onclick={async () => { await store.eraseAll(); confirmErase = false; store.toast('Tudo apagado.'); }}>Apagar</button></div>
    {:else}
      <button class="form-row plain neg" onclick={() => (confirmErase = true)}><Icon name="trash" size={16} />Apagar todos os dados</button>
    {/if}
  </div>

  <SectionTitle title="Conta" />
  <div class="form-group">
    <div class="form-row"><span class="field-label">Entrou como</span><span class="field">{store.demo ? 'Demonstração' : store.userEmail}</span></div>
    {#if !store.demo}
      <div class="form-row" use:hint={['Trocar senha', 'Muda a senha de acesso desta conta (vale em todos os aparelhos).']}>
        <input class="field" style="text-align: left" type="password" autocomplete="new-password" placeholder="Senha nova (8+ caracteres)" bind:value={newPassword} />
        <button class="btn" disabled={!newPassword} onclick={savePassword}>Trocar senha</button>
      </div>
      {#if passwordMessage}<div class="form-row caption">{passwordMessage}</div>{/if}
    {/if}
    {#if store.demo}
      <button class="form-row plain" onclick={exitDemo}><Icon name="logout" size={16} />Sair da demonstração</button>
    {:else}
      <button class="form-row plain" onclick={() => store.signOut()}><Icon name="logout" size={16} />Sair deste aparelho</button>
    {/if}
  </div>

  <SectionTitle title="Demonstração" />
  <div class="form-group">
    {#if store.demo}
      <button class="form-row plain" onclick={exitDemo} use:hint={['Sair da demonstração', 'Volta para a sua conta (ou para o login).']}><Icon name="logout" size={16} />Sair da demonstração e voltar para a minha conta</button>
    {:else}
      <button class="form-row plain" onclick={() => enterDemo(true)} use:hint={['Ver a demonstração', 'Abre numa aba nova o app com dados fictícios. Nada do que você fizer lá chega à sua conta.']}><Icon name="sparkles" size={16} />Abrir a demonstração numa aba nova</button>
    {/if}
  </div>
  <p class="form-footer">A demonstração tem contas, cartões, carro, projetos e listas fictícios para testar tudo. Ela roda só no navegador: nada é salvo e nada mexe nos seus dados.</p>
  <p class="form-footer">Seus dados ficam na sua conta do Supabase, protegidos por login: só quem é da casa lê. O arquivo do banco é lido no próprio aparelho.</p>
</div>

<style>
  .plain { background: none; border: 0; width: 100%; text-align: left; }
  .code { letter-spacing: 0.12em; font-weight: 600; }
</style>
