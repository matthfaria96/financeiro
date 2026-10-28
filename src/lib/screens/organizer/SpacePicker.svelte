<script lang="ts">
  import { organizer } from '$lib/data/organizer.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import { hint } from '$lib/ui/hint';

  /** "Quem vê": só eu (casa pessoal) ou um espaço compartilhado. Sem espaço criado, leva para Compartilhar. */
  let { value = $bindable() }: { value: string } = $props();
</script>

{#if organizer.shared.length}
  <label class="form-row" use:hint={['Quem vê', 'Só eu: fica na sua conta. Compartilhado: quem participa do espaço vê e edita junto.']}>
    <span class="field-label">Quem vê</span>
    <select class="field" bind:value>
      <option value={organizer.personalId}>Só eu</option>
      {#each organizer.shared as space (space.id)}<option value={space.id}>Compartilhado · {space.name}</option>{/each}
    </select>
  </label>
{:else}
  <a class="form-row" href="#/mais/compartilhar" use:hint={['Compartilhar', 'Crie um espaço compartilhado para sua esposa ver e editar junto.']}>
    <span class="field-label grow">Só eu vejo</span><span class="caption accent">Compartilhar…</span><Icon name="chevron-right" size={15} class="faint" />
  </a>
{/if}

<style>
  .accent { color: var(--accent); }
</style>
