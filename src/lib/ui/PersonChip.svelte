<script lang="ts">
  import Icon from './Icon.svelte';
  import { roleIcon } from './look';
  import type { Person } from '$lib/data/types';
  let { person }: { person: Person } = $props();
</script>

<span class="pill" style:color={person.color} style:background="color-mix(in srgb, {person.color} 15%, transparent)">
  <Icon name={roleIcon[person.role]} size={10} stroke={3} />{person.name}
</span>
