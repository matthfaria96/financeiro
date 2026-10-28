<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import WorkspaceBar from '$lib/ui/WorkspaceBar.svelte';
  import SectionTitle from '$lib/ui/SectionTitle.svelte';
  import SubHeader from '$lib/screens/more/SubHeader.svelte';
  import AccountRow from '$lib/screens/accounts/AccountRow.svelte';
  import AccountEditor from '$lib/screens/accounts/AccountEditor.svelte';
  import { inScopeAccount } from '$lib/features/model';
  let creating = $state(false);
  const accounts = $derived(store.accounts.filter(inScopeAccount).toSorted((a, b) => a.sort_order - b.sort_order));
  const grouped = $derived(store.workspacesEnabled && !store.scopeId
    ? [...store.workspaces.map((w) => ({ title: w.name, items: accounts.filter((a) => a.workspace_id === w.id) })), { title: 'Sem área', items: accounts.filter((a) => !a.workspace_id) }].filter((g) => g.items.length)
    : [{ title: '', items: accounts }]);
</script>

<div class="page">
  <SubHeader title="Contas e cartões"><button class="icon-btn" aria-label="Cadastrar conta" onclick={() => (creating = true)}><Icon name="plus" /></button></SubHeader>
  <WorkspaceBar />
  {#each grouped as group (group.title)}
    {#if group.title}<SectionTitle title={group.title} />{/if}
    {#each group.items as account (account.id)}<AccountRow {account} />{/each}
  {/each}
  <button class="btn lg block dashed" onclick={() => (creating = true)}><Icon name="plus" size={18} />Cadastrar conta ou cartão</button>
</div>
<AccountEditor bind:open={creating} />

<style>
  .dashed { border-style: dashed; color: var(--accent); background: var(--accent-soft); }
</style>
