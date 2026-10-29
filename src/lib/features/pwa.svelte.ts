/**
 * O app instalado no celular (PWA): instalar, saber se já está instalado, receber extratos pelo "Compartilhar"
 * (Android) ou abrindo o arquivo (computador), selo no ícone, vibração leve e aviso de sem internet.
 */
interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const SHARED_CACHE = 'financeiro-recebidos';

class Pwa {
  /** Aberto como app (ícone na tela de início), não numa aba do navegador. */
  standalone = $state(false);
  online = $state(true);
  /** Android/Chrome: o convite de instalação que o navegador guardou para usarmos no botão. */
  installEvent = $state<InstallPrompt | null>(null);
  readonly ios = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent) || (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  readonly mobile = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

  get canInstall() {
    return !this.standalone && (!!this.installEvent || this.ios);
  }

  start(onFiles: (files: File[]) => void) {
    const standalone = matchMedia('(display-mode: standalone)');
    this.standalone = standalone.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    standalone.addEventListener('change', (e) => (this.standalone = e.matches));
    this.online = navigator.onLine;
    addEventListener('online', () => (this.online = true));
    addEventListener('offline', () => (this.online = false));
    addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.installEvent = event as InstallPrompt;
    });
    addEventListener('appinstalled', () => (this.installEvent = null));
    // iPhone: impede o zoom automático ao tocar num campo (o pinça continua funcionando no iOS).
    if (this.ios) document.querySelector('meta[name=viewport]')?.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover');
    // Pede ao navegador para não apagar o cache local (a cópia offline dos dados) quando faltar espaço.
    void navigator.storage?.persist?.().catch(() => {});
    // Computador (app instalado): abrir um .ofx/.csv/.pdf com o Financeiro já começa a importação.
    const queue = (window as unknown as { launchQueue?: { setConsumer(cb: (p: { files: FileSystemFileHandle[] }) => void): void } }).launchQueue;
    queue?.setConsumer(async ({ files }) => {
      if (!files?.length) return;
      onFiles(await Promise.all(files.map((handle) => handle.getFile())));
    });
  }

  async install() {
    const event = this.installEvent;
    if (!event) return false;
    await event.prompt();
    const { outcome } = await event.userChoice;
    this.installEvent = null;
    return outcome === 'accepted';
  }

  /** Arquivos que chegaram pelo "Compartilhar" do Android (o service worker guarda; aqui lemos e apagamos). */
  async takeShared(): Promise<File[]> {
    if (typeof caches === 'undefined') return [];
    const cache = await caches.open(SHARED_CACHE);
    const keys = await cache.keys();
    const files: File[] = [];
    for (const key of keys) {
      const response = await cache.match(key);
      if (!response) continue;
      const name = decodeURIComponent(response.headers.get('x-name') ?? 'extrato');
      files.push(new File([await response.blob()], name, { type: response.headers.get('content-type') ?? '' }));
      await cache.delete(key);
    }
    return files;
  }

  /** Número no ícone do app (contas vencidas ou que vencem hoje). Zero tira o selo. */
  badge(count: number) {
    const nav = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    if (!nav.setAppBadge) return;
    void (count > 0 ? nav.setAppBadge(count) : nav.clearAppBadge?.())?.catch(() => {});
  }
}

export const pwa = new Pwa();

/**
 * Toque com resposta física: vibração curta no Android; no iPhone (iOS 18+) usa o interruptor nativo escondido,
 * que dispara o "tique" do sistema. Em aparelhos sem suporte, não faz nada.
 */
export function haptic() {
  if (typeof navigator === 'undefined' || !pwa.mobile) return;
  if (navigator.vibrate) return void navigator.vibrate(8);
  const label = document.createElement('label');
  label.setAttribute('aria-hidden', 'true');
  label.style.display = 'none';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  label.append(input);
  document.body.append(label);
  label.click();
  label.remove();
}
