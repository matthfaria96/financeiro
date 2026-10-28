<script lang="ts">
  /** Botão de apagar com confirmação, no fim dos formulários. */
  let { label, question, ondelete }: { label: string; question: string; ondelete: () => void | Promise<void> } = $props();
  let confirming = $state(false);
</script>

<div class="form-group" style="margin-top: 18px">
  {#if confirming}
    <div class="form-row"><span class="grow small neg">{question}</span><button class="btn danger" onclick={ondelete}>Apagar</button></div>
  {:else}
    <button class="form-row plain neg" onclick={() => (confirming = true)}>{label}</button>
  {/if}
</div>

<style>
  .plain { background: none; border: 0; width: 100%; text-align: left; }
</style>
