/** As três seções do app e qual delas cada tela pertence (para marcar o botão certo no menu).
 *  O perfil e as configurações (/mais) abrem pelo avatar do Início, então contam como Início. */
export type Section = 'home' | 'entries' | 'notes';

export const sections: { id: Section; href: string; label: string; icon: string; color: string }[] = [
  { id: 'entries', href: '#/transacoes', label: 'Lançamentos', icon: 'transactions', color: '#3987e5' },
  { id: 'home', href: '#/', label: 'Início', icon: 'home', color: '#2bd4a4' },
  { id: 'notes', href: '#/notas', label: 'Notas', icon: 'list-checks', color: '#ff9f1c' }
];

export function sectionOf(route: string): Section {
  if (route === '/') return 'home';
  if (/^\/(transacoes|a-pagar|relatorios|contas-fixas|contas\/|mais\/(categorias|estabelecimentos|pessoas|importacoes))/.test(route)) return 'entries';
  if (/^\/(notas|mais\/carro|mais\/projetos|mais\/compras)/.test(route)) return 'notes';
  return 'home';
}

/** Telas do perfil (abrem pelo avatar): no menu, acende o perfil, não uma das três seções. */
export const isProfileRoute = (route: string) => /^\/mais(\/(ajustes|compartilhar))?$/.test(route);
