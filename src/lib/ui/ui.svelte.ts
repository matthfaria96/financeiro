/** Folhas globais (abertas de qualquer tela). */
class UI {
  importOpen = $state(false);
  importAccountId = $state<string | null>(null);
  importFiles = $state<File[]>([]);
  editingEntryId = $state<string | null>(null);
  newEntryOpen = $state(false);

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
