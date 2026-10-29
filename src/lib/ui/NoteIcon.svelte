<script lang="ts">
  import Icon from './Icon.svelte';
  /** Ícone das Notas: o símbolo desenhado (não o emoji) num quadrado com degradê na cor da lista. */
  let { emoji, color, size = 48 }: { emoji: string; color: string; size?: number } = $props();
  const map: Record<string, string> = {
    '🛒': 'cart', '💊': 'pills', '🐾': 'pawprint', '🏠': 'house', '🧹': 'sparkles', '👶': 'child', '🎁': 'gift', '🧰': 'hammer',
    '👕': 'tshirt', '📚': 'book', '🌱': 'leaf', '🍷': 'heart', '🎉': 'sparkles', '✈️': 'airplane', '💄': 'comb', '📝': 'list-checks', '⭐': 'star', '🚗': 'car'
  };
  const name = $derived(map[emoji] ?? 'list-checks');
</script>

<span class="tile" style:--c={color} style:width="{size}px" style:height="{size}px" style:border-radius="{Math.round(size * 0.3)}px" aria-hidden="true">
  <Icon {name} size={Math.round(size * 0.5)} stroke={2.1} />
</span>

<style>
  .tile { display: grid; place-items: center; flex: none; color: #fff;
    background: linear-gradient(155deg, color-mix(in srgb, var(--c) 92%, white), color-mix(in srgb, var(--c) 58%, black));
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28), inset 0 0 0 0.5px rgba(255, 255, 255, 0.18), 0 6px 18px color-mix(in srgb, var(--c) 30%, transparent); }
</style>
