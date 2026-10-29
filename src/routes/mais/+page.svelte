<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import { organizer } from '$lib/data/organizer.svelte';
  import SectionTitle from '$lib/ui/SectionTitle.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import { hint } from '$lib/ui/hint';
  import MoreRow from '$lib/screens/more/MoreRow.svelte';
  import FamilySheet from '$lib/screens/settings/FamilySheet.svelte';
  import { exitDemo } from '$lib/data/demoMode';
  import { ui } from '$lib/ui/ui.svelte';
  import { pwa } from '$lib/features/pwa.svelte';
  import InstallCard from '$lib/ui/InstallCard.svelte';
  import ProfileAvatar from '$lib/ui/ProfileAvatar.svelte';
  import { profileName } from '$lib/features/profile';

  /** Perfil (abre pelo avatar do Início): quem é você, família e compartilhamento, conta e sair.
   *  O que é de uma tela (categorias, contas fixas, contas no Saldo…) fica no Configurar dela. */
  let familyOpen = $state(false);
  const fullAccess = $derived(store.members);
  const sharedMembers = $derived(organizer.shared.flatMap((space) => organizer.members.filter((m) => m.household_id === space.id).map((m) => ({ ...m, space: space.name }))));
  const nameOf = (m: { user_id: string; display_name: string }) => (m.user_id === store.userId ? 'Você' : m.display_name || 'Sem nome');
</script>

<div class="page narrow">
  <header class="me">
    <a class="icon-btn back" href="#/" aria-label="Voltar" onclick={(e) => { if (ui.navigations) { e.preventDefault(); history.back(); } }}><Icon name="chevron-left" /></a>
    <ProfileAvatar size={72} />
    <div class="who"><h1>{profileName()}</h1><span class="muted small">{store.demo ? 'Demonstração · dados fictícios' : store.userEmail}</span>
      <a class="link small" href="#/mais/pessoas" use:hint={['Foto', 'A foto do perfil é a da pessoa “Eu”, em De quem é cada gasto.']}>Trocar foto</a></div>
  </header>

  <SectionTitle title="Família"><button class="btn ghost" onclick={() => (familyOpen = true)}><Icon name="plus" size={15} />Adicionar</button></SectionTitle>
  <div class="card flush list">
    {#each fullAccess as m (m.user_id)}
      <div class="list-row"><span class="avatar">{nameOf(m).slice(0, 1)}</span><span class="grow">{nameOf(m)}</span><span class="pill full">Tudo</span></div>
    {/each}
    {#each sharedMembers.filter((m) => m.user_id !== store.userId && !fullAccess.some((f) => f.user_id === m.user_id)) as m (m.user_id + m.space)}
      <div class="list-row"><span class="avatar">{nameOf(m).slice(0, 1)}</span><span class="grow">{nameOf(m)}</span><span class="pill notes">Notas · {m.space}</span></div>
    {/each}
    <button class="list-row add-row" onclick={() => (familyOpen = true)}><span class="avatar plus"><Icon name="plus" size={15} /></span><span class="grow">Adicionar familiar</span><Icon name="chevron-right" size={15} class="faint" /></button>
  </div>
  <p class="form-footer"><b>Tudo</b>: vê e edita o financeiro. <b>Notas</b>: vê só o que você marcar como compartilhado (listas, desejos, carro).</p>

  <div class="card flush list" style="margin-top: 12px">
    <MoreRow href="#/mais/compartilhar" title="Espaços compartilhados" detail="O que a família vê junto: listas, desejos, carro." icon="share" color="#FF8FAB" />
  </div>

  {#if pwa.canInstall || pwa.standalone}
    <SectionTitle title="App no celular" />
    {#if pwa.standalone}<div class="card row small installed"><Icon name="check-circle" size={18} />Você está usando o app instalado.</div>{:else}<InstallCard />{/if}
  {/if}

  <SectionTitle title="Conta" />
  <div class="card flush list">
    <MoreRow href="#/mais/ajustes" title="Conta e preferências" detail="Senha, código da casa, painéis avançados, manutenção e demonstração." icon="settings" color="#8E8E93" />
  </div>
  <button class="btn block signout" onclick={() => (store.demo ? exitDemo() : store.signOut())}><Icon name="logout" size={16} />{store.demo ? 'Sair da demonstração' : 'Sair da conta'}</button>
</div>
<FamilySheet bind:open={familyOpen} />

<style>
  .me { position: relative; display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 14px 0 8px; text-align: center; }
  .me .back { position: absolute; left: 0; top: 8px; }
  .who { display: flex; flex-direction: column; align-items: center; gap: 2px; }
  .who h1 { margin: 4px 0 0; font: 700 26px var(--font-display); letter-spacing: -0.02em; }
  .who .link { margin-top: 4px; }
  .avatar { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; flex: none; font-weight: 700; background: rgba(255, 143, 171, 0.18); color: #ff8fab; }
  .avatar.plus { background: var(--accent-soft); color: var(--accent); }
  .add-row { color: var(--accent); }
  .installed { gap: 10px; color: var(--text-2); }
  .installed :global(svg) { color: var(--accent); }
  .signout { margin-top: 22px; color: var(--negative); }
  .pill.full { color: var(--accent); background: var(--accent-soft); }
  .pill.notes { color: #ff8fab; background: rgba(255, 143, 171, 0.14); }
</style>
