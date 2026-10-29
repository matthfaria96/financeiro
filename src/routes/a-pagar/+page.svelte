<script lang="ts">
  // Endereço antigo: as contas fixas agora têm tela própria.
  import { goto } from '$app/navigation';
  $effect(() => {
    void goto('#/contas-fixas', { replaceState: true });
  });
</script>
