<script lang="ts">
  import { organizer } from '$lib/data/organizer.svelte';
  import { fuelName, logKindIcon, logKindShort, type Fuel, type LogKind, type Vehicle, type VehicleLog } from '$lib/data/organizerTypes';
  import { centsToInput, parseCents } from '$lib/core/money';
  import { today } from '$lib/core/dates';
  import Sheet from '$lib/ui/Sheet.svelte';
  import Toggle from '$lib/ui/Toggle.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import { hint } from '$lib/ui/hint';
  import DeleteRow from '$lib/screens/organizer/DeleteRow.svelte';
  import { formatPerUnit, odometerOf } from '$lib/features/car';

  /** Registro do carro: abastecimento (litros e km para o consumo) ou qualquer outro gasto. */
  let { open = $bindable(), vehicle, log = null, kind: initialKind = 'fuel' }: { open: boolean; vehicle: Vehicle; log?: VehicleLog | null; kind?: LogKind } = $props();
  let kind = $state<LogKind>('fuel');
  let date = $state(today());
  let amount = $state('');
  let description = $state('');
  let km = $state('');
  let liters = $state('');
  let fuel = $state<Fuel>('');
  let full = $state(true);
  let vendor = $state('');
  let notes = $state('');

  $effect(() => {
    if (!open) return;
    const lastFuel = organizer.vehicle_logs.filter((l) => l.vehicle_id === vehicle.id && l.kind === 'fuel').toSorted((a, b) => b.date.localeCompare(a.date))[0];
    kind = log?.kind ?? initialKind; date = log?.date ?? today(); amount = log ? centsToInput(log.amount_cents) : ''; description = log?.description ?? '';
    km = log?.odometer ? String(log.odometer) : ''; liters = log?.liters ? String(log.liters).replace('.', ',') : '';
    fuel = log?.fuel ?? lastFuel?.fuel ?? ''; full = log?.full_tank ?? true; vendor = log?.vendor ?? (log ? '' : lastFuel?.vendor ?? ''); notes = log?.notes ?? '';
  });

  const litersValue = $derived(Number(liters.replace(',', '.')) || null);
  const cents = $derived(Math.abs(parseCents(amount) ?? 0));
  const perLiter = $derived(litersValue ? cents / 100 / litersValue : null);
  // Dois tipos de lançamento: Combustível ou Gasto (e o gasto diz o que foi).
  const expenseKinds: LogKind[] = ['insurance', 'tax', 'wash', 'service', 'parking', 'other'];
  const expenseName: Partial<Record<LogKind, string>> = { insurance: 'Seguro', tax: 'Imposto', wash: 'Lavagem', service: 'Manutenção', parking: 'Estacionamento', other: 'Outro' };
  const kinds = $derived(expenseKinds.includes(kind) || kind === 'fuel' ? expenseKinds : [...expenseKinds, kind]);
  const lastKm = $derived(odometerOf(vehicle));

  async function save() {
    const fields: Partial<VehicleLog> = {
      vehicle_id: vehicle.id, kind, date, amount_cents: cents, description: description.trim(), odometer: Number(km.replace(/\D/g, '')) || null,
      liters: kind === 'fuel' ? litersValue : null, fuel: kind === 'fuel' ? fuel : '', full_tank: kind === 'fuel' ? full : true, vendor: vendor.trim(), notes
    };
    if (log) await organizer.update('vehicle_logs', log.id, fields);
    else await organizer.insert('vehicle_logs', [fields]);
    open = false;
  }

  async function remove() {
    if (!log) return;
    await organizer.remove('vehicle_logs', [log.id]);
    open = false;
  }
</script>

<Sheet bind:open title={log ? 'Editar lançamento' : kind === 'fuel' ? 'Combustível' : 'Gasto'}>
  {#snippet actions()}<button class="btn primary" disabled={!cents && kind !== 'service'} onclick={save}>Salvar</button>{/snippet}
  <div class="mode">
    <button class:on={kind === 'fuel'} onclick={() => (kind = 'fuel')}><Icon name="fuelpump" size={17} />Combustível</button>
    <button class:on={kind !== 'fuel'} onclick={() => { if (kind === 'fuel') kind = 'service'; }}><Icon name="receipt" size={17} />Gasto</button>
  </div>
  {#if kind !== 'fuel'}
    <div class="kinds">
      {#each kinds as value (value)}
        <button class="kind" class:on={kind === value} aria-pressed={kind === value} onclick={() => (kind = value)}>
          <Icon name={logKindIcon[value]} size={18} /><span>{expenseName[value] ?? logKindShort[value]}</span></button>
      {/each}
    </div>
  {/if}
  <div class="form-group" style="margin-top: 12px">
    <label class="form-row"><span class="field-label">Data</span><input class="field" type="date" bind:value={date} /></label>
    <label class="form-row"><span class="field-label">Valor</span><input class="field num" inputmode="decimal" placeholder="0,00" bind:value={amount} /></label>
    {#if kind !== 'fuel'}<label class="form-row"><span class="field-label">Descrição</span><input class="field" placeholder={kind === 'service' ? 'ex.: troca de óleo e filtros' : 'ex.: IPVA, seguro 3x12'} bind:value={description} /></label>{/if}
    <label class="form-row" use:hint={['Km do painel', `Quilometragem no dia. ${lastKm ? `Último registro: ${lastKm.toLocaleString('pt-BR')} km.` : ''}`]}>
      <span class="field-label">Km do painel</span><input class="field num" inputmode="numeric" placeholder={kind === 'fuel' ? 'para calcular o consumo' : 'opcional'} bind:value={km} /></label>
  </div>
  {#if kind === 'fuel'}
    <div class="form-group" style="margin-top: 12px">
      <label class="form-row"><span class="field-label">Litros</span><input class="field num" inputmode="decimal" placeholder="ex.: 38,5" bind:value={liters} /></label>
      <label class="form-row"><span class="field-label">Combustível</span><select class="field" bind:value={fuel}>{#each Object.entries(fuelName) as [value, label] (value)}<option {value}>{label}</option>{/each}</select></label>
      <div class="form-row" use:hint={['Tanque cheio', 'O consumo (km/L) é medido de um tanque cheio até o próximo. Se só completou um pouco, desligue.']}>
        <span class="field-label grow">Encheu o tanque</span><Toggle label="Tanque cheio" bind:checked={full} /></div>
    </div>
    {#if perLiter}<p class="form-footer">Preço por litro: <b>{formatPerUnit(perLiter, 'L')}</b></p>{/if}
  {/if}
  <div class="form-group" style="margin-top: 12px">
    <label class="form-row"><span class="field-label">{kind === 'fuel' ? 'Posto' : 'Onde / quem fez'}</span><input class="field" placeholder="opcional" bind:value={vendor} /></label>
    <label class="form-row"><span class="field-label">Anotações</span><input class="field" placeholder="opcional" bind:value={notes} /></label>
  </div>
  {#if log}<DeleteRow label="Apagar registro" question="Apagar este registro do carro?" ondelete={remove} />{/if}
</Sheet>

<style>
  .mode { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 6px; }
  .mode button { display: flex; align-items: center; justify-content: center; gap: 8px; height: 46px; border-radius: 13px; border: 1px solid var(--stroke); background: var(--card-2); font-weight: 600; color: var(--text-2); }
  .mode button.on { color: #04140e; background: var(--accent); border-color: transparent; }
  .kinds { margin-top: 10px; display: grid; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: 8px; margin-top: 6px; }
  .kind { display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 10px 4px; border-radius: 12px; border: 1px solid var(--stroke); background: var(--card-2); font-size: 12.5px; font-weight: 600; color: var(--text-2); }
  .kind.on { color: var(--accent); border-color: var(--accent); background: var(--accent-soft); }
</style>
