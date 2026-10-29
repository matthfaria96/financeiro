/** As três seções do app e qual delas cada tela pertence (para marcar o botão certo no menu). */
export type Section = 'home' | 'entries' | 'notes' | 'settings';

export const sections: { id: Section; href: string; label: string; icon: string; color: string }[] = [
  { id: 'entries', href: '#/transacoes', label: 'Lançamentos', icon: 'transactions', color: '#3987e5' },
  { id: 'home', href: '#/', label: 'Início', icon: 'home', color: '#2bd4a4' },
  { id: 'notes', href: '#/notas', label: 'Notas', icon: 'list-checks', color: '#ff9f1c' },
  { id: 'settings', href: '#/mais', label: 'Configuração', icon: 'settings', color: '#8e8e93' }
];

export function sectionOf(route: string): Section {
  if (route === '/') return 'home';
  if (/^\/(transacoes|a-pagar|relatorios|contas-fixas|contas\/)/.test(route)) return 'entries';
  if (/^\/(notas|mais\/carro|mais\/projetos|mais\/compras)/.test(route)) return 'notes';
  return 'settings';
}
