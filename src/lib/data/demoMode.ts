/**
 * Entrar e sair da demonstração. Precisa recarregar a página de verdade: o roteador do app (hash)
 * trata "?demo#/" como troca de tela e não reinicia o `store`, então um <a href> comum não funciona.
 * A demonstração roda só na memória do navegador: não lê nem grava nada na conta, mesmo com login feito.
 */
export function enterDemo(newTab = false) {
  const url = `${location.pathname}?demo#/`;
  if (newTab) window.open(url, '_blank', 'noopener');
  else location.assign(url);
}

export function exitDemo() {
  location.assign(`${location.pathname}#/`);
}

/** `?demo&muito`: demonstração pesada (3 anos, ~18 mil lançamentos) para medir o desempenho. Lido ao carregar, antes de o endereço ser limpo. */
export const stressDemo = typeof location !== 'undefined' && new URLSearchParams(location.search).has('demo') && new URLSearchParams(location.search).has('muito');
