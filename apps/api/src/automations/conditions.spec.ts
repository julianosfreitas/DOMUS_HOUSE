import { evaluateConditions } from './conditions';
import type { AutomationConditionDto } from './automation.types';

// Datas fixas (horário local). 2026-06-01 é uma segunda-feira (getDay()=1).
const monday10 = new Date(2026, 5, 1, 10, 0, 0);
const monday23 = new Date(2026, 5, 1, 23, 0, 0);
const monday03 = new Date(2026, 5, 1, 3, 0, 0);

describe('evaluateConditions', () => {
  it('sem condições → sempre verdadeiro', () => {
    expect(evaluateConditions([], monday10)).toBe(true);
  });

  it('TIME_RANGE no mesmo dia', () => {
    const c: AutomationConditionDto[] = [{ type: 'TIME_RANGE', start: '09:00', end: '18:00' }];
    expect(evaluateConditions(c, monday10)).toBe(true);
    expect(evaluateConditions(c, monday23)).toBe(false);
  });

  it('TIME_RANGE cruzando a meia-noite (22:00 → 06:00)', () => {
    const c: AutomationConditionDto[] = [{ type: 'TIME_RANGE', start: '22:00', end: '06:00' }];
    expect(evaluateConditions(c, monday23)).toBe(true);
    expect(evaluateConditions(c, monday03)).toBe(true);
    expect(evaluateConditions(c, monday10)).toBe(false);
  });

  it('WEEKDAY casa o dia da semana', () => {
    expect(evaluateConditions([{ type: 'WEEKDAY', weekdays: [1] }], monday10)).toBe(true);
    expect(evaluateConditions([{ type: 'WEEKDAY', weekdays: [0, 6] }], monday10)).toBe(false);
  });

  it('combina condições com E lógico', () => {
    const c: AutomationConditionDto[] = [
      { type: 'WEEKDAY', weekdays: [1] },
      { type: 'TIME_RANGE', start: '09:00', end: '12:00' },
    ];
    expect(evaluateConditions(c, monday10)).toBe(true);
    expect(evaluateConditions(c, monday23)).toBe(false);
  });
});
