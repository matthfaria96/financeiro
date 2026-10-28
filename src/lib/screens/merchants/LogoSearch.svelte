<script lang="ts">
  import Sheet from '$lib/ui/Sheet.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import { hint } from '$lib/ui/hint';
  import { domainGuesses, findLogos, hostOf, type LogoOption } from '$lib/features/logos';

  /** Buscar o logo de uma empresa pelo site (ou nome) e escolher entre as opções. */
  let { open = $bindable(), initial, onpick }: { open: boolean; initial: string; onpick: (url: string, domain: string) => void } = $props();
  let query = $state('');
  let options = $state<LogoOption[]>([]);
  let searching = $state(false);
  let message = $state('');
  let used = $state('');
  let link = $state('');

  $effect(() => {
    if (open) {
      query = initial;
      options = [];
      message = '';
      if (initial) search();
    }
  });

  async function search() {
    const domains = domainGuesses(query);
    if (!domains.length) return;
    searching = true;
    message = '';
    options = [];
    for (const domain of domains) {
      const found = await findLogos(domain);
      if (found.length) {
        options = found;
        used = domain;
        if (found.some((o) => o.pixels >= 96)) break;
      }
    }
    searching = false;
    if (!options.length) message = `Nada encontrado para ${domains.join(' ou ')}. Confira a internet ou digite o endereço exato do site.`;
    else if (!options.some((o) => o.pixels >= 96)) message = 'Só achei ícones pequenos (podem ficar borrados). Tente o endereço exato do site ou cole o link de uma imagem.';
  }

  function pick(url: string) {
    onpick(url, hostOf(query) ?? used);
    open = false;
  }
</script>

<Sheet bind:open title="Buscar logo">
  <div class="stack" style="padding-top: 10px">
    <form class="row" onsubmit={(e) => { e.preventDefault(); search(); }}>
      <input class="input grow" placeholder="Site ou nome (ex.: ifood.com.br)" autocapitalize="off" bind:value={query} />
      <button class="btn primary" disabled={searching || !query.trim()}>{searching ? '…' : 'Buscar'}</button>
    </form>
    <p class="caption" style="margin: -4px 4px 0">Melhor com o endereço do site. Só o endereço é enviado para a busca; nada dos seus lançamentos sai do aparelho.</p>
    {#if message}<p class="small muted row" style="gap: 6px"><Icon name="info" size={15} />{message}</p>{/if}
    {#if options.length}
      <div class="grid">
        {#each options as option (option.url)}
          <button class="tile" onclick={() => pick(option.url)} use:hint={[`${option.pixels} px · ${option.source}`, 'Usa este logo como avatar.']}>
            <span class="img"><img src={option.url} alt="" referrerpolicy="no-referrer" /></span>
            <b class:warn={option.pixels < 96}>{option.pixels} px</b>
            <span class="caption">{option.source}{option.source === 'icon.horse' ? ' ⚠︎' : ''}</span>
          </button>
        {/each}
      </div>
      <p class="caption">⚠︎ pode ser só uma letra genérica, quando o serviço não conhece o site.</p>
    {/if}
    <div class="form-group">
      <div class="form-row"><input class="field" style="text-align: left" placeholder="Ou cole o link de uma imagem" autocapitalize="off" bind:value={link} />
        <button class="btn" disabled={!/^https?:\/\//.test(link.trim())} onclick={() => pick(link.trim())}>Usar</button></div>
    </div>
    <p class="caption">O logo é guardado como link (não ocupa espaço no banco); o navegador guarda uma cópia em cache.</p>
  </div>
</Sheet>

<style>
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 12px; }
  .tile { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px; border-radius: 16px; border: 1px solid var(--stroke); background: var(--card); }
  .tile:hover { border-color: var(--accent); }
  .img { width: 72px; height: 72px; border-radius: 50%; background: #fff; display: grid; place-items: center; overflow: hidden; }
  .img img { width: 70%; height: 70%; object-fit: contain; }
</style>
