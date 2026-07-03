'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { MonthlyEnergyPoint } from '@/lib/types';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function label(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTHS[(m ?? 1) - 1]}/${String(y).slice(2)}`;
}

export function MonthlyBars({ months }: { months: MonthlyEnergyPoint[] }) {
  if (months.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Sem dados mensais ainda.</p>;
  }

  const data = months.map((p) => ({ x: label(p.month), kwh: p.kwh }));

  return (
    <>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="x"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--muted-foreground)' }}
          />
          <YAxis
            fontSize={11}
            tickLine={false}
            axisLine={false}
            unit=" kWh"
            width={56}
            tick={{ fill: 'var(--muted-foreground)' }}
          />
          <Tooltip
            cursor={{ fill: 'var(--secondary)' }}
            contentStyle={{
              background: 'var(--popover)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              color: 'var(--popover-foreground)',
            }}
            formatter={(v: number) => [`${v} kWh`, 'Consumo']}
          />
          <Bar dataKey="kwh" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={64} />
        </BarChart>
      </ResponsiveContainer>
      {months.length === 1 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Só há dados de 1 mês (retenção de leituras: 35 dias). O comparativo cresce com o uso.
        </p>
      )}
    </>
  );
}
