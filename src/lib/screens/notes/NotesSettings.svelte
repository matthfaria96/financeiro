<script lang="ts">
  import Sheet from '$lib/ui/Sheet.svelte';
  import Toggle from '$lib/ui/Toggle.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import { allNoteCards, hiddenNotes, moveNote, setNoteVisible } from '$lib/features/notes';

  /** Configurar Notas: o que aparece e em que ordem (vale para a casa toda). */
  let { open = $bindable() }: { open: boolean } = $props();
  const cards = $derived(allNoteCards());
  const hidden = $derived(hiddenNotes());
</script>

<Sheet bind:open title="Configurar Notas">
  <p class="muted small intro">Desligue o que não usa e mude a ordem com as setas. Desligar não apaga nada.</p>
  <div class="form-group">
    {#each cards as card, index (card.key)}
      <div class="form-row" class:off={hidden.includes(card.key)}>
        <span class="emoji">{card.emoji}</span>
        <span class="grow">{card.name}</span>
        <button class="icon-btn mini" aria-label="Subir {card.name}" disabled={index === 0} onclick={() => moveNote(card.key, -1)}><Icon name="chevron-up" size={15} /></button>
        <button class="icon-btn mini" aria-label="Descer {card.name}" disabled={index === cards.length - 1} onclick={() => moveNote(card.key, 1)}><Icon name="chevron-down" size={15} /></button>
        <Toggle label="Mostrar {card.name}" checked={!hidden.includes(card.key)} onchange={(v) => setNoteVisible(card.key, v)} />
      </div>
    {/each}
  </div>
  <a class="general" href="#/mais" onclick={() => (open = false)}>Configurações gerais</a>
</Sheet>

<style>
  .intro { margin: 12px 4px; }
  .emoji { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; font-size: 18px; background: rgba(255, 255, 255, 0.05); flex: none; }
  .off .grow, .off .emoji { opacity: 0.4; }
  .mini { width: 30px; height: 30px; }
  .mini:disabled { opacity: 0.25; }
  .general { display: block; text-align: center; margin-top: 22px; font-size: 12px; color: var(--text-3); }
</style>
