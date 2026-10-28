<script lang="ts">
  import Icon from '$lib/ui/Icon.svelte';
  import { hint } from '$lib/ui/hint';
  import { compressImage, kilobytes } from '$lib/features/logos';
  import { store } from '$lib/data/store.svelte';

  /** Foto: escolhe (ou tira, no celular), comprime no navegador e devolve como data URL leve. */
  let { value = $bindable(), maxPixel = 720, maxChars = 120_000, label = 'Foto', icon = 'image', wide = true }: { value: string; maxPixel?: number; maxChars?: number; label?: string; icon?: string; wide?: boolean } = $props();
  let busy = $state(false);
  let input = $state<HTMLInputElement>();

  async function pick(event: Event) {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    busy = true;
    try {
      value = await compressImage(file, maxPixel, maxChars);
      store.toast(`Foto comprimida: ${kilobytes(Math.round(value.length * 0.75))}.`, 'info');
    } catch {
      store.toast('Não consegui abrir esta imagem. Tente JPG, PNG ou HEIC convertido.', 'error');
    } finally {
      busy = false;
      if (input) input.value = '';
    }
  }
</script>

<div class="photo" class:wide>
  <button class="frame" onclick={() => input?.click()} disabled={busy} use:hint={[label, 'Escolha uma foto. Ela é reduzida e comprimida no aparelho antes de salvar.']}>
    {#if value}<img src={value} alt="" />{:else}<span class="empty"><Icon name={icon} size={26} /><span class="small">{busy ? 'Comprimindo…' : `Adicionar ${label.toLowerCase()}`}</span></span>{/if}
  </button>
  {#if value}
    <div class="row actions"><button class="btn" onclick={() => input?.click()}><Icon name="image" size={15} />Trocar</button><button class="btn danger" onclick={() => (value = '')}><Icon name="trash" size={15} />Remover</button></div>
  {/if}
  <input bind:this={input} type="file" accept="image/*" hidden onchange={pick} />
</div>

<style>
  .photo { display: flex; flex-direction: column; gap: 8px; align-items: center; }
  .frame { width: 132px; aspect-ratio: 1; border-radius: 18px; overflow: hidden; border: 1px dashed var(--stroke-strong); background: rgba(255, 255, 255, 0.04); padding: 0; display: grid; place-items: center; }
  .wide .frame { width: 100%; aspect-ratio: 16 / 7; }
  .frame img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .empty { display: flex; flex-direction: column; align-items: center; gap: 6px; color: var(--text-2); }
  .actions { gap: 8px; }
</style>
