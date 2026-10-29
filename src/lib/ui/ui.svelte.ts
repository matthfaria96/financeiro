/** Folhas globais (abertas de qualquer tela). */
class UI {
  importOpen = $state(false);
  importAccountId = $state<string | null>(null);
  importFiles = $state<File[]>([]);
  editingEntryId = $state<string | null>(null);
  newEntryOpen = $state(false);
  newAccountOpen = $state(false);
  /** Quantas navegações já houve dentro do app: com alguma, o "Voltar" volta pelo histórico (para a tela de onde veio). */
  navigations = $state(0);
  /** Mês aberto na tela de Previsão (o card do Início escolhe ao tocar num mês). */
  forecastMonth = $state<string | null>(null);

  startImport(accountId: string | null = null, files: File[] = []) {
    this.importAccountId = accountId;
    this.importFiles = files;
    this.importOpen = true;
  }

  editEntry(id: string) {
    this.editingEntryId = id;
  }
}

export const ui = new UI();
