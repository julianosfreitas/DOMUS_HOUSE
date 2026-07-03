'use client';

import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Zap, Gauge, TrendingUp, Plug, CalendarDays, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppShell } from '@/components/app-shell';
import { EnergyChart } from '@/components/energy-chart';
import { ConsumptionDonut } from '@/components/consumption-donut';
import { MonthlyBars } from '@/components/monthly-bars';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useDeviceSync } from '@/lib/use-device-sync';
import { cn, formatBRL } from '@/lib/utils';
import type { EnergyGranularity, EnergyPeriod } from '@/lib/types';

const PERIODS: { key: EnergyPeriod; label: string }[] = [
  { key: '24h', label: '24 horas' },
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
];

// Granularidade por período: minutos nas 24h (definição fina), horas em 7d, dias em 30d.
const GRAN: Record<EnergyPeriod, EnergyGranularity> = { '24h': 'minute', '7d': 'hour', '30d': 'day' };

export default function EnergiaPage() {
  const qc = useQueryClient();
  const [period, setPeriod] = React.useState<EnergyPeriod>('24h');
  const granularity = GRAN[period];

  const summary = useQuery({ queryKey: ['energy'], queryFn: api.energySummary });
  const home = useQuery({
    queryKey: ['energy-home-history', period],
    queryFn: () => api.energyHistoryHome(period, granularity),
  });
  const monthly = useQuery({ queryKey: ['energy-monthly'], queryFn: api.energyMonthly });

  useDeviceSync();

  // Tempo real: cada leitura refresca resumo, histórico e comparativo.
  React.useEffect(() => {
    const socket = getSocket();
    const refresh = () => {
      void qc.invalidateQueries({ queryKey: ['energy'] });
      void qc.invalidateQueries({ queryKey: ['energy-home-history'] });
      void qc.invalidateQueries({ queryKey: ['energy-monthly'] });
    };
    socket.on('energy:reading', refresh);
    return () => {
      socket.off('energy:reading', refresh);
    };
  }, [qc]);

  const byDevice = home.data?.byDevice ?? [];
  const months = monthly.data?.months ?? [];
  const delta =
    months.length >= 2
      ? ((months[months.length - 1].kwh - months[months.length - 2].kwh) /
          (months[months.length - 2].kwh || 1)) *
        100
      : null;

  return (
    <AppShell title="Energia" subtitle="Consumo da casa inteira em tempo real">
      {/* Resumo da casa (todas as conexões somadas) */}
      <section className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={<Gauge className="h-4 w-4" />} label="Agora" value={`${summary.data?.totalWatts ?? 0} W`} />
        <StatCard icon={<Zap className="h-4 w-4" />} label="Hoje" value={`${summary.data?.kwhToday ?? 0} kWh`} />
        <StatCard icon={<Wallet className="h-4 w-4" />} label="Custo hoje" value={formatBRL(summary.data?.costToday ?? 0)} />
        <StatCard icon={<CalendarDays className="h-4 w-4" />} label="Mês" value={`${summary.data?.kwhMonth ?? 0} kWh`} />
        <StatCard icon={<Wallet className="h-4 w-4" />} label="Custo mês" value={formatBRL(summary.data?.costMonth ?? 0)} />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Projeção mês" value={formatBRL(summary.data?.projectedMonthlyCost ?? 0)} />
      </section>

      {/* Série temporal com seletor de período */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle>Consumo da casa</CardTitle>
          <PeriodTabs value={period} onChange={setPeriod} />
        </CardHeader>
        <CardContent>
          <EnergyChart buckets={home.data?.buckets ?? []} granularity={granularity} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Participação de cada conexão no total (donut) */}
        <Card>
          <CardHeader>
            <CardTitle>Por conexão · {PERIODS.find((p) => p.key === period)?.label}</CardTitle>
          </CardHeader>
          <CardContent>
            {home.isLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Carregando…</p>
            ) : (
              <ConsumptionDonut data={byDevice} />
            )}
          </CardContent>
        </Card>

        {/* Comparativo entre meses (barras) */}
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle>Comparativo mensal</CardTitle>
            {delta != null && (
              <span className="text-xs text-muted-foreground">
                vs mês anterior:{' '}
                <span className="font-medium text-foreground tabular-nums">
                  {delta >= 0 ? '+' : ''}
                  {delta.toFixed(0)}%
                </span>
              </span>
            )}
          </CardHeader>
          <CardContent>
            {monthly.isLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Carregando…</p>
            ) : (
              <MonthlyBars months={months} />
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function PeriodTabs({ value, onChange }: { value: EnergyPeriod; onChange: (p: EnergyPeriod) => void }) {
  return (
    <div className="inline-flex rounded-lg border bg-card p-0.5">
      {PERIODS.map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={() => onChange(p.key)}
          className={cn(
            'rounded-md px-3 py-1 text-xs font-medium transition-colors',
            value === p.key
              ? 'bg-secondary text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 pt-5">
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon}
          {label}
        </span>
        <span className="text-lg font-semibold tabular-nums">{value}</span>
      </CardContent>
    </Card>
  );
}
