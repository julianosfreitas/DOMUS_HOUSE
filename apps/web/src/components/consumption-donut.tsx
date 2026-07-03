'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { EnergyDeviceShare } from '@/lib/types';

// Ramp azul da marca em passos NÃO-adjacentes, para separar ao máximo dentro de um
// único matiz. A identidade também vem da legenda + rótulo — nunca só da cor.
const SLICE = ['var(--chart-2)', 'var(--chart-4)', 'var(--chart-1)', 'var(--chart-3)', 'var(--chart-5)'];

export function ConsumptionDonut({ data }: { data: EnergyDeviceShare[] }) {
  const items = data.filter((d) => d.kwh > 0);
  const total = items.reduce((s, d) => s + d.kwh, 0);

  if (items.length === 0 || total <= 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Sem consumo registrado na janela.
      </p>
    );
  }

  const chartData = items.map((d, i) => ({
    name: d.name,
    value: d.kwh,
    color: SLICE[i % SLICE.length],
  }));

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={54}
              outerRadius={78}
              paddingAngle={2}
              strokeWidth={0}
            >
              {chartData.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'var(--popover)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                color: 'var(--popover-foreground)',
              }}
              formatter={(v: number, n) => [`${v} kWh`, n]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-semibold tabular-nums">{total.toFixed(2)}</span>
          <span className="text-[11px] text-muted-foreground">kWh</span>
        </div>
      </div>

      {/* Legenda — identidade por rótulo + cor, com % e valor */}
      <ul className="flex min-w-0 flex-1 flex-col gap-2">
        {chartData.map((d) => (
          <li key={d.name} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: d.color }} />
            <span className="min-w-0 flex-1 truncate">{d.name}</span>
            <span className="tabular-nums text-muted-foreground">
              {((d.value / total) * 100).toFixed(0)}%
            </span>
            <span className="w-20 text-right font-medium tabular-nums">{d.value} kWh</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
