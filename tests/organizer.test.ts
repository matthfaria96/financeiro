import { describe, expect, it } from 'vitest';
import { addMonthsToDay, currentOdometer, fillStats, fuelSummary, maintenanceDue, type FuelFill } from '../src/lib/core/vehicle';
import { duplicateItems, newestFirst, parseItem } from '../src/lib/core/shopping';
import { buildSheet, sheetCSV } from '../src/lib/core/sheet';

const fill = (id: string, date: string, odometer: number | null, liters: number | null, reais: number, full_tank = true): FuelFill =>
  ({ id, date, odometer, liters, amount_cents: Math.round(reais * 100), full_tank });

describe('Carro', () => {
  it('km/L como na planilha: (km − km anterior) ÷ litros', () => {
    const stats = fillStats([fill('a', '2026-04-01', 97_155, 41.02, 176), fill('b', '2026-04-15', 97_354, 35.15, 147.27)]);
    expect(stats.get('a')?.kmPerLiter).toBeNull();
    expect(stats.get('b')?.kmPerLiter).toBeCloseTo(5.661, 3);
    expect(stats.get('b')?.pricePerLiter).toBeCloseTo(4.19, 2);
  });
  it('tanque parcial soma os litros até o próximo cheio', () => {
    const fills = [fill('a', '2026-01-01', 1_000, 40, 200), fill('b', '2026-01-05', 1_150, 10, 50, false), fill('c', '2026-01-10', 1_400, 30, 150)];
    const stats = fillStats(fills);
    expect(stats.get('b')?.kmPerLiter).toBeNull();
    expect(stats.get('c')?.kmPerLiter).toBeCloseTo(400 / 40, 5);
    const summary = fuelSummary(fills);
    expect(summary.distance).toBe(400);
    expect(summary.kmPerLiter).toBeCloseTo(10, 5);
    expect(summary.costPerKm).toBeCloseTo(200 / 400, 5);
  });
  it('sem km informado não quebra', () => {
    expect(fillStats([fill('a', '2026-01-01', null, null, 100)]).get('a')).toEqual({ distance: null, kmPerLiter: null, pricePerLiter: null });
    expect(fuelSummary([]).kmPerLiter).toBeNull();
  });
  it('km atual é o maior registrado', () => {
    expect(currentOdometer(94_350, [{ odometer: 103_195 }, { odometer: null }])).toBe(103_195);
    expect(currentOdometer(null, [])).toBeNull();
  });
  it('revisão vence pelo que chegar primeiro', () => {
    const rule = { every_km: 10_000, every_months: 12, last_km: 95_000, last_date: '2026-01-10' };
    expect(maintenanceDue(rule, 104_200, '2026-06-01')).toMatchObject({ state: 'soon', kmLeft: 800 });
    expect(maintenanceDue(rule, 96_000, '2026-06-01')).toMatchObject({ state: 'ok', dueKm: 105_000, dueDate: '2027-01-10', kmLeft: 9_000 });
    expect(maintenanceDue(rule, 96_000, '2027-01-10').state).toBe('overdue');
    expect(maintenanceDue({ every_km: 10_000, every_months: null, last_km: null, last_date: null }, 96_000, '2026-06-01').state).toBe('unknown');
  });
  it('soma meses sem passar do fim do mês', () => {
    expect(addMonthsToDay('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsToDay('2026-11-15', 3)).toBe('2027-02-15');
  });
});

describe('Lista de compras', () => {
  it('lê a quantidade na frente do item', () => {
    expect(parseItem('2 leite')).toEqual({ name: 'Leite', quantity: '2' });
    expect(parseItem('1,5 kg carne moída')).toEqual({ name: 'Carne moída', quantity: '1,5 kg' });
    expect(parseItem('3x iogurte')).toEqual({ name: 'Iogurte', quantity: '3x' });
    expect(parseItem('pão de forma')).toEqual({ name: 'Pão de forma', quantity: '' });
    expect(parseItem('7 belo')).toEqual({ name: 'Belo', quantity: '7' });
  });
  it('duplicar desmarca tudo e mantém a ordem', () => {
    const copy = duplicateItems([{ name: 'B', quantity: '', sort_order: 2, checked: true }, { name: 'A', quantity: '2', sort_order: 1, checked: true }]);
    expect(copy).toEqual([{ name: 'A', quantity: '2', checked: false, sort_order: 0 }, { name: 'B', quantity: '', checked: false, sort_order: 1 }]);
  });
  it('a mais nova primeiro', () => {
    expect(newestFirst([{ created_at: '2026-10-01T10:00' }, { created_at: '2026-10-20T10:00' }]).map((l) => l.created_at)).toEqual(['2026-10-20T10:00', '2026-10-01T10:00']);
  });
});

describe('Planilha mês a mês', () => {
  it('soma por seção, grupo e subgrupo e calcula o balanço', () => {
    const sheet = buildSheet([
      { month: '2026-09', section: 'income', group: 'salario', sub: 'salario', cents: 500_000 },
      { month: '2026-09', section: 'credit', group: 'alimentacao', sub: 'mercado', cents: 80_000 },
      { month: '2026-09', section: 'credit', group: 'alimentacao', sub: 'ifood', cents: 20_000 },
      { month: '2026-09', section: 'debit', group: 'casa', sub: 'condominio', cents: 99_000 },
      { month: '2026-10', section: 'credit', group: 'carro', sub: 'gasolina', cents: 30_000 },
      { month: '2025-01', section: 'credit', group: 'carro', sub: 'gasolina', cents: 99_999 }
    ], ['2026-09', '2026-10']);
    expect(sheet.sections.credit.total.get('2026-09')).toBe(100_000);
    expect(sheet.sections.credit.children.map((g) => g.key)).toEqual(['alimentacao', 'carro']);
    expect(sheet.sections.credit.children[0].children.map((s) => [s.key, s.sum])).toEqual([['mercado', 80_000], ['ifood', 20_000]]);
    expect(sheet.spent.get('2026-09')).toBe(199_000);
    expect(sheet.balance.get('2026-09')).toBe(301_000);
    expect(sheet.balance.get('2026-10')).toBe(-30_000);
  });
  it('CSV com vírgula decimal', () => {
    expect(sheetCSV(['', 'Set'], [{ label: 'Mercado; feira', values: [123_456] }, { label: 'Vazio', values: [null] }])).toBe('﻿;Set\r\n"Mercado; feira";1234,56\r\nVazio;');
  });
});

import { moneyTick, niceTicks } from '../src/lib/ui/charts/scale';
describe('Eixos dos gráficos', () => {
  it('marcas redondas', () => {
    expect(niceTicks(312_000)).toEqual([0, 100_000, 200_000, 300_000, 400_000]);
    expect(niceTicks(1_750_00)).toEqual([0, 50_000, 100_000, 150_000, 200_000]);
    expect(niceTicks(0)).toEqual([0, 100]);
  });
  it('rótulos sem repetir', () => {
    expect([150_000, 200_000, 50_000, 120_000_000].map(moneyTick)).toEqual(['1,5 mil', '2 mil', '500', '1,2 mi']);
  });
});
