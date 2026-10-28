<script lang="ts">
  import { organizer } from '$lib/data/organizer.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import { hint } from '$lib/ui/hint';
  let { householdId }: { householdId: string } = $props();
  const space = $derived(organizer.spaceById.get(householdId));
</script>

{#if space?.kind === 'shared'}
  <span class="pill shared" use:hint={['Compartilhado', `Fica em "${space.name}": ${organizer.memberNames(space.id).join(', ')} veem e editam.`]}><Icon name="share" size={11} stroke={2.4} />{space.name}</span>
{/if}

<style>
  .shared { color: #ff8fab; background: rgba(255, 143, 171, 0.14); }
</style>
