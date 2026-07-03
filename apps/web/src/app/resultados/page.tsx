'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { CircleCheck, Gauge, Mic, Plug, Timer, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

/**
 * Números de MEDIÇÃO DOCUMENTADA / rotulagem manual — não saem de query ao vivo.
 * Fonte: docs/hardware/devices-analysis.md (Tapo, 22/06/2026) e rotulagem manual do
 * corpus de voz. Ficam visualmente separados do "ao vivo" (regra de honestidade da defesa).
 */
const TAPO_ON_MS = 201;
const TAPO_OFF_MS = 332;
const INTENT_ACCURACY = 0.877; // 138 comandos rotulados à mão
const INTENT_N = 138;
const LATENCY_TARGET_MS = 2000; // meta CLAUDE.md §11 (voz→ação < 2s)

function pct(x: number | null | undefined): string {
  if (x == null) return '—';
  return `${(x * 100).toFixed(1).replace('.', ',')}%`;
}
function ms(x: number | null | undefined): string {
  if (x == null) return '—';
  return `${x} ms`;
}

export default function ResultadosPage() {
  const stats = useQuery({ queryKey: ['voice-stats'], queryFn: api.voiceStats });
  const s = stats.data;
  // Só é "vazio" quando a busca teve sucesso e não há linhas — falha de rede/auth
  // cai no ramo de erro, não na mensagem de "sem dados ainda".
  const semDados = stats.isSuccess && (s?.total ?? 0) === 0;

  return (
    <AppShell title="Resultados" subtitle="O que o DOMUS mediu">
      {/* 1 · Voz — agregado ao vivo, direto das linhas persistidas */}
      <section className="mb-8">
        <SectionHead title="Voz · medido ao vivo" badge="ao vivo · banco" tone="live" />
        {stats.isError ? (
          <Card>
            <CardContent className="pt-5 text-sm text-destructive">
              Não foi possível carregar as métricas. Confirme que você está logado e que o hub está no
              ar.
            </CardContent>
          </Card>
        ) : semDados ? (
          <Card>
            <CardContent className="pt-5 text-sm text-muted-foreground">
              Sem comandos de voz ainda. Use a aba <span className="text-foreground">Voz</span> para
              gerar dados — cada comando registra intenção, execução e latência.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Metric icon={<Mic className="h-5 w-5" />} label="Comandos" value={`${s?.total ?? '—'}`} />
              <Metric
                icon={<CircleCheck className="h-5 w-5" />}
                label="Execução ponta-a-ponta"
                value={pct(s?.successRate)}
              />
              <Metric icon={<Timer className="h-5 w-5" />} label="Latência p50" value={ms(s?.latencyP50)} />
              <Metric icon={<Timer className="h-5 w-5" />} label="Latência p95" value={ms(s?.latencyP95)} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Metric icon={<Gauge className="h-5 w-5" />} label="Confiança média" value={pct(s?.avgConfidence)} />
              <Metric icon={<Clock className="h-5 w-5" />} label="Pico (outlier)" value={ms(s?.latencyMax)} />
            </div>

            {/* Latência vs meta de 2s */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Latência voz→ação vs meta ({LATENCY_TARGET_MS / 1000}s)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <LatencyBar label="p50" value={s?.latencyP50 ?? null} target={LATENCY_TARGET_MS} />
                <LatencyBar label="p95" value={s?.latencyP95 ?? null} target={LATENCY_TARGET_MS} />
              </CardContent>
            </Card>
          </>
        )}
      </section>

      {/* 2 · Acurácia de intenção — rotulagem manual (não é query) */}
      <section className="mb-8">
        <SectionHead title="Acurácia de intenção" badge="rotulagem manual" tone="doc" />
        <Card>
          <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="text-4xl font-semibold tabular-nums">{pct(INTENT_ACCURACY)}</span>
              <span className="ml-2 text-sm text-muted-foreground">de {INTENT_N} comandos reais</span>
            </div>
            <p className="max-w-md text-xs text-muted-foreground">
              Rotulada à mão: o banco guarda a intenção <em>interpretada</em>, não a
              intenção-verdade — por isso a acurácia é medição, não query ao vivo. O{' '}
              <span className="text-foreground">índice de confiança</span> acima ≠ acurácia.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* 3 · Controle local — medição pontual de hardware */}
      <section className="mb-8">
        <SectionHead title="Controle local · hardware" badge="medição documentada · 22/06" tone="doc" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Metric icon={<Plug className="h-5 w-5" />} label="Tapo P110 · ligar (KLAP)" value={ms(TAPO_ON_MS)} />
          <Metric icon={<Plug className="h-5 w-5" />} label="Tapo P110 · desligar (KLAP)" value={ms(TAPO_OFF_MS)} />
        </div>
      </section>

      {/* 4 · A coletar — honesto sobre o que ainda falta */}
      <section>
        <SectionHead title="A coletar" badge="pendente" tone="pending" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Pending label="Energia antes/depois" note="Tapo testado sem carga" />
          <Pending label="Custo (BOM)" note="consolidar nota fiscal" />
          <Pending label="Usabilidade (SUS)" note="n = 3–5 usuários" />
        </div>
      </section>

      <p className="mt-8 text-xs text-muted-foreground">
        <span className="text-foreground">Ao vivo</span> = agregado direto das linhas de{' '}
        <code>voice_commands</code>. <span className="text-foreground">Medição</span> = valor aferido
        uma vez e documentado. <span className="text-foreground">Pendente</span> = ainda não
        coletado. Nada é inflado.
      </p>
    </AppShell>
  );
}

function SectionHead({
  title,
  badge,
  tone,
}: {
  title: string;
  badge: string;
  tone: 'live' | 'doc' | 'pending';
}) {
  const tones = {
    live: 'border-chart-2/40 bg-chart-2/10 text-foreground',
    doc: 'border-foreground/25 bg-secondary text-foreground',
    pending: 'border-border bg-transparent text-muted-foreground',
  } as const;
  return (
    <div className="mb-3 flex items-center gap-3">
      <h2 className="font-romario text-xl leading-none tracking-tight">{title}</h2>
      <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-medium', tones[tone])}>
        {badge}
      </span>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 pt-5">
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon}
          {label}
        </span>
        <span className="text-xl font-semibold tabular-nums">{value}</span>
      </CardContent>
    </Card>
  );
}

function LatencyBar({ label, value, target }: { label: string; value: number | null; target: number }) {
  const ok = value != null && value <= target;
  const w = value == null ? 0 : Math.min(100, (value / target) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="w-8 text-xs tabular-nums text-muted-foreground">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
        <div
          className={cn('h-full rounded-full', ok ? 'bg-chart-2' : 'bg-destructive')}
          style={{ width: `${w}%` }}
        />
      </div>
      <span className="w-16 text-right text-xs tabular-nums">{value == null ? '—' : `${value} ms`}</span>
    </div>
  );
}

function Pending({ label, note }: { label: string; note: string }) {
  return (
    <Card className="border-dashed opacity-80">
      <CardContent className="flex flex-col gap-1 pt-5">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{note}</span>
      </CardContent>
    </Card>
  );
}
