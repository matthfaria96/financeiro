<script lang="ts">
  import { organizer } from '$lib/data/organizer.svelte';
  import type { ShoppingList } from '$lib/data/organizerTypes';
  import { parseCents } from '$lib/core/money';
  import Sheet from '$lib/ui/Sheet.svelte';
  import Toggle from '$lib/ui/Toggle.svelte';
  import { hint } from '$lib/ui/hint';
  import { duplicateList, finishList } from '$lib/features/shopping';

  /** Terminar a compra: anota o total (opcional) e já cria a próxima lista com os mesmos itens. */
  let { open = $bindable(), list }: { open: boolean; list: ShoppingList } = $props();
  let total = $state('');
  let duplicate = $state(true);
  let keep = $state(true);

  $effect(() => {
    if (open) { total = ''; duplicate = true; keep = true; }
  });

  async function finish() {
    const cents = total.trim() ? Math.abs(parseCents(total) ?? 0) : null;
    await finishList(list, cents);
    const next = duplicate ? await duplicateList(list) : null;
    if (!keep) await organizer.remove('shopping_lists', [list.id]);
    open = false;
    location.hash = next ? `#/mais/compras/${next.id}` : '#/mais/compras';
  }
</script>

<Sheet bind:open title="Finalizar compra">
  {#snippet actions()}<button class="btn primary" onclick={finish}>Finalizar</button>{/snippet}
  <div class="form-group" style="margin-top: 10px">
    <label class="form-row" use:hint={['Quanto deu', 'Opcional: fica anotado na lista.']}><span class="field-label">Quanto deu</span><input class="field num" inputmode="decimal" placeholder="opcional" bind:value={total} /></label>
  </div>
  <div class="form-group" style="margin-top: 12px">
    <div class="form-row" use:hint={['Próxima lista', 'Cria uma lista nova com os mesmos itens, desmarcados. Ela aparece no topo.']}><span class="field-label grow">Criar a próxima com os mesmos itens</span><Toggle label="Duplicar" bind:checked={duplicate} /></div>
    <div class="form-row" use:hint={['Guardar', 'Desligado, esta lista é apagada depois de finalizar.']}><span class="field-label grow">Guardar esta lista no histórico</span><Toggle label="Guardar" bind:checked={keep} /></div>
  </div>
</Sheet>
