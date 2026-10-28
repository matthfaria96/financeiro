<script lang="ts">
  import { organizer } from '$lib/data/organizer.svelte';
  import type { MaintenanceItem, Vehicle } from '$lib/data/organizerTypes';
  import Sheet from '$lib/ui/Sheet.svelte';
  import { hint } from '$lib/ui/hint';
  import DeleteRow from '$lib/screens/organizer/DeleteRow.svelte';

  /** Item do plano de revisões: de quanto em quanto tempo/km e quando foi feito por último. */
  let { open = $bindable(), vehicle, item = null }: { open: boolean; vehicle: Vehicle; item?: MaintenanceItem | null } = $props();
  let name = $state('');
  let description = $state('');
  let everyKm = $state('');
  let everyMonths = $state('');
  let lastKm = $state('');
  let lastDate = $state('');

  $effect(() => {
    if (!open) return;
    name = item?.name ?? ''; description = item?.description ?? ''; everyKm = item?.every_km ? String(item.every_km) : '';
    everyMonths = item?.every_months ? String(item.every_months) : ''; lastKm = item?.last_km ? String(item.last_km) : ''; lastDate = item?.last_date ?? '';
  });

  const number = (text: string) => Number(text.replace(/\D/g, '')) || null;

  async function save() {
    const fields: Partial<MaintenanceItem> = { vehicle_id: vehicle.id, name: name.trim(), description: description.trim(), every_km: number(everyKm), every_months: number(everyMonths), last_km: number(lastKm), last_date: lastDate || null };
    if (item) await organizer.update('maintenance_items', item.id, fields);
    else await organizer.insert('maintenance_items', [{ ...fields, sort_order: organizer.maintenance_items.length }]);
    open = false;
  }
</script>

<Sheet bind:open title={item ? 'Revisão' : 'Nova revisão'}>
  {#snippet actions()}<button class="btn primary" disabled={!name.trim()} onclick={save}>Salvar</button>{/snippet}
  <div class="form-group" style="margin-top: 10px">
    <label class="form-row"><span class="field-label">Nome</span><input class="field" placeholder="ex.: Troca de óleo" bind:value={name} /></label>
    <label class="form-row"><span class="field-label">Detalhes</span><input class="field" placeholder="opcional" bind:value={description} /></label>
  </div>
  <div class="form-title">De quanto em quanto</div>
  <div class="form-group">
    <label class="form-row"><span class="field-label">A cada</span><input class="field num" inputmode="numeric" placeholder="ex.: 10000" bind:value={everyKm} /><span class="muted">km</span></label>
    <label class="form-row"><span class="field-label">Ou a cada</span><input class="field num" inputmode="numeric" placeholder="ex.: 12" bind:value={everyMonths} /><span class="muted">meses</span></label>
  </div>
  <p class="form-footer">Vale o que chegar primeiro. O app avisa faltando 1.000 km ou 30 dias.</p>
  <div class="form-title">Última vez</div>
  <div class="form-group">
    <label class="form-row" use:hint={['Km da última vez', 'Km do painel quando foi feito.']}><span class="field-label">Km</span><input class="field num" inputmode="numeric" placeholder="opcional" bind:value={lastKm} /></label>
    <label class="form-row"><span class="field-label">Data</span><input class="field" type="date" bind:value={lastDate} /></label>
  </div>
  {#if item}<DeleteRow label="Tirar do plano" question="Tirar esta revisão do plano?" ondelete={async () => { await organizer.remove('maintenance_items', [item!.id]); open = false; }} />{/if}
</Sheet>
