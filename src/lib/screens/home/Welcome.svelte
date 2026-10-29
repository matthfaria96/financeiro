<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import { ui } from '$lib/ui/ui.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import BankCard from '$lib/ui/BankCard.svelte';
  import { enterDemo } from '$lib/data/demoMode';
  import ExportGuide from '$lib/screens/import/ExportGuide.svelte';

  /** Primeiro acesso: três passos, um de cada vez, com o próximo em destaque. */
  const hasAccount = $derived(store.accounts.length > 0);
  const sample = (bank: string, kind: 'checking' | 'creditCard') => ({ bank, kind, color: '', name: '', last_digits: '' }) as never;
</script>

<section class="card welcome rise">
  <div class="intro">
    <h2>Vamos começar</h2>
    <p class="muted">Em dois passos o app lê o extrato do banco, separa tudo por categoria e mostra para onde foi o dinheiro.</p>
  </div>
  <div class="steps">
    <div class="step" class:done={hasAccount} class:now={!hasAccount}>
      <div class="art"><BankCard account={sample('nubank', 'checking')} width={110} /><BankCard account={sample('inter', 'creditCard')} width={110} /></div>
      <span class="n">{#if hasAccount}<Icon name="check" size={14} stroke={3} />{:else}1{/if}</span>
      <b>Cadastre suas contas</b>
      <p class="small muted">Cada conta e cartão: o banco e de quem é.</p>
      {#if !hasAccount}<button class="btn primary" onclick={() => (ui.newAccountOpen = true)}><Icon name="plus" size={16} />Cadastrar conta</button>
      {:else}<span class="small pos">{store.accounts.length} {store.accounts.length === 1 ? 'conta cadastrada' : 'contas cadastradas'}</span>{/if}
    </div>
    <div class="step" class:now={hasAccount}>
      <div class="art file"><Icon name="file" size={40} stroke={1.4} /><span>OFX · CSV · PDF</span></div>
      <span class="n">2</span>
      <b>Importe o extrato</b>
      <p class="small muted">Exporte no app do banco e arraste o arquivo para esta janela.</p>
      <button class="btn" class:primary={hasAccount} disabled={!hasAccount} onclick={() => ui.startImport()}><Icon name="import" size={16} />Importar extrato</button>
    </div>
    <div class="step">
      <div class="art chart"><span style:height="40%"></span><span style:height="70%"></span><span style:height="55%"></span><span style:height="90%"></span></div>
      <span class="n">3</span>
      <b>Pronto</b>
      <p class="small muted">O Início mostra o que entrou, o que saiu e o que falta pagar.</p>
      <button class="btn ghost" onclick={() => enterDemo(true)}><Icon name="sparkles" size={15} />Ver como fica</button>
    </div>
  </div>
  <details><summary class="small muted">Como exportar o extrato no app de cada banco</summary><ExportGuide /></details>
</section>

<style>
  .welcome { display: flex; flex-direction: column; gap: 22px; padding: 26px; }
  .intro h2 { margin: 0 0 6px; font: 700 26px var(--font-display); letter-spacing: -0.02em; }
  .intro p { margin: 0; max-width: 560px; }
  .steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
  .step { position: relative; display: flex; flex-direction: column; gap: 8px; align-items: flex-start; padding: 18px; border-radius: 18px; border: 1px solid var(--stroke); background: rgba(255, 255, 255, 0.025); opacity: 0.6; }
  .step.now { opacity: 1; border-color: rgba(43, 212, 164, 0.4); background: rgba(43, 212, 164, 0.06); }
  .step.done { opacity: 0.85; }
  .step p { margin: 0 0 6px; }
  .art { height: 86px; width: 100%; display: flex; align-items: center; justify-content: center; margin-bottom: 4px; }
  .art :global(.bank:first-child) { transform: rotate(-8deg) translateX(14px); }
  .art :global(.bank:last-child) { transform: rotate(6deg) translateX(-14px); }
  .file { flex-direction: column; gap: 6px; color: var(--text-2); font-size: 11px; font-weight: 700; letter-spacing: 0.06em; }
  .chart { gap: 8px; align-items: flex-end; padding: 6px 30%; }
  .chart span { flex: 1; border-radius: 4px 4px 0 0; background: linear-gradient(180deg, #2bd4a4, #199e70); }
  .n { position: absolute; top: 14px; left: 14px; width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; font-weight: 700; font-size: 13px; background: rgba(255, 255, 255, 0.1); }
  .done .n { background: var(--accent); color: #04140e; }
  details summary { cursor: pointer; }
</style>
