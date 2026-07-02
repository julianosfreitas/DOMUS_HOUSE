'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import { useDeviceSync } from '@/lib/use-device-sync';
import { DeviceRow } from './_shared';

export default function DevicesPage() {
  const qc = useQueryClient();
  useDeviceSync(); // novos dispositivos / mudanças aparecem em tempo real
  const devices = useQuery({ queryKey: ['devices'], queryFn: api.devices });

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteDevice(id),
    onSuccess: () => {
      toast.success('Dispositivo removido');
      void qc.invalidateQueries({ queryKey: ['devices'] });
    },
    onError: (e) => toast.error(e.message),
  });

  const test = useMutation({
    // Leitura de estado (NÃO liga/desliga o aparelho) — só verifica se responde.
    mutationFn: (id: string) => api.testConnection(id),
    onSuccess: (state) => {
      toast.success(`Conexão OK — o dispositivo está ${state.on ? 'LIGADO' : 'DESLIGADO'}.`);
      void qc.invalidateQueries({ queryKey: ['devices'] });
    },
    onError: (e) => {
      toast.error(
        `${e.message}. Verifique se está ligado, na mesma rede Wi-Fi 2.4GHz e com a local_key/credenciais corretas.`,
      );
      void qc.invalidateQueries({ queryKey: ['devices'] });
    },
  });

  const isEmpty = devices.data?.length === 0;

  return (
    <AppShell title="Dispositivos" subtitle="Seus aparelhos conectados">
      <div className="mb-4 flex justify-end">
        <Button asChild className="w-full sm:w-auto">
          <Link href="/dispositivos/add">
            <Plus className="mr-1 h-4 w-4" />
            Adicionar dispositivo
          </Link>
        </Button>
      </div>

      <section className="flex flex-col gap-3">
        {devices.isLoading && <p className="text-muted-foreground">Carregando…</p>}

        {isEmpty && (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">Nenhum dispositivo cadastrado ainda.</p>
            <Button asChild className="mt-3">
              <Link href="/dispositivos/add">
                <Plus className="mr-1 h-4 w-4" />
                Conectar meu primeiro dispositivo
              </Link>
            </Button>
          </div>
        )}

        {!!devices.data?.length && (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-muted-foreground" />não testado
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-chart-2" />online
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-destructive" />offline
            </span>
            <span className="text-muted-foreground/80">
              · &quot;Testar&quot; verifica a conexão (não liga o aparelho)
            </span>
          </p>
        )}

        {devices.data?.map((d) => (
          <DeviceRow
            key={d.id}
            device={d}
            onTest={() => test.mutate(d.id)}
            testing={test.isPending && test.variables === d.id}
            onRemove={() => {
              if (window.confirm(`Remover "${d.name}"?`)) remove.mutate(d.id);
            }}
          />
        ))}
      </section>
    </AppShell>
  );
}
