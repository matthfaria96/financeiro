<script lang="ts">
  import Icon from '$lib/ui/Icon.svelte';
  import BankCard from '$lib/ui/BankCard.svelte';
  import Donut from '$lib/ui/Donut.svelte';
  import Sparkline from '$lib/ui/charts/Sparkline.svelte';

  /** Vitrine ao lado do login (só no computador): cartões, um painel de exemplo e o que o app faz. Tudo ilustrativo. */
  const card = (bank: string, kind: 'checking' | 'creditCard', digits: string) => ({ bank, kind, color: '', name: '', last_digits: digits }) as never;
  const features = [
    { icon: 'import', text: 'Lê extratos e faturas de 24 bancos (OFX, CSV e PDF)' },
    { icon: 'reports', text: 'Separa por categoria e monta os gráficos sozinho' },
    { icon: 'calendar', text: 'Contas fixas, faturas e o que falta pagar no mês' },
    { icon: 'basket', text: 'Lista do mercado, casa e carro — compartilhe só o que quiser' }
  ];
</script>

<div class="show" aria-hidden="true">
  <div class="art">
    <div class="glow"></div>
    <div class="card-a"><BankCard account={card('nubank', 'creditCard', '1503')} width={250} /></div>
    <div class="card-b"><BankCard account={card('inter', 'checking', '9041')} width={230} /></div>
    <div class="card-c"><BankCard account={card('itau', 'creditCard', '7720')} width={210} /></div>
    <div class="panel glass">
      <span class="caption">Quanto tenho agora</span>
      <b class="big grad-text">R$ 56.015</b>
      <Sparkline values={[22, 26, 25, 31, 34, 33, 40, 44, 52, 56]} width={210} height={44} color="#2bd4a4" />
      <div class="split">
        <Donut size={74} thickness={0.36} slices={[{ id: 'a', value: 38, color: '#38d9f5' }, { id: 'b', value: 22, color: '#ff9f1c' }, { id: 'c', value: 14, color: '#9085e9' }, { id: 'd', value: 12, color: '#2ec4b6' }, { id: 'e', value: 14, color: '#ff8fab' }]} />
        <div class="lines"><span><i style:background="#38d9f5"></i>Casa</span><span><i style:background="#ff9f1c"></i>Alimentação</span><span><i style:background="#9085e9"></i>Compras</span></div>
      </div>
    </div>
  </div>
  <h2>As contas da casa,<br /><span class="grad-text">bonitas e no lugar.</span></h2>
  <ul>{#each features as f (f.icon)}<li><span class="ico"><Icon name={f.icon} size={16} /></span>{f.text}</li>{/each}</ul>
</div>

<style>
  .show { display: flex; flex-direction: column; gap: 26px; max-width: 520px; }
  .art { position: relative; height: 372px; }
  .glow { position: absolute; inset: 10% 5% 0 10%; background: radial-gradient(closest-side, rgba(43, 212, 164, 0.25), transparent); filter: blur(10px); }
  .art > div:not(.glow) { position: absolute; }
  .card-a { left: 0; top: 30px; transform: rotate(-11deg); z-index: 1; }
  .card-b { left: 120px; top: 6px; transform: rotate(6deg); z-index: 2; }
  .card-c { left: 40px; top: 170px; transform: rotate(-3deg); z-index: 3; }
  .card-a, .card-b, .card-c { animation: float 7s ease-in-out infinite; }
  .card-b { animation-delay: -2.3s; }
  .card-c { animation-delay: -4.6s; }
  @keyframes float { 50% { translate: 0 -8px; } }
  .panel { right: 0; top: 118px; z-index: 4; width: 250px; background: rgba(17, 25, 22, 0.88); padding: 16px; border-radius: 20px; display: flex; flex-direction: column; gap: 6px; box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 24px 60px rgba(0, 0, 0, 0.5); }
  .big { font: 600 28px var(--font-display); letter-spacing: -0.02em; }
  .split { display: flex; gap: 12px; align-items: center; margin-top: 6px; padding-top: 10px; border-top: 1px solid var(--stroke); }
  .lines { display: flex; flex-direction: column; gap: 5px; font-size: 12px; color: var(--text-2); }
  .lines i { width: 8px; height: 8px; border-radius: 2px; display: inline-block; margin-right: 6px; }
  h2 { margin: 0; font: 700 38px/1.1 var(--font-display); letter-spacing: -0.03em; }
  ul { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 12px; }
  li { display: flex; align-items: center; gap: 12px; color: var(--text-2); font-size: 15px; }
  .ico { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; flex: none; color: var(--accent); background: var(--accent-soft); }
  @media (prefers-reduced-motion: reduce) { .card-a, .card-b, .card-c { animation: none; } }
</style>
