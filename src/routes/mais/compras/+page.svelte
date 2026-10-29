<script lang="ts">
  // Endereço antigo da lista de compras: agora fica em Notas.
  import { goto } from '$app/navigation';
  $effect(() => void goto('#/notas', { replaceState: true }));
</script>
