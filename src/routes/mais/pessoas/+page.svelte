<script lang="ts">
  import Select from '$lib/ui/Select.svelte';
  import { store } from '$lib/data/store.svelte';
  import type { Person, PersonRole } from '$lib/data/types';
  import { money } from '$lib/core/money';
  import { addMonths, monthOf, today } from '$lib/core/dates';
  import Icon from '$lib/ui/Icon.svelte';
  import Sheet from '$lib/ui/Sheet.svelte';
  import Donut from '$lib/ui/Donut.svelte';
  import Sparkline from '$lib/ui/charts/Sparkline.svelte';
  import { hint } from '$lib/ui/hint';
  import { palette, roleIcon, roleName } from '$lib/ui/look';
  import SubHeader from '$lib/screens/more/SubHeader.svelte';
  import PhotoPicker from '$lib/screens/organizer/PhotoPicker.svelte';
  import { inScope, kindOf } from '$lib/features/model';

  let open = $state(false);
  let editing = $state<Person | null>(null);
  let name = $state('');
  let role = $state<PersonRole>('other');
  let color = $state(palette[2]);
  let photo = $state('');
  function edit(person: Person | null) {
    editing = person;
    name = person?.name ?? '';
    role = person?.role ?? 'other';
    color = person?.color ?? palette[2];
    photo = person?.photo ?? '';
    open = true;
  }
  async function save() {
    if (editing) await store.update('people', editing.id, { name: name.trim(), role, color, photo });
    else await store.insert('people', [{ key: '', name: name.trim(), role, color, photo, sort_order: store.people.length }]);
    open = false;
  }
  const people = $derived(store.people.toSorted((a, b) => a.sort_order - b.sort_order));
  const months = Array.from({ length: 6 }, (_, i) => addMonths(monthOf(today()), i - 5));
  // Gasto de cada pessoa nos últimos 6 meses (pela data da compra).
  const spend = $derived.by(() => {
    const map = new Map<string, number[]>();
    for (const e of store.entries) {
      if (e.is_mirror || !e.person_id || !inScope(e) || kindOf(e) !== 'expense') continue;
      const at = months.indexOf(monthOf(e.date));
      if (at < 0) continue;
      const row = map.get(e.person_id) ?? months.map(() => 0);
      row[at] -= e.amount_cents;
      map.set(e.person_id, row);
    }
    return map;
  });
  const slices = $derived(people.map((p) => ({ id: p.id, label: p.name, color: p.color, value: spend.get(p.id)?.[5] ?? 0 })).filter((s) => s.value > 0));
</script>

<div class="page">
  <SubHeader title="Pessoas" back="#/transacoes/configurar"><button class="btn primary" onclick={() => edit(null)}><Icon name="plus" size={16} /><span class="hide-m">Nova pessoa</span></button></SubHeader>
  <div class="layout">
    <div class="people">
      {#each people as person (person.id)}
        {@const values = spend.get(person.id) ?? months.map(() => 0)}
        <button class="card person" style:--c={person.color} onclick={() => edit(person)} use:hint={[person.name, 'Toque para mudar nome, foto, papel e cor.']}>
          <span class="photo">{#if person.photo}<img src={person.photo} alt="" />{:else}<Icon name={roleIcon[person.role]} size={30} stroke={1.8} />{/if}</span>
          <b>{person.name}</b><span class="caption">{roleName[person.role]}</span>
          <div class="row between month"><div><span class="caption">Este mês</span><div class="num">{money(values[5], { cents: false })}</div></div><Sparkline {values} width={90} height={30} color={person.color} /></div>
        </button>
      {/each}
    </div>
    {#if slices.length}
      <section class="card side"><div class="card-head"><h3>Gasto deste mês</h3><span class="sub">por pessoa</span></div>
        <div class="center"><Donut size={190} {slices} center={money(slices.reduce((s, x) => s + x.value, 0), { cents: false })} caption="Total" /></div>
        <div class="stack-sm">{#each slices as s (s.id)}<div class="row between small"><span class="row" style="gap: 7px"><i style:background={s.color}></i>{s.label}</span><span class="num">{money(s.value, { cents: false })}</span></div>{/each}</div>
      </section>
    {/if}
  </div>
  <p class="form-footer">Cada lançamento pode ter um dono. Nos relatórios, use "Por pessoa" para ver quanto é seu, da casa, da esposa ou do filho. Dica: defina de quem é cada conta e tudo importado nela já vem marcado.</p>
</div>

<Sheet bind:open title={editing ? 'Pessoa' : 'Nova pessoa'}>
  {#snippet actions()}<button class="btn primary" disabled={!name.trim()} onclick={save}>Salvar</button>{/snippet}
  <div class="pick"><PhotoPicker bind:value={photo} label="Foto" maxPixel={240} maxChars={40_000} wide={false} icon={roleIcon[role]} /></div>
  <div class="form-group" style="margin-top: 10px">
    <label class="form-row"><span class="field-label">Nome</span><input class="field" bind:value={name} /></label>
    <label class="form-row"><span class="field-label">Papel</span><span class="field"><Select bind:value={role} label="Papel" options={Object.entries(roleName).map(([value, label]) => ({ value: value as PersonRole, label }))} /></span></label>
    <div class="form-row" style="flex-wrap: wrap; gap: 10px">{#each palette as c}<button class="swatch" class:on={c === color} style:background={c} aria-label="Cor" onclick={() => (color = c)}></button>{/each}</div>
  </div>
  {#if editing}
    <button class="btn danger" style="margin-top: 16px" onclick={async () => { await store.remove('people', [editing!.id]); open = false; }}>Apagar pessoa (os lançamentos ficam sem dono)</button>
  {/if}
</Sheet>

<style>
  .layout { display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr); align-items: start; }
  @media (min-width: 1100px) { .layout { grid-template-columns: minmax(0, 1fr) 340px; } }
  .people { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
  .person { display: flex; flex-direction: column; align-items: center; gap: 3px; text-align: center; padding: 20px 16px 14px; }
  .person:hover { border-color: var(--stroke-strong); transform: translateY(-2px); }
  .photo { width: 76px; height: 76px; border-radius: 50%; overflow: hidden; display: grid; place-items: center; margin-bottom: 8px; color: var(--c);
    background: radial-gradient(circle at 30% 25%, color-mix(in srgb, var(--c) 40%, transparent), color-mix(in srgb, var(--c) 10%, transparent)); box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 35%, transparent), 0 10px 26px rgba(0, 0, 0, 0.3); }
  .photo img { width: 100%; height: 100%; object-fit: cover; }
  .month { width: 100%; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--stroke); text-align: left; flex-wrap: wrap; gap: 6px; }
  .month .num { white-space: nowrap; font-weight: 600; }
  @media (max-width: 600px) { .month :global(svg) { display: none; } }
  .side { display: flex; flex-direction: column; gap: 14px; }
  .center { display: grid; place-items: center; }
  i { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
  .pick { display: grid; place-items: center; padding-top: 8px; }
  .swatch { width: 26px; height: 26px; border-radius: 50%; border: 0; }
  .swatch.on { box-shadow: 0 0 0 2px #121916, 0 0 0 4px #fff; }
</style>
