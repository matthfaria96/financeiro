<script lang="ts">
  import { untrack } from 'svelte';
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { money } from '$lib/core/money';

  /** Valor em reais que corre até o número novo quando ele muda (troca de mês, ajuste). */
  let { cents, showCents = true, duration = 600 }: { cents: number; showCents?: boolean; duration?: number } = $props();
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  // svelte-ignore state_referenced_locally
  const shown = new Tween(0, { duration: reduce ? 0 : duration, easing: cubicOut });
  // Só recomeça quando o valor muda de fato (definir o alvo lê o valor atual: sem untrack, recomeçaria a cada quadro).
  let last: number | null = null;
  $effect(() => {
    const next = cents;
    if (next === last) return;
    last = next;
    untrack(() => (shown.target = next));
  });
</script>

<span class="num tally">{money(Math.round(shown.current), { cents: showCents })}</span>

<style>
  .tally { font-variant-numeric: tabular-nums; }
</style>
