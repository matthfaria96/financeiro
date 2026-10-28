<script lang="ts">
  import { money } from '$lib/core/money';
  let { cents, showCents = true, muted = false, colored = true, class: className = '' }: { cents: number; showCents?: boolean; muted?: boolean; colored?: boolean; class?: string } = $props();
</script>

<span class="num {className}" class:pos={colored && !muted && cents > 0} class:faint={muted}>{money(cents, { cents: showCents })}</span>
