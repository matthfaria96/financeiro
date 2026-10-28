<script lang="ts">
  // Onde achar o arquivo em cada banco e qual formato preferir.
</script>

<div class="stack-sm guide">
  {#each [['Nubank · conta', 'Extrato › compartilhar › Exportar extrato › OFX (ou CSV)', '#9B1FE8'], ['Nubank · cartão', 'Fatura › Exportar fatura › CSV (ou OFX)', '#9B1FE8'], ['Inter · conta', 'Extrato › Exportar › OFX (ou CSV)', '#FF8A1F'], ['Inter · cartão', 'Cartões › Fatura › Exportar › CSV (PDF também funciona)', '#FF8A1F']] as [title, path, color]}
    <div class="row" style="align-items: flex-start; gap: 10px"><span class="dot" style:background={color}></span><div><b class="small">{title}</b><div class="small muted">{path}</div></div></div>
  {/each}
  <p class="caption">Prefira OFX: traz um código único por lançamento e o saldo da conta, então reimportar nunca duplica. CSV funciona igual. PDF é lido por aproximação e pede conferência.</p>
</div>

<style>
  .dot { width: 10px; height: 10px; border-radius: 50%; margin-top: 5px; flex: none; }
  .guide p { margin: 4px 0 0; }
</style>
