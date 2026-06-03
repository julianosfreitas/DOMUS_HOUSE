import type { AutomationConditionDto } from './automation.types';

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** Verifica se `now` está dentro da faixa [start,end], tratando virada de meia-noite. */
function inTimeRange(now: Date, start?: string, end?: string): boolean {
  if (!start || !end) {
    return true;
  }
  const cur = now.getHours() * 60 + now.getMinutes();
  const s = toMinutes(start);
  const e = toMinutes(end);
  return s <= e ? cur >= s && cur <= e : cur >= s || cur <= e;
}

/**
 * Avalia todas as condições (E lógico). Sem condições → sempre verdadeiro.
 */
export function evaluateConditions(conditions: AutomationConditionDto[], now: Date): boolean {
  return conditions.every((c) => {
    if (c.type === 'TIME_RANGE') {
      return inTimeRange(now, c.start, c.end);
    }
    if (c.type === 'WEEKDAY') {
      return !c.weekdays || c.weekdays.length === 0 || c.weekdays.includes(now.getDay());
    }
    return true;
  });
}
