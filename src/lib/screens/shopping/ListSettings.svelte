<script lang="ts">
  import { organizer } from '$lib/data/organizer.svelte';
  import type { ShoppingList } from '$lib/data/organizerTypes';
  import { centsToInput, parseCents } from '$lib/core/money';
  import Sheet from '$lib/ui/Sheet.svelte';
  import { hint } from '$lib/ui/hint';
  import SpacePicker from '$lib/screens/organizer/SpacePicker.svelte';
  import DeleteRow from '$lib/screens/organizer/DeleteRow.svelte';

  /** Nome, total gasto, quem vê e apagar a lista. */
  let { open = $bindable(), list }: { open: boolean; list: ShoppingList } = $props();
  let name = $state('');
  let total = $state('');
  let space = $state('');

  $effect(() => {
    if (!open) return;
    name = list.name; total = list.total_cents ? centsToInput(list.total_cents) : ''; space = list.household_id;
  });

  async function save() {
    await organizer.update('shopping_lists', list.id, { name: name.trim() || list.name, total_cents: total.trim() ? Math.abs(parseCents(total) ?? 0) : null });
    await organizer.move('shopping_lists', list.id, space);
    open = false;
  }
</script>

<Sheet bind:open title="Lista">
  {#snippet actions()}<button class="btn primary" onclick={save}>Salvar</button>{/snippet}
  <div class="form-group" style="margin-top: 10px">
    <label class="form-row"><span class="field-label">Nome</span><input class="field" bind:value={name} /></label>
    <label class="form-row" use:hint={['Quanto deu', 'Opcional: o total da compra, para lembrar quanto gastou.']}><span class="field-label">Quanto deu</span><input class="field num" inputmode="decimal" placeholder="opcional" bind:value={total} /></label>
  </div>
  <div class="form-group" style="margin-top: 12px"><SpacePicker bind:value={space} /></div>
  <DeleteRow label="Apagar lista" question="Apagar esta lista e os itens?" ondelete={async () => { await organizer.remove('shopping_lists', [list.id]); open = false; location.hash = '#/mais/compras'; }} />
</Sheet>
