<script lang="ts">
  import { organizer } from '$lib/data/organizer.svelte';
  import type { Project, ProjectItem } from '$lib/data/organizerTypes';
  import { centsToInput, parseCents } from '$lib/core/money';
  import { today } from '$lib/core/dates';
  import Sheet from '$lib/ui/Sheet.svelte';
  import Segmented from '$lib/ui/Segmented.svelte';
  import Toggle from '$lib/ui/Toggle.svelte';
  import { hint } from '$lib/ui/hint';
  import DeleteRow from '$lib/screens/organizer/DeleteRow.svelte';
  import PhotoPicker from '$lib/screens/organizer/PhotoPicker.svelte';
  import { itemsOf, priorityColor } from '$lib/features/projects';

  /** Item de projeto: produto ou serviço, cômodo, valor, prioridade e, quando feito, data e quem fez. */
  let { open = $bindable(), project, item = null }: { open: boolean; project: Project; item?: ProjectItem | null } = $props();
  let description = $state('');
  let kind = $state<ProjectItem['kind']>('product');
  let area = $state('');
  let amount = $state('');
  let priority = $state(3);
  let done = $state(false);
  let date = $state('');
  let vendor = $state('');
  let link = $state('');
  let notes = $state('');
  let photo = $state('');

  $effect(() => {
    if (!open) return;
    description = item?.description ?? ''; kind = item?.kind ?? 'product'; area = item?.area ?? ''; amount = item?.amount_cents != null ? centsToInput(item.amount_cents) : '';
    priority = item?.priority ?? 3; done = item?.done ?? false; date = item?.date ?? ''; vendor = item?.vendor ?? ''; link = item?.link ?? ''; notes = item?.notes ?? ''; photo = item?.photo ?? '';
  });

  const areas = $derived([...new Set(itemsOf(project).map((i) => i.area.trim()).filter(Boolean))].sort());
  // Só links de página (http/https); "amazon.com.br/…" ganha o https:// na frente.
  const safeLink = $derived.by(() => {
    const text = link.trim();
    if (/^https?:\/\/\S+$/i.test(text)) return text;
    return /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(text) ? `https://${text}` : '';
  });

  async function save() {
    const fields: Partial<ProjectItem> = {
      project_id: project.id, description: description.trim(), kind, area: area.trim(), amount_cents: amount.trim() ? Math.abs(parseCents(amount) ?? 0) : null,
      priority, done, date: date || (done ? today() : null), vendor: vendor.trim(), link: safeLink, notes: notes.trim(), photo
    };
    if (item) await organizer.update('project_items', item.id, fields);
    else await organizer.insert('project_items', [fields]);
    open = false;
  }
</script>

<Sheet bind:open title={item ? 'Editar item' : 'Novo item'}>
  {#snippet actions()}<button class="btn primary" disabled={!description.trim()} onclick={save}>Salvar</button>{/snippet}
  <div class="top">
    <PhotoPicker bind:value={photo} label="Foto" maxPixel={360} maxChars={50_000} wide={false} icon={kind === 'service' ? 'hammer' : 'shippingbox'} />
  </div>
  <div style="margin-top: 6px"><Segmented label="Tipo" bind:value={kind} options={[{ value: 'product', label: 'Produto' }, { value: 'service', label: 'Serviço' }]} /></div>
  <div class="form-group" style="margin-top: 10px">
    <label class="form-row"><span class="field-label">O quê</span><input class="field" placeholder="ex.: Piso vinílico da sala" bind:value={description} /></label>
    <label class="form-row" use:hint={['Cômodo ou área', 'Banheiro, Cozinha, Sala… Agrupa os gastos do projeto.']}><span class="field-label">Cômodo / área</span><input class="field" list="areas-{project.id}" placeholder="opcional" bind:value={area} /></label>
    <label class="form-row"><span class="field-label">{done ? 'Valor pago' : 'Valor estimado'}</span><input class="field num" inputmode="decimal" placeholder="opcional" bind:value={amount} /></label>
  </div>
  <datalist id="areas-{project.id}">{#each areas as a (a)}<option value={a}></option>{/each}</datalist>
  {#if !done}
    <div class="form-title">Prioridade</div>
    <div class="prio" role="radiogroup" aria-label="Prioridade">
      {#each [1, 2, 3, 4, 5] as p (p)}<button role="radio" aria-checked={priority === p} class:on={priority === p} style:--c={priorityColor[p]} onclick={() => (priority = p)} use:hint={[`Prioridade ${p}`, '1 = fazer primeiro, 5 = um dia.']}>{p}</button>{/each}
    </div>
  {/if}
  <div class="form-group" style="margin-top: 12px">
    <div class="form-row" use:hint={['Feito', 'Comprado ou serviço concluído: sai de "Planejado" e entra em "Feito".']}><span class="field-label grow">Já foi comprado / feito</span><Toggle label="Feito" bind:checked={done} /></div>
    {#if done}<label class="form-row"><span class="field-label">Quando</span><input class="field" type="date" bind:value={date} /></label>{/if}
    <label class="form-row"><span class="field-label">Loja / quem fez</span><input class="field" placeholder="opcional" bind:value={vendor} /></label>
    <label class="form-row"><span class="field-label">Link</span><input class="field" type="url" placeholder="https://…" bind:value={link} /></label>
    <label class="form-row"><span class="field-label">Observações</span><input class="field" placeholder="ex.: 12x, pago à vista" bind:value={notes} /></label>
  </div>
  {#if item}<DeleteRow label="Apagar item" question="Apagar este item?" ondelete={async () => { await organizer.remove('project_items', [item!.id]); open = false; }} />{/if}
</Sheet>

<style>
  .top { display: grid; place-items: center; padding: 6px 0 4px; }
  .prio { display: flex; gap: 8px; }
  .prio button { flex: 1; height: 40px; border-radius: 11px; border: 1px solid var(--stroke); background: var(--card-2); font-weight: 700; color: var(--c); }
  .prio button.on { background: color-mix(in srgb, var(--c) 22%, transparent); border-color: var(--c); }
</style>
