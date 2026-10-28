<script lang="ts">
  import { icons } from './icons';
  let { name, size = 18, stroke = 2, color = 'currentColor', class: className = '' }: { name: string; size?: number; stroke?: number; color?: string; class?: string } = $props();
</script>

<svg class={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} stroke-width={stroke} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  {@html icons[name] ?? icons.tag}
</svg>
