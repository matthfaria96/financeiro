<script lang="ts">
  import { profileName, profilePhoto } from '$lib/features/profile';
  /** Foto de quem usa (a da pessoa "Eu") ou a inicial num círculo com degradê. */
  let { size = 44 }: { size?: number } = $props();
  const photo = $derived(profilePhoto());
  const initial = $derived(profileName().slice(0, 1).toUpperCase());
</script>

<span class="avatar" style:width="{size}px" style:height="{size}px" style:font-size="{Math.round(size * 0.42)}px" aria-hidden="true">
  {#if photo}<img src={photo} alt="" />{:else}{initial}{/if}
</span>

<style>
  .avatar { display: grid; place-items: center; flex: none; border-radius: 50%; overflow: hidden; font-weight: 700; color: #04140e;
    background: linear-gradient(145deg, #5ff0c6, #1fa57f 60%, #136b53); box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.08), 0 6px 18px rgba(43, 212, 164, 0.22); }
  img { width: 100%; height: 100%; object-fit: cover; }
</style>
