<script lang="ts">
  // Endereço antigo da lista de carros: agora é Notas › Transporte.
  import { goto } from '$app/navigation';
  $effect(() => void goto('#/notas/transporte', { replaceState: true }));
</script>
