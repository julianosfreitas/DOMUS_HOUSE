'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Home, Sparkles, Plug, Trophy, Mic } from 'lucide-react';
import { GradientBackground } from '@/components/ui/gradient-background';
import { AccountMenu } from '@/components/account-menu';
import { VoiceFab } from '@/components/voice-fab';
import { api, getToken, getRefresh, clearTokens } from '@/lib/api';
import { disconnectSocket } from '@/lib/socket';
import { unlockSfx } from '@/lib/sfx';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/voz', label: 'Voz', icon: Mic },
  { href: '/inicio', label: 'Início', icon: Home },
  { href: '/dispositivos', label: 'Dispositivos', icon: Plug },
  { href: '/rotinas', label: 'Rotinas', icon: Sparkles },
  { href: '/conquistas', label: 'Conquistas', icon: Trophy },
] as const;

/**
 * Shell autenticado: topbar minimalista (marca · navegação · nível · conta).
 * A conta (avatar) abre o menu com os ajustes (fala, voz, tema, sair).
 */
export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
    } else {
      setReady(true);
    }
  }, [router]);

  const game = useQuery({ queryKey: ['gamification'], queryFn: api.gamification, enabled: ready });

  // Destrava o áudio (earcons de voz) no 1º gesto — necessário no mobile (iOS/Android),
  // onde autoplay é bloqueado fora de um toque. Uma vez só, em qualquer página.
  React.useEffect(() => {
    const onFirst = () => unlockSfx();
    window.addEventListener('pointerdown', onFirst, { once: true });
    window.addEventListener('touchstart', onFirst, { once: true });
    return () => {
      window.removeEventListener('pointerdown', onFirst);
      window.removeEventListener('touchstart', onFirst);
    };
  }, []);

  async function logout() {
    const refreshToken = getRefresh();
    if (refreshToken) {
      try {
        await api.signOut(refreshToken);
      } catch {
        // ignora — limpamos a sessão local de qualquer forma
      }
    }
    clearTokens();
    disconnectSocket();
    router.replace('/login');
  }

  if (!ready) return null;

  return (
    <div className="relative flex min-h-dvh flex-col">
      {/* Fundo aurora (mesmo da tela de login) — base sólida + blobs suaves atrás do conteúdo. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-background">
        <div className="absolute inset-0 opacity-60">
          <GradientBackground />
        </div>
      </div>

      {/* Topbar */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-12 w-full max-w-5xl items-center gap-1 px-2 sm:px-4">
          <Link href="/voz" className="flex shrink-0 items-center gap-2" aria-label="DOMUS — início">
            <Image
              src="/brand/domus-emblem.png"
              alt="DOMUS"
              width={26}
              height={33}
              priority
              className="h-8 w-auto"
            />
            <span className="hidden text-sm font-bold tracking-tight lg:inline">DOMUS</span>
          </Link>

          <nav className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-label={label}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )}
                >
                  <Icon className={cn('h-[18px] w-[18px] shrink-0', active && 'text-chart-2')} />
                  <span className="hidden lg:inline">{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            {game.data && (
              <Link
                href="/conquistas"
                className="hidden items-center gap-1 rounded-full border bg-card px-2.5 py-1 text-xs lg:inline-flex"
              >
                <Trophy className="h-3.5 w-3.5 text-chart-2" />
                {game.data.points}
              </Link>
            )}
            <AccountMenu onLogout={() => void logout()} />
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-6 sm:px-6 md:pb-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {children}
      </main>

      {/* FAB de voz global */}
      <VoiceFab className="bottom-6" />
    </div>
  );
}
