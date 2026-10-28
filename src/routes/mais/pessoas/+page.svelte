<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import type { Person, PersonRole } from '$lib/data/types';
  import Icon from '$lib/ui/Icon.svelte';
  import CategoryIcon from '$lib/ui/CategoryIcon.svelte';
  import Sheet from '$lib/ui/Sheet.svelte';
  import { palette, roleIcon, roleName } from '$lib/ui/look';
  import SubHeader from '$lib/screens/more/SubHeader.svelte';

  let open = $state(false);
  let editing = $state<Person | null>(null);
  let name = $state('');
  let role = $state<PersonRole>('other');
  let color = $state(palette[2]);
  function edit(person: Person | null) {
    editing = person;
    name = person?.name ?? '';
    role = person?.role ?? 'other';
    color = person?.color ?? palette[2];
    open = true;
  }
  async function save() {
    if (editing) await store.update('people', editing.id, { name: name.trim(), role, color });
    else await store.insert('people', [{ key: '', name: name.trim(), role, color, sort_order: store.people.length }]);
    open = false;
  }
</script>

<div class="page">
  <SubHeader title="Pessoas"><button class="icon-btn" aria-label="Nova pessoa" onclick={() => edit(null)}><Icon name="plus" /></button></SubHeader>
  <div class="card flush list">
    {#each store.people.toSorted((a, b) => a.sort_order - b.sort_order) as person (person.id)}
      <button class="list-row" onclick={() => edit(person)}><CategoryIcon symbol={roleIcon[person.role]} color={person.color} size={34} /><span class="grow">{person.name}</span><span class="muted small">{roleName[person.role]}</span></button>
    {/each}
  </div>
  <p class="form-footer">Cada lançamento pode ter um dono. Nos relatórios, use "Por pessoa" para ver quanto é seu, da casa, da esposa ou do filho. Dica: defina de quem é cada conta e tudo importado nela já vem marcado.</p>
</div>

<Sheet bind:open title={editing ? 'Pessoa' : 'Nova pessoa'}>
  {#snippet actions()}<button class="btn primary" disabled={!name.trim()} onclick={save}>Salvar</button>{/snippet}
  <div class="form-group" style="margin-top: 10px">
    <label class="form-row"><span class="field-label">Nome</span><input class="field" bind:value={name} /></label>
    <label class="form-row"><span class="field-label">Papel</span><select class="field" bind:value={role}>{#each Object.entries(roleName) as [value, label]}<option {value}>{label}</option>{/each}</select></label>
    <div class="form-row" style="flex-wrap: wrap; gap: 10px">{#each palette as c}<button class="swatch" class:on={c === color} style:background={c} aria-label="Cor" onclick={() => (color = c)}></button>{/each}</div>
  </div>
  {#if editing}
    <button class="btn danger" style="margin-top: 16px" onclick={async () => { await store.remove('people', [editing!.id]); open = false; }}>Apagar pessoa (os lançamentos ficam sem dono)</button>
  {/if}
</Sheet>

<style>
  .swatch { width: 26px; height: 26px; border-radius: 50%; border: 0; }
  .swatch.on { box-shadow: 0 0 0 2px #121916, 0 0 0 4px #fff; }
</style>
