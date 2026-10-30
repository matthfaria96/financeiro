<script lang="ts">
  import SubHeader from '$lib/screens/more/SubHeader.svelte';
  import NoteIcon from '$lib/ui/NoteIcon.svelte';
  import Toggle from '$lib/ui/Toggle.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import { slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { store } from '$lib/data/store.svelte';
  import { allNoteCards, deleteNotebook, hiddenNotes, isSystemCard, moveNote, setNoteVisible } from '$lib/features/notes';

  /** Configurar Notas: o que aparece, em que ordem e apagar as listas criadas por você (as do app ficam). */
  const cards = $derived(allNoteCards());
  const hidden = $derived(hiddenNotes());
  let confirming = $state<string | null>(null);
  let busy = $state(false);
  async function remove(id: string, name: string) {
    busy = true;
    try {
      await deleteNotebook(id);
      store.toast(`"${name}" apagada.`);
      confirming = null;
    } finally {
      busy = false;
    }
  }
</script>

<div class="page narrow">
  <SubHeader title="Configurar Notas" back="#/notas" />
  <p class="muted small intro">Desligue o que não usa e mude a ordem com as setas. Desligar não apaga nada. As notas que você criou podem ser apagadas na lixeira.</p>
  <div class="form-group">
    {#each cards as card, index (card.key)}
      <div class="item">
      <div class="form-row" class:off={hidden.includes(card.key)}>
        <span class="emoji"><NoteIcon emoji={card.emoji} color={card.color} size={32} /></span>
        <span class="grow">{card.name}{#if isSystemCard(card)}<span class="caption block">Do app</span>{/if}</span>
        {#if !isSystemCard(card)}<button class="icon-btn mini trash" class:on={confirming === card.key} aria-label="Apagar {card.name}" onclick={() => (confirming = confirming === card.key ? null : card.key)}><Icon name="trash" size={14} /></button>{/if}
        <button class="icon-btn mini" aria-label="Subir {card.name}" disabled={index === 0} onclick={() => moveNote(card.key, -1)}><Icon name="chevron-up" size={15} /></button>
        <button class="icon-btn mini" aria-label="Descer {card.name}" disabled={index === cards.length - 1} onclick={() => moveNote(card.key, 1)}><Icon name="chevron-down" size={15} /></button>
        <Toggle label="Mostrar {card.name}" checked={!hidden.includes(card.key)} onchange={(v) => setNoteVisible(card.key, v)} />
      </div>
      {#if confirming === card.key && card.notebookId}
        <div class="confirm" transition:slide={{ duration: 260, easing: cubicOut }}>
          <span class="grow small">Apagar <b>{card.name}</b> e todo o histórico dela? Não dá para desfazer.</span>
          <button class="btn" onclick={() => (confirming = null)}>Cancelar</button>
          <button class="btn danger-fill" disabled={busy} onclick={() => remove(card.notebookId!, card.name)}>Apagar</button>
        </div>
      {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .intro { margin: 12px 4px; }
  .emoji { display: grid; flex: none; }
  .off .grow, .off .emoji { opacity: 0.4; }
  .mini { width: 30px; height: 30px; }
  .mini:disabled { opacity: 0.25; }
  .block { display: block; }
  .trash { color: var(--text-3); }
  .trash:hover, .trash.on { color: var(--negative); border-color: rgba(255, 107, 91, 0.4); background: rgba(255, 107, 91, 0.1); }
  .confirm { display: flex; align-items: center; gap: 8px; padding: 10px 16px 12px; background: rgba(255, 107, 91, 0.07); border-top: 1px solid rgba(255, 107, 91, 0.2); }
  .confirm .btn { height: 34px; padding: 0 12px; font-size: 13.5px; }
  .danger-fill { background: var(--negative); color: #fff; border-color: transparent; }
  .danger-fill:hover { background: #ff8273; }
  @media (max-width: 520px) { .confirm { flex-wrap: wrap; } .confirm .grow { flex-basis: 100%; } }
</style>
