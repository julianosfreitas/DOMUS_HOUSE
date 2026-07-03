'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { EnergyBucket, EnergyGranularity } from '@/lib/types';

function fmtAxis(bucket: string, g: EnergyGranularity): string {
  const d = new Date(bucket);
  const p2 = (n: number) => String(n).padStart(2, '0');
  // 'hour' cobre vários dias (7d) → inclui a data pra não repetir "12:00" a cada dia.
  if (g === 'day') return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}`;
  if (g === 'hour') return `${p2(d.getDate())}/${p2(d.getMonth() + 1)} ${p2(d.getHours())}h`;
  return `${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

/**
 * Área da potência da casa ao longo do tempo. `granularity` controla o rótulo do
 * eixo X (hh:mm para minuto/hora, dd/mm para dia) e o `minTickGap` afina os ticks
 * quando há muitos pontos (ex.: 1440 baldes de 1 min nas últimas 24h).
 */
export function EnergyChart({
  buckets,
  granularity = 'hour',
}: {
  buckets: EnergyBucket[];
  granularity?: EnergyGranularity;
}) {
  const data = buckets.map((b) => ({ x: fmtAxis(b.bucket, granularity), watts: b.avgWatts }));

  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
        Sem leituras de energia ainda.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="wattsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.5} />
            <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="x"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          minTickGap={40}
          interval="preserveStartEnd"
          tick={{ fill: 'var(--muted-foreground)' }}
        />
        <YAxis
          fontSize={11}
          tickLine={false}
          axisLine={false}
          unit="W"
          tick={{ fill: 'var(--muted-foreground)' }}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--popover)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            color: 'var(--popover-foreground)',
          }}
          formatter={(v: number) => [`${v} W`, 'Potência']}
        />
        <Area
          type="monotone"
          dataKey="watts"
          stroke="var(--chart-2)"
          strokeWidth={2}
          fill="url(#wattsFill)"
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
