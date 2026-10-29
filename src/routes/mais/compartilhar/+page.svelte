<script lang="ts">
  import { onMount } from 'svelte';
  import { organizer } from '$lib/data/organizer.svelte';
  import { store } from '$lib/data/store.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import SectionTitle from '$lib/ui/SectionTitle.svelte';
  import { hint } from '$lib/ui/hint';
  import SubHeader from '$lib/screens/more/SubHeader.svelte';

  let name = $state('Nós dois');
  let code = $state('');
  let busy = $state(false);
  let message = $state('');
  let copied = $state('');
  let leaving = $state('');

  const counts = (spaceId: string) => ({
    cars: organizer.vehicles.filter((v) => v.household_id === spaceId).length,
    projects: organizer.projects.filter((p) => p.household_id === spaceId).length,
    lists: organizer.shopping_lists.filter((l) => l.household_id === spaceId).length
  });

  async function run(action: () => Promise<void>, done: string) {
    busy = true;
    message = '';
    try {
      await action();
      store.toast(done);
      code = '';
    } catch (error) {
      message = error instanceof Error ? error.message : 'Não deu certo.';
    } finally {
      busy = false;
    }
  }

  async function copy(spaceId: string, text: string) {
    await navigator.clipboard.writeText(text);
    copied = spaceId;
    setTimeout(() => (copied = ''), 2000);
  }

  // Ao abrir, busca de novo quem participa (ela pode ter acabado de entrar).
  onMount(() => void organizer.refreshSpaces().catch(() => {}));
</script>

<div class="page narrow">
  <SubHeader title="Compartilhar" />
  <section class="card stack intro">
    <div class="row"><span class="tile"><Icon name="share" size={20} color="#fff" /></span><b class="grow">Compartilhe só o que quiser</b></div>
    <p class="small muted">Seu financeiro (contas, lançamentos, relatórios) continua só seu. Carro, casa e projetos e listas de compras podem ir para um <b>espaço compartilhado</b>: quem participa vê e edita junto, ao vivo. Em cada carro, projeto ou lista, escolha <b>Quem vê</b>.</p>
    <p class="small muted">Do mesmo jeito, sua esposa usa a conta dela e coloca no espaço só o que ela quiser mostrar.</p>
  </section>

  {#each organizer.shared as space (space.id)}
    {@const c = counts(space.id)}
    <SectionTitle title={space.name} />
    <div class="form-group">
      <div class="form-row"><span class="field-label">Quem participa</span><span class="field">{organizer.memberNames(space.id).join(', ')}</span></div>
      <div class="form-row"><span class="field-label">Dentro</span><span class="field muted">{c.cars} carro{c.cars === 1 ? '' : 's'} · {c.projects} projeto{c.projects === 1 ? '' : 's'} · {c.lists} lista{c.lists === 1 ? '' : 's'}</span></div>
      <div class="form-row" use:hint={['Código do espaço', 'Mande para sua esposa: na conta dela, em Perfil › Espaços compartilhados › Entrar com código. Só dá acesso a este espaço, nunca ao seu financeiro.']}>
        <span class="field-label">Código</span><span class="field num code">{space.invite_code}</span>
        <button class="btn" onclick={() => copy(space.id, space.invite_code)}><Icon name={copied === space.id ? 'check' : 'copy'} size={15} />{copied === space.id ? 'Copiado' : 'Copiar'}</button>
      </div>
      <button class="form-row plain" onclick={() => organizer.rotateCode(space.id)} use:hint={['Trocar código', 'O código antigo deixa de valer (quem já entrou continua).']}><Icon name="refresh" size={16} />Gerar código novo</button>
      {#if leaving === space.id}
        <div class="form-row"><span class="grow small neg">Sair do espaço? Você deixa de ver o que está nele (os outros continuam vendo).</span><button class="btn danger" onclick={() => organizer.leaveSpace(space.id)}>Sair</button></div>
      {:else}
        <button class="form-row plain neg" onclick={() => (leaving = space.id)}>Sair deste espaço</button>
      {/if}
    </div>
  {/each}

  <SectionTitle title={organizer.shared.length ? 'Outro espaço' : 'Começar'} />
  <div class="form-group">
    <label class="form-row"><span class="field-label">Nome</span><input class="field" bind:value={name} /></label>
    <button class="form-row plain accent" disabled={busy || !name.trim()} onclick={() => run(() => organizer.createSpace(name.trim()), 'Espaço criado. Copie o código e mande para ela.')}><Icon name="plus" size={16} />Criar espaço compartilhado</button>
  </div>
  <div class="form-group" style="margin-top: 12px">
    <label class="form-row" use:hint={['Entrar com código', 'Recebeu um código? Cole aqui para entrar no espaço de outra pessoa.']}><span class="field-label">Código recebido</span><input class="field num" placeholder="ex.: 7F3A9C21" bind:value={code} /></label>
    <button class="form-row plain accent" disabled={busy || code.trim().length < 6} onclick={() => run(() => organizer.joinSpace(code), 'Pronto: você entrou no espaço.')}><Icon name="arrow-right" size={16} />Entrar com código</button>
  </div>
  {#if message}<p class="form-footer neg">{message}</p>{/if}
  <p class="form-footer">A conta dela é separada (e-mail e senha dela). Enquanto o cadastro aberto está desligado, o acesso dela é criado em Supabase › Authentication › Add user.</p>
</div>

<style>
  .intro p { margin: 0; line-height: 1.45; }
  .tile { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; background: linear-gradient(160deg, #ff8fab, #c2466b); flex: none; }
  .plain { background: none; border: 0; width: 100%; text-align: left; gap: 10px; }
  .accent { color: var(--accent); font-weight: 600; }
  .plain:disabled { opacity: 0.45; }
  .code { letter-spacing: 0.08em; font-weight: 600; }
</style>
