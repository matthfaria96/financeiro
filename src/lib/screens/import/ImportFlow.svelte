<script lang="ts">
  import { store, describe } from '$lib/data/store.svelte';
  import { ui } from '$lib/ui/ui.svelte';
  import { parseStatement } from '$lib/core/importer';
  import { dayMonth } from '$lib/core/dates';
  import Sheet from '$lib/ui/Sheet.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import BankCard from '$lib/ui/BankCard.svelte';
  import { hint } from '$lib/ui/hint';
  import { commitDraft, createDraft, type ImportDraft, type ImportOutcome } from '$lib/features/imports.svelte';
  import { inScopeAccount, lastEntryDate } from '$lib/features/model';
  import ImportReview from './ImportReview.svelte';
  import ExportGuide from './ExportGuide.svelte';
  import AccountEditor from '../accounts/AccountEditor.svelte';

  type Step = { type: 'choose' } | { type: 'review'; index: number } | { type: 'saving' } | { type: 'done' };
  let step = $state<Step>({ type: 'choose' });
  let chosen = $state<string | null>(null);
  let drafts = $state<ImportDraft[]>([]);
  let failures = $state<{ name: string; message: string }[]>([]);
  let outcomes = $state<ImportOutcome[]>([]);
  let progress = $state(0);
  let input: HTMLInputElement | undefined = $state();
  let creating = $state(false);
  let reading = $state(false);

  // Abriu: começa do zero (com conta e arquivos pré-escolhidos, se vieram).
  $effect(() => {
    if (!ui.importOpen) return;
    step = { type: 'choose' };
    chosen = ui.importAccountId;
    drafts = [];
    failures = [];
    outcomes = [];
    if (ui.importFiles.length) void load(ui.importFiles);
  });

  async function load(files: File[]) {
    reading = true;
    failures = [];
    const loaded: ImportDraft[] = [];
    for (const file of files) {
      try {
        const statement = await parseStatement(new Uint8Array(await file.arrayBuffer()), file.name);
        loaded.push(createDraft(file.name, statement, chosen));
      } catch (error) {
        failures.push({ name: file.name, message: describe(error) });
      }
    }
    reading = false;
    drafts = loaded;
    step = loaded.length ? { type: 'review', index: 0 } : { type: 'choose' };
  }

  async function commitAll() {
    step = { type: 'saving' };
    progress = 0;
    for (const draft of drafts) {
      try {
        outcomes.push(await commitDraft(draft));
      } catch (error) {
        failures.push({ name: draft.fileName, message: `Não foi possível gravar: ${describe(error)}` });
      }
      progress++;
    }
    step = { type: 'done' };
  }

  function skip(index: number) {
    drafts = drafts.filter((_, i) => i !== index);
    step = drafts.length ? { type: 'review', index: Math.min(index, drafts.length - 1) } : { type: 'choose' };
  }

  const title = $derived(step.type === 'choose' ? 'Importar extrato' : step.type === 'review' ? (drafts.length > 1 ? `Revisar arquivo ${step.index + 1} de ${drafts.length}` : 'Revisar importação') : step.type === 'saving' ? 'Gravando…' : 'Importação concluída');
  const options = $derived(store.accounts.filter((a) => !a.archived && inScopeAccount(a)).toSorted((a, b) => a.sort_order - b.sort_order));
  const uncategorized = $derived(outcomes.reduce((s, o) => s + o.uncategorized, 0));
</script>

<Sheet bind:open={ui.importOpen} {title} wide>
  {#if step.type === 'choose'}
    <div class="stack" style="padding-top: 8px">
      <div class="step-title"><span>1</span>Para qual conta vai este extrato?</div>
      <div class="stack-sm">
        <button class="option" class:on={chosen === null} onclick={() => (chosen = null)} use:hint={['Descobrir pelo arquivo', 'O app escolhe a conta pelo banco e pelo número da conta no arquivo.']}>
          <span class="wand"><Icon name="wand" size={22} /></span>
          <span class="grow"><b>Descobrir pelo arquivo</b><span class="caption">Pelo banco e pelo número da conta. Você confere antes de gravar.</span></span>
          <Icon name={chosen === null ? 'check-circle' : 'circle'} size={22} />
        </button>
        {#each options as account (account.id)}
          {@const last = lastEntryDate(account)}
          <button class="option" class:on={chosen === account.id} onclick={() => (chosen = account.id)}>
            <BankCard {account} width={56} />
            <span class="grow"><b>{account.name}</b><span class="caption">{last ? `Extrato até ${dayMonth(last)}` : 'Nenhum extrato ainda'}</span></span>
            <Icon name={chosen === account.id ? 'check-circle' : 'circle'} size={22} />
          </button>
        {/each}
        <button class="btn ghost" style="justify-content: flex-start" onclick={() => (creating = true)}><Icon name="plus" size={16} />Cadastrar nova conta</button>
      </div>
      <div class="step-title"><span>2</span>Escolha o arquivo do banco</div>
      <input bind:this={input} type="file" multiple accept=".ofx,.csv,.pdf,.txt,text/csv,application/pdf" hidden onchange={(e) => load([...(e.currentTarget.files ?? [])])} />
      <button class="btn primary lg block" disabled={reading} onclick={() => input?.click()}><Icon name="folder" size={18} />{reading ? 'Lendo…' : 'Escolher arquivos…'}</button>
      <p class="caption center">No computador, dá para arrastar os arquivos para a janela. O arquivo é lido aqui mesmo: só os lançamentos vão para a nuvem.</p>
      {#if failures.length}
        <div class="card stack-sm">{#each failures as failure}<div class="row" style="align-items: flex-start"><Icon name="alert" size={18} color="var(--negative)" /><div><b class="small">{failure.name}</b><div class="caption">{failure.message}</div></div></div>{/each}</div>
      {/if}
      <details class="card"><summary class="small muted">Qual arquivo exportar de cada banco</summary><div style="margin-top: 10px"><ExportGuide /></div></details>
    </div>
  {:else if step.type === 'review'}
    {#key drafts[step.index].id}
      <ImportReview draft={drafts[step.index]} last={step.index === drafts.length - 1} onback={step.index > 0 ? () => (step = { type: 'review', index: (step as { index: number }).index - 1 }) : undefined}
        onskip={() => skip((step as { index: number }).index)} onnext={() => (step.type === 'review' && step.index < drafts.length - 1 ? (step = { type: 'review', index: step.index + 1 }) : commitAll())} />
    {/key}
  {:else if step.type === 'saving'}
    <div class="stack" style="padding: 20px 0">
      <div class="track"><div style:width="{(progress / Math.max(drafts.length, 1)) * 100}%"></div></div>
      {#each drafts as draft, index (draft.id)}
        <div class="row small"><Icon name={index < progress ? 'check-circle' : 'clock'} size={18} color={index < progress ? 'var(--accent)' : 'var(--text-3)'} /><span class="grow ellipsis">{draft.fileName}</span><span class="muted">{draft.newCount} lançamentos</span></div>
      {/each}
    </div>
  {:else}
    <div class="stack" style="padding-top: 10px">
      {#each outcomes as outcome}
        <div class="card stack-sm">
          <b class="pos row" style="gap: 8px"><Icon name="check-circle" size={18} />{outcome.added} lançamentos gravados em {outcome.accountName}</b>
          <span class="caption">{outcome.fileName}</span>
          {#if outcome.skipped}<span class="caption">{outcome.skipped} pulados (já importados ou desmarcados).</span>{/if}
          {#if outcome.mirrored}<span class="caption">{outcome.mirrored} aplicações/resgates acompanhados no investimento.</span>{/if}
          {#if outcome.balanceAdjusted}<span class="caption">Saldo da conta ajustado para bater com o extrato.</span>{/if}
        </div>
      {/each}
      {#each failures as failure}<div class="card small neg">{failure.name}: {failure.message}</div>{/each}
      <p class="caption">Os relatórios já estão atualizados. Para desfazer, use Mais › Importações.</p>
      <div class="row between">
        {#if uncategorized}<a class="btn" href="#/transacoes?semcategoria=1" onclick={() => (ui.importOpen = false)}>Revisar {uncategorized} sem categoria</a>{:else}<span></span>{/if}
        <button class="btn primary" onclick={() => (ui.importOpen = false)}>Concluir</button>
      </div>
    </div>
  {/if}
</Sheet>

<AccountEditor bind:open={creating} onsaved={(account) => (chosen = account.id)} />

<style>
  .step-title { display: flex; align-items: center; gap: 10px; font-weight: 600; margin-top: 6px; }
  .step-title span { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; font-size: 14px; background: var(--accent-soft); color: var(--accent); }
  .option { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 16px; border: 1px solid var(--stroke); background: var(--card); text-align: left; color: var(--text-3); transition: background 0.2s, border-color 0.2s; }
  .option .grow { display: flex; flex-direction: column; gap: 2px; color: var(--text); }
  .option.on { background: var(--accent-soft); border-color: rgba(43, 212, 164, 0.5); color: var(--accent); }
  .wand { width: 56px; display: grid; place-items: center; color: var(--accent); }
  .center { text-align: center; margin: 0; }
  details summary { cursor: pointer; }
  .track { height: 6px; border-radius: 3px; background: rgba(255, 255, 255, 0.08); overflow: hidden; }
  .track div { height: 100%; background: var(--accent); transition: width 0.3s; }
</style>
