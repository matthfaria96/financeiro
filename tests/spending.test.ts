import { describe, expect, it } from 'vitest';
import { averageOfMonthsWithData, seasonalForecast } from '../src/lib/core/forecast';

describe('média só dos meses com dados', () => {
  it('divide pelos meses que tiveram gasto, não por 6', () => {
    expect(averageOfMonthsWithData([0, 0, 0, 0, 20_000, 30_000])).toEqual({ cents: 25_000, months: 2 });
  });
  it('usa no máximo os 6 meses mais recentes', () => {
    expect(averageOfMonthsWithData([90_000, 10_000, 10_000, 10_000, 10_000, 10_000, 10_000]).cents).toBe(10_000);
  });
  it('sem nenhum mês com gasto, não inventa média', () => {
    expect(averageOfMonthsWithData([0, 0, 0])).toEqual({ cents: 0, months: 0 });
  });
});

describe('previsão dos sazonais', () => {
  it('vale a média quando o cartão já comprometido é menor', () => {
    expect(seasonalForecast({ cents: 80_000, months: 3 }, 30_000)).toEqual({ cents: 80_000, basis: 'average' });
  });
  it('vale o que já está na fatura quando passa da média', () => {
    expect(seasonalForecast({ cents: 80_000, months: 3 }, 120_000)).toEqual({ cents: 120_000, basis: 'committed' });
  });
});
