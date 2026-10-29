<script lang="ts">
  import { money, percent } from '$lib/core/money';
  import Ring from '$lib/ui/charts/Ring.svelte';
  import { hint } from '$lib/ui/hint';
  import { MEI_LIMIT_CENTS, meiRevenue } from '$lib/features/ambient';

  /** Faturamento do ano × limite do MEI (R$ 81 mil), com o ritmo atual projetado para dezembro. */
  const r = $derived(meiRevenue());
  const color = $derived(r.share >= 0.9 || r.pace > MEI_LIMIT_CENTS ? '#ff6b5b' : r.share >= 0.7 ? '#ffa63d' : '#2bd4a4');
</script>

<section class="card">
  <div class="card-head"><h3>Faturamento do ano</h3><span class="sub" use:hint={['Limite do MEI', 'O MEI pode faturar até R$ 81 mil por ano. Passando de 20%, vira microempresa.']}>limite MEI {money(MEI_LIMIT_CENTS, { cents: false })}</span></div>
  <div class="row" style="gap: 18px">
    <Ring value={r.share} size={96} stroke={10} {color} label={percent(r.share)} sub="do limite" />
    <div class="stack-sm grow">
      <div class="line"><span class="muted">Faturado</span><b class="num">{money(r.total, { cents: false })}</b></div>
      <div class="line"><span class="muted">Falta até o limite</span><b class="num" class:neg={r.left < 0}>{money(r.left, { cents: false })}</b></div>
      <div class="line"><span class="muted">No ritmo atual, em dezembro</span><b class="num" style:color={r.pace > MEI_LIMIT_CENTS ? 'var(--negative)' : undefined}>{money(r.pace, { cents: false })}</b></div>
    </div>
  </div>
  {#if r.pace > MEI_LIMIT_CENTS}<p class="small warn note">No ritmo atual o faturamento passa do limite do MEI este ano. Vale conversar com um contador.</p>{/if}
</section>

<style>
  .line { display: flex; justify-content: space-between; gap: 10px; font-size: 14.5px; }
  .line b { white-space: nowrap; }
  .note { margin: 12px 0 0; }
</style>
