'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * TUCO — mascote tucano do assistente de voz. Máquina de 4 estados ligada ao ciclo
 * de reconhecimento:
 *   entrada  → voa da esquerda e pousa no centro (só ao montar)
 *   escutando→ parado no centro, respirando (repouso padrão)
 *   entendeu → voa feliz pra cima (bico aberto na arte) + faíscas, depois volta a escutar
 *   cabisbaixo→ abaixa a cabeça (lágrima já na arte), depois volta a escutar
 *
 * Assets (PNG transparente): /tuco/1_parado.png, /tuco/2_feliz.png,
 * /tuco/3_cabisbaixo.png. Fallback: tucano do emblema, se algum faltar.
 */
export type TucoState = 'escutando' | 'entendeu' | 'cabisbaixo';

const POSE: Record<TucoState, string> = {
  escutando: '/tuco/1_parado.png',
  entendeu: '/tuco/2_feliz.png',
  cabisbaixo: '/tuco/3_cabisbaixo.png',
};

export function TucoMascot({ state, className }: { state: TucoState; className?: string }) {
  // Deslocamento por estado (só entendeu/cabisbaixo saem do centro).
  const target =
    state === 'entendeu'
      ? { y: -24, scale: 1.05, rotate: 0 }
      : state === 'cabisbaixo'
        ? { y: 8, scale: 0.99, rotate: 0 }
        : { y: 0, scale: 1, rotate: 0 };

  return (
    <div className={cn('relative grid place-items-center', className)}>
      <motion.div
        // Entrada: voa rápido da esquerda ao montar, desacelerando ao pousar.
        initial={{ x: -130, y: -44, opacity: 0, rotate: -10 }}
        animate={{ x: 0, opacity: 1, ...target }}
        transition={{
          x: { duration: 0.7, ease: [0.2, 0.9, 0.25, 1] },
          rotate: { duration: 0.6, ease: [0.2, 0.9, 0.25, 1] },
          y: {
            duration: state === 'entendeu' ? 0.45 : 0.4,
            ease: state === 'entendeu' ? [0.2, 0.9, 0.25, 1] : 'easeOut',
          },
          opacity: { duration: 0.4 },
          default: { duration: 0.4, ease: 'easeOut' },
        }}
      >
        {/* Respiração no repouso; flutuar quando feliz. Caixa de tamanho fixo para o
            crossfade entre poses (imagens empilhadas em absoluto). */}
        <div
          className={cn(
            'relative h-32 w-32 sm:h-40 sm:w-40',
            state === 'escutando' && 'animate-tuco-breathe',
            state === 'entendeu' && 'animate-tuco-hover',
          )}
        >
          <AnimatePresence initial={false}>
            <motion.img
              key={state}
              src={POSE[state]}
              alt="TUCO"
              draggable={false}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/brand/domus-mark.png';
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 h-full w-full select-none object-contain drop-shadow-md"
            />
          </AnimatePresence>
        </div>
      </motion.div>

      {state === 'entendeu' && <Sparkles />}
    </div>
  );
}

/** Faíscas subindo quando o TUCO entende o comando. */
function Sparkles() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.span
          key={i}
          className="absolute left-1/2 top-1/2 text-sm text-chart-2"
          initial={{ opacity: 0, x: 0, y: 0, scale: 0.5 }}
          animate={{ opacity: [0, 1, 0], x: (i - 2) * 24, y: -46 - (i % 2) * 16, scale: 1 }}
          transition={{ duration: 1.1, delay: i * 0.09, ease: 'easeOut', repeat: Infinity, repeatDelay: 0.5 }}
        >
          ✦
        </motion.span>
      ))}
    </div>
  );
}
