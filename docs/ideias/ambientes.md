# Ideia guardada: ambientes (Pessoal / Empresa MEI)

Tirada do app em 29/10/2026 a pedido do usuário ("não ficou bom, deixar para um segundo momento").
Os dados continuam no banco (colunas `workspaces.kind` e `notebooks.workspace_id`); nada foi apagado.
O código da primeira versão está no histórico do git (commit "feat: Configuração como 4º botão, ambientes…").

## O que foi feito na primeira versão
- Ambiente = área de trabalho com tipo (`personal` | `business`). Cada conta pertence a um ambiente.
- Troca de ambiente no topo do menu lateral / no alto da tela no celular, mais "Tudo".
- Empresa (MEI): entradas agrupadas por cliente (nome no Pix/TED), cartão de faturamento do ano × limite
  do MEI (R$ 81 mil) com ritmo projetado, DAS nas contas fixas (dia 20) e Notas próprias
  (notas fiscais a emitir, clientes a cobrar, insumos e estoque).

## Por que não ficou bom (para pensar antes de voltar)
- Trocar de ambiente muda o app inteiro sem deixar claro onde se está.
- Ambiente, pessoa (dono do gasto) e espaço compartilhado são três ideias parecidas: confunde.
- O modo empresa precisa partir do dia a dia real de um MEI (emitir nota, cobrar cliente, pró-labore,
  comprovantes), não de telas genéricas.

## Caminhos para a segunda versão
- Começar com uma única tela "Minha empresa" dentro das Notas (cartão), em vez de um ambiente que troca tudo.
- Marcar contas como "da empresa" e mostrar só um resumo separado (faturamento, limite MEI, DAS).
- Decidir junto com o modelo de compartilhamento com a família.
