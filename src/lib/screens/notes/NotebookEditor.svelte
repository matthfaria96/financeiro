<script lang="ts">
  import { organizer } from '$lib/data/organizer.svelte';
  import { store } from '$lib/data/store.svelte';
  import type { Notebook } from '$lib/data/organizerTypes';
  import Sheet from '$lib/ui/Sheet.svelte';
  import { palette } from '$lib/ui/look';
  import SpacePicker from '$lib/screens/organizer/SpacePicker.svelte';
  import DeleteRow from '$lib/screens/organizer/DeleteRow.svelte';

  /** Caderno de listas: nome, figurinha, cor e quem vê. */
  let { open = $bindable(), notebook = null, onsaved }: { open: boolean; notebook?: Notebook | null; onsaved?: (notebook: Notebook) => void } = $props();
  let name = $state('');
  let emoji = $state('📝');
  let color = $state('#2BD4A4');
  let space = $state('');
  const emojis = ['🛒', '💊', '🐾', '🏠', '🧹', '👶', '🎁', '🧰', '👕', '📚', '🌱', '🍷', '🎉', '✈️', '💄', '📝'];

  $effect(() => {
    if (!open) return;
    name = notebook?.name ?? ''; emoji = notebook?.emoji ?? '📝'; color = notebook?.color ?? '#2BD4A4'; space = notebook?.household_id ?? organizer.personalId;
  });

  async function save() {
    const fields = { name: name.trim(), emoji, color };
    let saved: Notebook;
    if (notebook) {
      await organizer.update('notebooks', notebook.id, fields);
      await organizer.move('notebooks', notebook.id, space);
      saved = organizer.notebooks.find((n) => n.id === notebook!.id)!;
    } else {
      const ambient = store.workspaceById.get(store.scopeId);
      [saved] = await organizer.insert('notebooks', [{ ...fields, sort_order: organizer.notebooks.length, workspace_id: ambient?.kind === 'business' ? ambient.id : null }], space);
      await organizer.insert('shopping_lists', [{ notebook_id: saved.id, name: saved.name, done_at: null, total_cents: null }]);
    }
    open = false;
    onsaved?.(saved);
  }
</script>

<Sheet bind:open title={notebook ? 'Editar lista' : 'Nova lista'}>
  {#snippet actions()}<button class="btn primary" disabled={!name.trim()} onclick={save}>Salvar</button>{/snippet}
  <div class="preview" style:--c={color}><span>{emoji}</span></div>
  <div class="form-group">
    <label class="form-row"><span class="field-label">Nome</span><input class="field" placeholder="ex.: Limpeza, Bebê, Festa" bind:value={name} /></label>
  </div>
  <div class="form-title">Figurinha</div>
  <div class="picks">{#each emojis as e (e)}<button class="emo" class:on={emoji === e} onclick={() => (emoji = e)} aria-label={e}>{e}</button>{/each}</div>
  <div class="picks" style="margin-top: 10px">{#each palette.slice(0, 12) as c (c)}<button class="swatch" class:on={color === c} style:background={c} aria-label="Cor" onclick={() => (color = c)}></button>{/each}</div>
  <div class="form-group" style="margin-top: 14px"><SpacePicker bind:value={space} /></div>
  {#if notebook}<DeleteRow label="Apagar esta lista e o histórico" question="Apagar a lista e todas as listas antigas dela?" ondelete={async () => { await organizer.remove('notebooks', [notebook!.id]); open = false; location.hash = '#/notas'; }} />{/if}
</Sheet>

<style>
  .preview { display: grid; place-items: center; margin: 10px auto 14px; width: 76px; height: 76px; border-radius: 22px; font-size: 38px; background: radial-gradient(circle at 30% 25%, color-mix(in srgb, var(--c) 45%, transparent), color-mix(in srgb, var(--c) 12%, transparent)); }
  .picks { display: flex; flex-wrap: wrap; gap: 8px; }
  .emo { width: 40px; height: 40px; border-radius: 11px; border: 1px solid var(--stroke); background: rgba(255, 255, 255, 0.04); font-size: 20px; }
  .emo.on { border-color: var(--accent); background: var(--accent-soft); }
  .swatch { width: 28px; height: 28px; border-radius: 50%; border: 2px solid transparent; }
  .swatch.on { border-color: #fff; }
</style>
