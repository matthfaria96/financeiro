/** Escalas e cores dos gráficos (SVG puro, sem biblioteca). */

/** Cores das séries fixas, validadas para daltonismo no fundo escuro (azul, laranja, água). */
/** Cores do app inteiro: entrada sempre verde, saída sempre coral (as mesmas de Lançamentos). account/credit só para separar débito × crédito. */
export const seriesColor = { income: '#22c58b', expense: '#ff6b5b', account: '#3987e5', credit: '#d95926' } as const;
export const surface = '#141b18';
export const gridColor = 'rgba(255,255,255,0.07)';
export const axisColor = 'rgba(255,255,255,0.14)';

/** Teto "redondo" acima do máximo: 1, 2, 2,5 ou 5 × 10ⁿ. */
export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * power >= value)!;
  return step * power;
}

/** Marcas redondas do eixo: passo de 1, 2, 2,5 ou 5 × 10ⁿ, com 3 a 5 intervalos. */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 100];
  const step = niceMax(Math.max(max, 1) / count);
  const steps = Math.max(1, Math.ceil(max / step));
  return Array.from({ length: steps + 1 }, (_, index) => step * index);
}

/** Faixa com folga para valores que também podem ser negativos (saldos). */
export function niceRange(min: number, max: number, count = 4): number[] {
  if (min >= 0) return niceTicks(max, count);
  const span = niceMax((max - Math.min(min, 0)) / count) ;
  const start = Math.floor(min / span) * span;
  const ticks: number[] = [];
  for (let value = start; value <= max + span * 0.999; value += span) ticks.push(value);
  return ticks.length >= 2 ? ticks : [start, start + span];
}

/** Rótulo do eixo: "500", "1,5 mil", "20 mil", "1,2 mi" (sem repetir valores arredondados). */
export function moneyTick(cents: number): string {
  const reais = cents / 100;
  const short = (value: number) => (Math.round(value * 10) / 10).toString().replace('.', ',');
  if (Math.abs(reais) >= 1_000_000) return `${short(reais / 1_000_000)} mi`;
  if (Math.abs(reais) >= 1_000) return `${short(reais / 1_000)} mil`;
  return String(Math.round(reais));
}

/** Barra com o topo arredondado (4 px) e a base reta, como pede o padrão dos gráficos. */
export function columnPath(x: number, y: number, width: number, height: number, radius = 4): string {
  if (height <= 0 || width <= 0) return '';
  const r = Math.min(radius, height, width / 2);
  return `M${x},${y + height}V${y + r}Q${x},${y} ${x + r},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${y + height}Z`;
}

export function rowPath(x: number, y: number, width: number, height: number, radius = 4): string {
  if (height <= 0 || width <= 0) return '';
  const r = Math.min(radius, width, height / 2);
  return `M${x},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${y + height - r}Q${x + width},${y + height} ${x + width - r},${y + height}H${x}Z`;
}
