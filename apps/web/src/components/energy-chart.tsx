'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { EnergyBucket } from '@/lib/types';

export function EnergyChart({ buckets }: { buckets: EnergyBucket[] }) {
  const data = buckets.map((b) => ({
    hora: new Date(b.bucket).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    watts: b.avgWatts,
  }));

  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
        Sem leituras de energia ainda.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={224}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="wattsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.5} />
            <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="hora" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis fontSize={11} tickLine={false} axisLine={false} unit="W" />
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
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
