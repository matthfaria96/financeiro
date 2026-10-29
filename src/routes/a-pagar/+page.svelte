<script lang="ts">
  // Endereço antigo: as contas fixas agora abrem numa janela por cima do Início.
  import { goto } from '$app/navigation';
  import { ui } from '$lib/ui/ui.svelte';
  $effect(() => {
    void goto('#/', { replaceState: true }).then(() => (ui.billsOpen = true));
  });
</script>
