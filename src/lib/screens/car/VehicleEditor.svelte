<script lang="ts">
  import { goto } from '$app/navigation';
  import { organizer } from '$lib/data/organizer.svelte';
  import type { Vehicle } from '$lib/data/organizerTypes';
  import { centsToInput, parseCents } from '$lib/core/money';
  import { defaultMaintenancePlan } from '$lib/core/vehicle';
  import Sheet from '$lib/ui/Sheet.svelte';
  import Toggle from '$lib/ui/Toggle.svelte';
  import { hint } from '$lib/ui/hint';
  import SpacePicker from '$lib/screens/organizer/SpacePicker.svelte';
  import DeleteRow from '$lib/screens/organizer/DeleteRow.svelte';
  import PhotoPicker from '$lib/screens/organizer/PhotoPicker.svelte';

  /** Cadastro do carro: nome, modelo, placa, valor, km e quem vê. */
  let { open = $bindable(), vehicle = null, onsaved }: { open: boolean; vehicle?: Vehicle | null; onsaved?: (vehicle: Vehicle) => void } = $props();
  let name = $state('');
  let model = $state('');
  let plate = $state('');
  let year = $state('');
  let value = $state('');
  let km = $state('');
  let notes = $state('');
  let space = $state('');
  let withPlan = $state(true);
  let photo = $state('');

  $effect(() => {
    if (!open) return;
    name = vehicle?.name ?? ''; model = vehicle?.model ?? ''; plate = vehicle?.plate ?? ''; year = vehicle?.year ?? '';
    value = vehicle?.value_cents ? centsToInput(vehicle.value_cents) : ''; km = vehicle?.odometer ? String(vehicle.odometer) : '';
    notes = vehicle?.notes ?? ''; photo = vehicle?.photo ?? ''; space = vehicle?.household_id ?? organizer.personalId; withPlan = true;
  });

  async function save() {
    const odometer = Number(km.replace(/\D/g, '')) || null;
    const fields: Partial<Vehicle> = { name: name.trim(), model: model.trim(), plate: plate.trim().toUpperCase(), year: year.trim(), value_cents: parseCents(value), odometer, notes, photo };
    let saved: Vehicle;
    if (vehicle) {
      await organizer.update('vehicles', vehicle.id, fields);
      await organizer.move('vehicles', vehicle.id, space);
      saved = organizer.vehicles.find((v) => v.id === vehicle!.id)!;
    } else {
      [saved] = await organizer.insert('vehicles', [{ ...fields, archived: false, sort_order: organizer.vehicles.length }], space);
      if (withPlan) await organizer.insert('maintenance_items', defaultMaintenancePlan.map((item, index) => ({ ...item, vehicle_id: saved.id, last_km: null, last_date: null, sort_order: index })));
    }
    open = false;
    onsaved?.(saved);
  }

  async function remove() {
    if (!vehicle) return;
    await organizer.remove('vehicles', [vehicle.id]);
    open = false;
    goto('#/mais/carro');
  }
</script>

<Sheet bind:open title={vehicle ? 'Editar carro' : 'Cadastrar carro'}>
  {#snippet actions()}<button class="btn primary" disabled={!name.trim()} onclick={save}>Salvar</button>{/snippet}
  <div style="margin-top: 10px"><PhotoPicker bind:value={photo} label="Foto do carro" icon="car" /></div>
  <div class="form-group" style="margin-top: 12px">
    <label class="form-row"><span class="field-label">Nome</span><input class="field" placeholder="ex.: HB20, Carro da família" bind:value={name} /></label>
    <label class="form-row"><span class="field-label">Modelo</span><input class="field" placeholder="ex.: 1.6 Flex automático" bind:value={model} /></label>
    <label class="form-row"><span class="field-label">Placa</span><input class="field" placeholder="opcional" bind:value={plate} /></label>
    <label class="form-row"><span class="field-label">Ano</span><input class="field" inputmode="numeric" placeholder="opcional" bind:value={year} /></label>
  </div>
  <div class="form-group" style="margin-top: 12px">
    <label class="form-row" use:hint={['Valor do carro', 'Quanto o carro vale (tabela FIPE ou o que pagou). Só para referência.']}><span class="field-label">Valor</span><input class="field num" inputmode="decimal" placeholder="opcional" bind:value={value} /></label>
    <label class="form-row" use:hint={['Quilometragem', 'Km do painel hoje. Depois o app usa o maior km dos abastecimentos e serviços.']}><span class="field-label">Km de hoje</span><input class="field num" inputmode="numeric" placeholder="ex.: 94350" bind:value={km} /></label>
    <label class="form-row"><span class="field-label">Anotações</span><input class="field" placeholder="opcional" bind:value={notes} /></label>
  </div>
  <div class="form-group" style="margin-top: 12px"><SpacePicker bind:value={space} /></div>
  {#if !vehicle}
    <div class="form-group" style="margin-top: 12px">
      <div class="form-row" use:hint={['Plano de revisões', 'Óleo, pneus, freios, bateria, correia… com intervalos comuns. Você ajusta pelo manual depois.']}>
        <span class="field-label grow">Começar com o plano de revisões comum</span><Toggle label="Plano de revisões" bind:checked={withPlan} /></div>
    </div>
  {:else}
    <DeleteRow label="Apagar carro e todo o histórico" question="Apagar o carro com abastecimentos, gastos e revisões?" ondelete={remove} />
  {/if}
</Sheet>
