'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Zap, Sparkles, Plug, Mic, BarChart3 } from 'lucide-react';
import { GradientBackground } from '@/components/ui/gradient-background';
import { AccountMenu } from '@/components/account-menu';
import { VoiceFab } from '@/components/voice-fab';
import { BrIcon } from '@/components/br-icon';
import { api, getToken, getRefresh, clearTokens } from '@/lib/api';
import { disconnectSocket } from '@/lib/socket';
import { unlockSfx } from '@/lib/sfx';
import { cn } from '@/lib/utils';

// Ordem da nav espelha a narrativa da defesa (slides): a voz (TUCO) abre, depois o
// controle local dos dispositivos, as rotinas, a energia e por fim os resultados medidos.
// Conquistas (gamificação) saiu da barra principal — vive no menu da conta.
const NAV = [
  { href: '/voz', label: 'Voz', icon: Mic },
  { href: '/dispositivos', label: 'Dispositivos', icon: Plug },
  { href: '/rotinas', label: 'Rotinas', icon: Sparkles },
  { href: '/inicio', label: 'Energia', icon: Zap },
  { href: '/resultados', label: 'Resultados', icon: BarChart3 },
] as const;

/** Ícone brasileiro (dingbat) do cabeçalho, por rota — dá identidade e dinâmica. */
function headerIcon(path: string): string {
  if (path.startsWith('/voz')) return 'y'; // arara — a que "fala"
  if (path.startsWith('/inicio')) return '^'; // bandeira — energia/painel
  if (path.startsWith('/dispositivos')) return 'D'; // tucano (marca)
  if (path.startsWith('/rotinas')) return '$'; // sol
  if (path.startsWith('/resultados')) return '5'; // palmeira — resultados medidos
  if (path.startsWith('/conquistas')) return '3'; // troféu
  return 'D';
}

/**
 * Shell autenticado: topbar minimalista (marca · navegação · conta).
 * A conta (avatar) abre o menu com os ajustes (fala, voz, tema, conquistas, sair).
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
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-1 px-2 sm:px-4">
          <Link href="/voz" className="flex shrink-0 items-center gap-2" aria-label="DOMUS — início">
            <Image
              src="/brand/domus-mark.png"
              alt="DOMUS"
              width={44}
              height={44}
              priority
              className="h-11 w-11 object-contain"
            />
            <span className="font-romario hidden text-2xl leading-none tracking-tight sm:inline">
              DOMUS
            </span>
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
                  <span className="font-romario hidden text-base leading-none lg:inline">{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <AccountMenu onLogout={() => void logout()} />
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-6 sm:px-6 md:pb-10">
        <div className="mb-6 flex items-center gap-3">
          <BrIcon
            c={headerIcon(pathname)}
            className="shrink-0 text-4xl text-muted-foreground/60 sm:text-5xl"
          />
          <div className="min-w-0">
            <h1 className="font-romario truncate text-3xl leading-none tracking-tight sm:text-4xl">
              {title}
            </h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {children}
      </main>

      {/* FAB de voz global — oculto na própria /voz, onde o assistente já captura
          o microfone continuamente (dois getUserMedia na mesma tela = conflito). */}
      {pathname !== '/voz' && <VoiceFab className="bottom-6" />}
    </div>
  );
}
