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
  let dragOver = $state(false);
  let manual = $state(false);

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
    // Grava direto o que o app tem certeza (conta reconhecida, banco conhecido, sem repetidos de outro formato);
    // só pede revisão do que for duvidoso.
    const sure = loaded.filter(isSure);
    const unsure = loaded.filter((d) => !isSure(d));
    if (sure.length) {
      drafts = sure;
      await commitAll(false);
    }
    drafts = unsure;
    step = unsure.length ? { type: 'review', index: 0 } : outcomes.length || failures.length ? { type: 'done' } : { type: 'choose' };
  }

  function isSure(draft: ImportDraft): boolean {
    if (draft.targetAccount) return draft.possibleCount === 0 && !draft.otherAccountMatches.length && draft.investment.type !== 'new';
    return draft.statement.bank !== 'other' && draft.possibleCount === 0;
  }

  function pick(event: DragEvent) {
    event.preventDefault();
    dragOver = false;
    const files = [...(event.dataTransfer?.files ?? [])];
    if (files.length) void load(files);
  }

  async function commitAll(finish = true) {
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
    if (finish) step = { type: 'done' };
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
      <input bind:this={input} type="file" multiple accept=".ofx,.csv,.pdf,.txt,text/csv,application/pdf" hidden onchange={(e) => load([...(e.currentTarget.files ?? [])])} />
      <button class="drop" class:over={dragOver} disabled={reading} onclick={() => input?.click()}
        ondragover={(e) => { e.preventDefault(); dragOver = true; }} ondragleave={() => (dragOver = false)} ondrop={pick}>
        <span class="ico"><Icon name="import" size={30} /></span>
        <b>{reading ? 'Lendo e gravando…' : 'Solte os extratos aqui'}</b>
        <span class="caption">ou toque para escolher · OFX, CSV ou PDF · vários de uma vez</span>
      </button>
      <p class="caption center">O app descobre o banco e a conta pelo arquivo, separa por categoria e grava. Só pergunta se tiver dúvida. Dá para desfazer em Configuração › Importações.</p>
      <button class="btn ghost manual" onclick={() => (manual = !manual)}><Icon name={manual ? 'chevron-up' : 'chevron-down'} size={15} />Escolher a conta manualmente</button>
      {#if manual}
        <div class="stack-sm">
          <button class="option" class:on={chosen === null} onclick={() => (chosen = null)}>
            <span class="wand"><Icon name="wand" size={22} /></span>
            <span class="grow"><b>Descobrir pelo arquivo</b><span class="caption">Pelo banco e pelo número da conta.</span></span>
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
      {/if}
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
          {#if outcome.firstDate}<span class="caption">Período: {dayMonth(outcome.firstDate)} a {dayMonth(outcome.lastDate!)}{outcome.income ? ` · ${outcome.income} entradas` : ''}</span>{/if}
        </div>
      {/each}
      {#each failures as failure}<div class="card small neg">{failure.name}: {failure.message}</div>{/each}
      <p class="caption">Os relatórios já estão atualizados. Para desfazer, use Configuração › Importações.</p>
      <div class="row between">
        {#if uncategorized}<a class="btn" href="#/transacoes/todos?semcategoria=1" onclick={() => (ui.importOpen = false)}>Revisar {uncategorized} sem categoria</a>{:else}<span></span>{/if}
        <button class="btn primary" onclick={() => (ui.importOpen = false)}>Concluir</button>
      </div>
    </div>
  {/if}
</Sheet>

<AccountEditor bind:open={creating} onsaved={(account) => (chosen = account.id)} />

<style>
  .drop { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 34px 16px; border-radius: 20px; border: 2px dashed rgba(43, 212, 164, 0.45); background: rgba(43, 212, 164, 0.06); color: var(--text); transition: background 0.2s, border-color 0.2s; }
  .drop.over, .drop:hover { background: rgba(43, 212, 164, 0.14); border-color: var(--accent); }
  .drop b { font: 600 18px var(--font-display); }
  .drop .ico { width: 60px; height: 60px; border-radius: 18px; display: grid; place-items: center; color: var(--accent); background: var(--accent-soft); margin-bottom: 4px; }
  .manual { align-self: center; }
  .option { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 16px; border: 1px solid var(--stroke); background: var(--card); text-align: left; color: var(--text-3); transition: background 0.2s, border-color 0.2s; }
  .option .grow { display: flex; flex-direction: column; gap: 2px; color: var(--text); }
  .option.on { background: var(--accent-soft); border-color: rgba(43, 212, 164, 0.5); color: var(--accent); }
  .wand { width: 56px; display: grid; place-items: center; color: var(--accent); }
  .center { text-align: center; margin: 0; }
  details summary { cursor: pointer; }
  .track { height: 6px; border-radius: 3px; background: rgba(255, 255, 255, 0.08); overflow: hidden; }
  .track div { height: 100%; background: var(--accent); transition: width 0.3s; }
</style>
