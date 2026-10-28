/** Explicação ao parar o mouse sobre um controle (título em negrito + frase). No toque, vira rótulo
 *  de acessibilidade. Uso: <button use:hint={['Importar', 'Lê extratos OFX, CSV ou PDF.']}> */
let bubble: HTMLDivElement | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

function show(target: HTMLElement, title: string, detail: string) {
  bubble ??= Object.assign(document.createElement('div'), { className: 'hint-bubble', role: 'tooltip' });
  bubble.innerHTML = '';
  const strong = document.createElement('strong');
  strong.textContent = title;
  bubble.append(strong);
  if (detail) {
    const span = document.createElement('span');
    span.textContent = detail;
    bubble.append(span);
  }
  document.body.append(bubble);
  const rect = target.getBoundingClientRect();
  const box = bubble.getBoundingClientRect();
  let left = Math.min(Math.max(8, rect.left + rect.width / 2 - box.width / 2), innerWidth - box.width - 8);
  let top = rect.bottom + 8;
  if (top + box.height > innerHeight - 8) top = rect.top - box.height - 8;
  bubble.style.left = `${left}px`;
  bubble.style.top = `${top}px`;
  bubble.classList.add('on');
}

function hide() {
  if (timer) clearTimeout(timer);
  timer = null;
  bubble?.classList.remove('on');
}

export function hint(node: HTMLElement, value: [string, string]) {
  let [title, detail] = value;
  node.setAttribute('aria-description', detail || title);
  const enter = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    hide();
    timer = setTimeout(() => show(node, title, detail), 450);
  };
  node.addEventListener('pointerenter', enter);
  node.addEventListener('pointerleave', hide);
  node.addEventListener('pointerdown', hide);
  return {
    update(next: [string, string]) {
      [title, detail] = next;
      node.setAttribute('aria-description', detail || title);
    },
    destroy() {
      hide();
      node.removeEventListener('pointerenter', enter);
      node.removeEventListener('pointerleave', hide);
      node.removeEventListener('pointerdown', hide);
    }
  };
}
