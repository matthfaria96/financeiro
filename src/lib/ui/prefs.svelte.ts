/**
 * Preferências deste aparelho. `full` = visão completa (painéis de previsão, Mês a mês e calendário de contas
 * fixas no menu, contas no menu, filtros extras). Padrão: visão simples — poucas telas, cada uma com uma pergunta.
 */
const KEY = 'financeiro.visao-completa';

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

class Prefs {
  full = $state(typeof localStorage === 'undefined' ? false : read());

  setFull(on: boolean) {
    this.full = on;
    try {
      localStorage.setItem(KEY, on ? '1' : '0');
    } catch {
      // aba privada: vale até fechar
    }
  }
}

export const prefs = new Prefs();
