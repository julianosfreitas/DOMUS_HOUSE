'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { Volume2, VolumeX, Monitor, Sparkles, Sun, Moon, LogOut, Check } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/api';
import {
  getTtsEngine,
  setTtsEngine,
  getTtsProfile,
  setTtsProfile,
  isTtsEnabled,
  setTtsEnabled,
  speak,
  type TtsEngine,
} from '@/lib/tts';
import { cn } from '@/lib/utils';

/**
 * Menu da conta na topbar: avatar do usuário que abre um painel que "desce" com
 * animação suave. Concentra os ajustes de manutenção da conta — fala da assistente,
 * motor de voz (navegador/Voicebox), tema e sair.
 */
export function AccountMenu({ onLogout }: { onLogout: () => void }) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  const me = useQuery({ queryKey: ['me'], queryFn: api.me, staleTime: 60_000 });
  const status = useQuery({ queryKey: ['tts-status'], queryFn: api.ttsStatus, staleTime: 30_000, enabled: open });
  const { theme, setTheme } = useTheme();

  const [ttsOn, setTtsOn] = React.useState(true);
  const [engine, setEngine] = React.useState<TtsEngine>('browser');
  const [profile, setProfile] = React.useState<string | null>(null);

  React.useEffect(() => {
    setTtsOn(isTtsEnabled());
    setEngine(getTtsEngine());
    setProfile(getTtsProfile());
  }, [open]);

  // Fecha ao clicar fora ou apertar Esc.
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const email = me.data?.email ?? '';
  const initial = (me.data?.name ?? email ?? 'U').trim().charAt(0).toUpperCase() || 'U';
  const available = status.data?.available ?? false;
  const profiles = status.data?.profiles ?? [];

  function toggleFala(on: boolean) {
    setTtsOn(on);
    setTtsEnabled(on);
    if (on) speak('Voz da assistente ativada');
  }
  function chooseEngine(e: TtsEngine) {
    if (e === 'voicebox' && !available) return;
    setEngine(e);
    setTtsEngine(e);
  }

  const THEMES: { key: string; label: string; icon: React.ReactNode }[] = [
    { key: 'light', label: 'Claro', icon: <Sun className="h-4 w-4" /> },
    { key: 'dark', label: 'Escuro', icon: <Moon className="h-4 w-4" /> },
    { key: 'system', label: 'Sistema', icon: <Monitor className="h-4 w-4" /> },
  ];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Conta e configurações"
        aria-expanded={open}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground ring-offset-background transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        {initial}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.25, 1, 0.5, 1] }}
            className="absolute right-0 top-full z-50 mt-2 w-72 origin-top-right overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg"
          >
            {/* Cabeçalho — usuário */}
            <div className="flex items-center gap-3 border-b p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {initial}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{me.data?.name ?? 'Você'}</p>
                <p className="truncate text-xs text-muted-foreground">{email || '—'}</p>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-2">
              {/* Fala da assistente */}
              <div className="flex items-center justify-between gap-3 rounded-lg px-2 py-2">
                <span className="flex items-center gap-2 text-sm">
                  {ttsOn ? (
                    <Volume2 className="h-4 w-4 text-chart-2" />
                  ) : (
                    <VolumeX className="h-4 w-4 text-muted-foreground" />
                  )}
                  Fala da assistente
                </span>
                <Switch checked={ttsOn} onCheckedChange={toggleFala} aria-label="Fala da assistente" />
              </div>

              {/* Motor de voz */}
              <p className="px-2 pt-2 text-xs font-medium text-muted-foreground">Voz da assistente</p>
              <div className="grid grid-cols-2 gap-2 p-2">
                <EngineOption
                  active={engine === 'browser'}
                  onClick={() => chooseEngine('browser')}
                  icon={<Monitor className="h-4 w-4" />}
                  title="Navegador"
                  subtitle="pt-BR"
                />
                <EngineOption
                  active={engine === 'voicebox'}
                  onClick={() => chooseEngine('voicebox')}
                  icon={<Sparkles className="h-4 w-4 text-chart-2" />}
                  title={available ? 'Voicebox' : 'Voicebox'}
                  subtitle={available ? 'voz local' : 'offline'}
                  dim={!available}
                />
              </div>
              {engine === 'voicebox' && available && (
                <select
                  value={profile ?? ''}
                  onChange={(e) => {
                    setProfile(e.target.value);
                    setTtsProfile(e.target.value);
                  }}
                  className="mx-2 mb-1 w-[calc(100%-1rem)] rounded-md border border-input bg-transparent px-2 py-1.5 text-sm"
                >
                  <option value="" disabled>
                    Selecione uma voz…
                  </option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}

              {/* Tema */}
              <p className="px-2 pt-2 text-xs font-medium text-muted-foreground">Tema</p>
              <div className="grid grid-cols-3 gap-2 p-2">
                {THEMES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTheme(t.key)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-md border p-2 text-xs transition-colors',
                      theme === t.key
                        ? 'border-chart-2 bg-secondary'
                        : 'border-input hover:bg-secondary',
                    )}
                  >
                    {t.icon}
                    {t.label}
                    {theme === t.key && <Check className="h-3 w-3 text-chart-2" />}
                  </button>
                ))}
              </div>

              {/* Sair */}
              <div className="mt-1 border-t p-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onLogout();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-destructive transition-colors hover:bg-secondary"
                >
                  <LogOut className="h-4 w-4" />
                  Sair da conta
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EngineOption({
  active,
  onClick,
  icon,
  title,
  subtitle,
  dim,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  dim?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-start gap-0.5 rounded-md border p-2 text-left transition-colors',
        active ? 'border-chart-2 bg-secondary' : 'border-input hover:bg-secondary',
        dim && 'opacity-60',
      )}
    >
      <span className="flex items-center gap-1.5 text-sm font-medium">
        {icon}
        {title}
      </span>
      <span className="text-xs text-muted-foreground">{subtitle}</span>
    </button>
  );
}
