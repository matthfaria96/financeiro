<script lang="ts">
  import Icon from './Icon.svelte';
  import { roleIcon } from './look';
  import type { Person } from '$lib/data/types';
  let { person }: { person: Person } = $props();
</script>

<span class="pill" style:color={person.color} style:background="color-mix(in srgb, {person.color} 15%, transparent)">
  {#if person.photo}<img src={person.photo} alt="" />{:else}<Icon name={roleIcon[person.role]} size={10} stroke={3} />{/if}{person.name}
</span>

<style>
  img { width: 14px; height: 14px; border-radius: 50%; object-fit: cover; margin-left: -4px; }
</style>
