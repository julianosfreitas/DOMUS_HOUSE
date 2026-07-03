'use client';

import * as React from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { Volume2, VolumeX, Monitor, Sun, Moon, LogOut, Check, Trophy, ChevronRight } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/api';
import { isTtsEnabled, setTtsEnabled, speak } from '@/lib/tts';
import { cn } from '@/lib/utils';

/**
 * Menu da conta na topbar: avatar do usuário que abre um painel que "desce" com
 * animação suave. Concentra a conta e seus ajustes — conquistas, fala da
 * assistente, tema e sair.
 */
export function AccountMenu({ onLogout }: { onLogout: () => void }) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  const me = useQuery({ queryKey: ['me'], queryFn: api.me, staleTime: 60_000 });
  const game = useQuery({ queryKey: ['gamification'], queryFn: api.gamification, enabled: open });
  const { theme, setTheme } = useTheme();

  const [ttsOn, setTtsOn] = React.useState(true);

  React.useEffect(() => {
    setTtsOn(isTtsEnabled());
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

  function toggleFala(on: boolean) {
    setTtsOn(on);
    setTtsEnabled(on);
    if (on) speak('Voz da assistente ativada');
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
              {/* Conquistas — gamificação vive aqui (fora da barra principal) */}
              <Link
                href="/conquistas"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-secondary"
              >
                <span className="flex items-center gap-2 text-sm">
                  <Trophy className="h-4 w-4 text-chart-2" />
                  Conquistas
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {game.data ? `${game.data.points} pts` : ''}
                  <ChevronRight className="h-4 w-4" />
                </span>
              </Link>

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
