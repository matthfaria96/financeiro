<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import { ui } from '$lib/ui/ui.svelte';
  import { dayHeader, monthOf, monthTitle, today } from '$lib/core/dates';
  import Icon from '$lib/ui/Icon.svelte';
  import { hint } from '$lib/ui/hint';
  import Welcome from '$lib/screens/home/Welcome.svelte';
  import BalanceCard from '$lib/screens/money/BalanceCard.svelte';
  import MonthStrip from '$lib/screens/money/MonthStrip.svelte';
  import PanoramaCard from '$lib/screens/money/PanoramaCard.svelte';
  import ForecastCard from '$lib/screens/money/ForecastCard.svelte';
  import { lastEntryDate } from '$lib/features/model';
  import { dayMonth } from '$lib/core/dates';
  import AccountsSheet from '$lib/screens/money/AccountsSheet.svelte';
  import ProfileAvatar from '$lib/ui/ProfileAvatar.svelte';
  import ConfigureLink from '$lib/ui/ConfigureLink.svelte';
  import { profileName } from '$lib/features/profile';
  import { inScope, inScopeAccount } from '$lib/features/model';
  import { analyzeMonth } from '$lib/features/analytics';

  /** Início: meses no topo (o atual em destaque), Saldo, Panorama mensal e Previsão dos próximos meses. */
  const entries = $derived(store.entries.filter(inScope));
  const accounts = $derived(store.accounts.filter((a) => !a.archived && inScopeAccount(a)).toSorted((a, b) => a.sort_order - b.sort_order));
  let month = $state(monthOf(today()));
  const first = $derived(entries.map((e) => monthOf(e.date)).sort()[0] ?? null);
  const analysis = $derived(analyzeMonth(month, entries, accounts));
  const empty = $derived(!store.accounts.length || !store.entries.length);

  let configOpen = $state(false);
  // Contas cujo extrato ainda não chegou neste mês (as entradas do mês parecem zeradas por isso).
  const stale = $derived(accounts.filter((a) => a.kind === 'checking').map((a) => ({ account: a, last: lastEntryDate(a) })).filter((x) => x.last && x.last < `${month}-01` && month === monthOf(today()))
    .map((x) => `${x.account.name} até ${dayMonth(x.last!)}`));
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
</script>

<div class="page narrow">
  <header class="row between top">
    <a class="profile" href="#/mais" use:hint={['Perfil e configurações', 'Família, contas, categorias, senha e preferências.']}>
      <ProfileAvatar size={46} />
      <span class="hello"><span class="muted small">{greeting} · {dayHeader(today()).split(',')[0].toLowerCase()}</span><b class="ellipsis">{profileName()}</b></span>
      <Icon name="chevron-right" size={15} class="faint" />
    </a>
    <div class="row actions">
      <button class="import" aria-label="Importar extrato" onclick={() => ui.startImport()} use:hint={['Importar extrato ou fatura', 'Solte o arquivo do banco: o app reconhece a conta ou o cartão sozinho (ou cria um, na primeira vez).']}><Icon name="import" size={16} /><span class="hide-m">Importar</span></button>
    </div>
  </header>

  {#if empty}
    <Welcome />
  {:else}
    <MonthStrip bind:value={month} {first} />
    <div class="cards">
      <BalanceCard {analysis} current={month === monthOf(today())} title={month === monthOf(today()) ? 'Saldo financeiro' : month > monthOf(today()) ? 'Saldo hoje' : `Saldo no fim de ${monthTitle(month).split(' ')[0].toLowerCase()}`} hidden={store.household?.settings.home_hidden ?? []} />
      <PanoramaCard {month} {analysis} {entries} {accounts} {stale} />
      <ForecastCard {accounts} />
    </div>
    <ConfigureLink onclick={() => (configOpen = true)} />
  {/if}

</div>
<AccountsSheet bind:open={configOpen} />

<style>
  .top { gap: 10px; margin-top: 4px; }
  /* Zona do perfil: toque leva ao perfil, com todas as configurações. */
  .profile { display: flex; align-items: center; gap: 12px; min-width: 0; padding: 6px 12px 6px 6px; margin-left: -6px; border-radius: 999px; color: inherit; transition: background 0.2s, transform 0.2s var(--spring); }
  .profile:hover { background: rgba(255, 255, 255, 0.05); }
  .profile:active { transform: scale(0.98); }
  .hello { display: flex; flex-direction: column; min-width: 0; line-height: 1.2; }
  .hello b { font: 700 22px var(--font-display); letter-spacing: -0.02em; }
  .actions { gap: 8px; flex: none; }
  .import { display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 40px; min-width: 40px; padding: 0 14px; border-radius: 999px; font-size: 14px; font-weight: 600;
    color: var(--accent); border: 1px solid rgba(43, 212, 164, 0.3); background: var(--accent-soft); transition: background 0.2s, transform 0.2s var(--spring); }
  .import:hover { background: rgba(43, 212, 164, 0.22); }
  .import:active { transform: scale(0.94); }
  @media (max-width: 600px) { .import { padding: 0; width: 40px; } }
  .cards { display: flex; flex-direction: column; gap: 16px; }
</style>
