import { fold } from '$lib/core/text';

/** Logos sem chave de API: serviços públicos de ícones pelo domínio. Só o domínio sai do aparelho.
 *  O navegador não deixa ler os pixels dessas imagens (CORS), então guardamos só o LINK (zero peso
 *  no banco; o navegador mantém em cache). A resolução vem de `naturalWidth`, que não precisa de CORS. */
export interface LogoOption {
  url: string;
  source: string;
  pixels: number;
}

export function domainGuesses(text: string): string[] {
  const host = hostOf(text);
  if (host) return [host];
  const slug = fold(text).replace(/[^a-z0-9]/g, '');
  return slug ? [`${slug}.com.br`, `${slug}.com`] : [];
}

export function hostOf(text: string): string | null {
  const cleaned = text.trim().toLowerCase();
  if (!cleaned.includes('.') || cleaned.includes(' ')) return null;
  try {
    const url = new URL(cleaned.includes('://') ? cleaned : `https://${cleaned}`);
    return url.hostname.replace(/^www\./, '') || null;
  } catch {
    return null;
  }
}

export function sources(domain: string): { url: string; source: string }[] {
  const d = encodeURIComponent(domain);
  return [
    { url: `https://www.google.com/s2/favicons?domain=${d}&sz=256`, source: 'Google' },
    { url: `https://icon.horse/icon/${d}`, source: 'icon.horse' },
    { url: `https://icons.duckduckgo.com/ip3/${d}.ico`, source: 'DuckDuckGo' }
  ];
}

/** Carrega a imagem e mede; ícones menores que 48 px (favicons borrados, globo padrão do Google) ficam de fora. */
function probe(url: string, timeout = 8000): Promise<number> {
  return new Promise((resolve) => {
    const image = new Image();
    const timer = setTimeout(() => resolve(0), timeout);
    image.onload = () => {
      clearTimeout(timer);
      resolve(Math.max(image.naturalWidth, image.naturalHeight));
    };
    image.onerror = () => {
      clearTimeout(timer);
      resolve(0);
    };
    image.referrerPolicy = 'no-referrer';
    image.src = url;
  });
}

export async function findLogos(domain: string): Promise<LogoOption[]> {
  const measured = await Promise.all(sources(domain).map(async (s) => ({ ...s, pixels: await probe(s.url) })));
  return measured.filter((o) => o.pixels >= 48).sort((a, b) => b.pixels - a.pixels);
}

/** Melhor logo para a busca automática (sem icon.horse: ele devolve uma letra genérica para site desconhecido). */
export async function bestLogo(domain: string): Promise<LogoOption | null> {
  return (await findLogos(domain)).find((o) => o.pixels >= 64 && o.source !== 'icon.horse') ?? null;
}

/** Foto enviada pelo usuário → no máximo 160 px, WebP (JPEG se o navegador não gravar WebP). Uns 3–10 KB. */
export async function compressImage(file: Blob, maxPixel = 160): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxPixel / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d')!;
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let data = canvas.toDataURL('image/webp', 0.8);
  if (!data.startsWith('data:image/webp')) data = canvas.toDataURL('image/jpeg', 0.8);
  if (data.length > 40_000 && maxPixel > 96) return compressImage(file, 96);
  return data;
}

export const kilobytes = (bytes: number) => (bytes < 1024 ? `${bytes} bytes` : `${Math.round(bytes / 1024)} KB`);
