'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Mic, MicOff, Loader2, Check, X } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import { speak } from '@/lib/tts';
import { playSfx, preloadSfx, unlockSfx } from '@/lib/sfx';
import { cn } from '@/lib/utils';
import type { VoiceResult } from '@/lib/types';

/**
 * Assistente de voz mãos-livres (mobile-first). Ao abrir, começa a escutar; detecta
 * quando você termina de falar (silêncio) e executa sozinho. Sem pop-ups: o retorno
 * é por animação inline (entendido = verde ✓, erro = vermelho ✗) e contraste segue o
 * tema. Toque no círculo pausa/retoma (ou concede o microfone no celular).
 */
type VState = 'init' | 'blocked' | 'idle' | 'listening' | 'speech' | 'processing' | 'success' | 'error';

const SPEECH_THRESHOLD = 0.045; // RMS acima disso = fala
const SILENCE_MS = 1100; // silêncio após falar → encerra e envia
const MAX_MS = 9000; // teto de um comando
const NO_SPEECH_MS = 14000; // sem falar por muito tempo → pausa (economiza mic)

export default function VozPage() {
  const qc = useQueryClient();
  const [state, setState] = React.useState<VState>('init');
  const [last, setLast] = React.useState<VoiceResult | null>(null);
  const [blockedMsg, setBlockedMsg] = React.useState('');

  const mounted = React.useRef(true);
  const activeRef = React.useRef(false);
  const streamRef = React.useRef<MediaStream | null>(null);
  const ctxRef = React.useRef<AudioContext | null>(null);
  const recRef = React.useRef<MediaRecorder | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const ringRef = React.useRef<HTMLDivElement>(null);
  const startListenRef = React.useRef<() => void>(() => {});

  const cleanupAudio = React.useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (ctxRef.current && ctxRef.current.state !== 'closed') void ctxRef.current.close();
    ctxRef.current = null;
    recRef.current = null;
    activeRef.current = false;
    if (ringRef.current) ringRef.current.style.transform = 'scale(1)';
  }, []);

  const process = React.useCallback(
    async (blob: Blob) => {
      if (!mounted.current) return;
      setState('processing');
      try {
        const res = await api.voiceCommandAudio(blob);
        if (!mounted.current) return;
        setLast(res);
        if (res.executed) {
          setState('success');
          playSfx('done'); // earcon de sucesso
          speak(`Comando ${res.transcript} executado`);
          void qc.invalidateQueries({ queryKey: ['devices'] });
        } else {
          setState('error');
          playSfx('fail'); // earcon de falha (não entendeu)
        }
      } catch {
        if (mounted.current) {
          setLast(null);
          setState('error');
          playSfx('fail'); // earcon de falha (erro de rede/STT)
        }
      }
      // Re-arma a escuta após um respiro (mãos-livres contínuo).
      window.setTimeout(() => mounted.current && startListenRef.current(), 1700);
    },
    [qc],
  );

  const startListen = React.useCallback(async () => {
    if (activeRef.current || !mounted.current) return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setBlockedMsg(
        typeof window !== 'undefined' && window.isSecureContext
          ? 'Microfone bloqueado nesta origem (certificado). Use http://localhost ou um túnel HTTPS confiável.'
          : 'Microfone indisponível: abra por http://localhost ou por HTTPS confiável.',
      );
      setState('blocked');
      return;
    }
    activeRef.current = true;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      activeRef.current = false;
      const name = (err as DOMException)?.name;
      setBlockedMsg(
        name === 'NotFoundError'
          ? 'Nenhum microfone neste dispositivo. Conecte um mic (USB/Bluetooth) ou use os botões em Dispositivos.'
          : name === 'NotAllowedError' || name === 'SecurityError'
            ? 'Microfone negado. Toque para permitir — no celular, o certificado precisa ser confiável (túnel HTTPS).'
            : 'Não consegui acessar o microfone. Toque para tentar de novo.',
      );
      setState('blocked');
      return;
    }
    streamRef.current = stream;

    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    ctxRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const buf = new Uint8Array(analyser.fftSize);

    const spokeRef = { current: false };
    let silenceStart: number | null = null;
    const t0 = performance.now();

    const rec = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      const spoke = spokeRef.current;
      cleanupAudio();
      if (spoke) void process(new Blob(chunks, { type: 'audio/webm' }));
    };
    recRef.current = rec;
    setState('listening');
    rec.start();

    const tick = () => {
      if (!activeRef.current || recRef.current?.state !== 'recording') return;
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const x = (buf[i] - 128) / 128;
        sum += x * x;
      }
      const rms = Math.sqrt(sum / buf.length);
      const now = performance.now();

      if (rms > SPEECH_THRESHOLD) {
        spokeRef.current = true;
        silenceStart = null;
        setState((s) => (s === 'listening' || s === 'speech' ? 'speech' : s));
        if (ringRef.current) ringRef.current.style.transform = `scale(${1 + Math.min(rms * 4, 0.6)})`;
      } else {
        if (ringRef.current) ringRef.current.style.transform = 'scale(1)';
        if (spokeRef.current) {
          if (silenceStart == null) silenceStart = now;
          else if (now - silenceStart > SILENCE_MS) {
            rec.stop(); // → onstop → envia
            return;
          }
        }
      }
      if (now - t0 > MAX_MS && spokeRef.current) {
        rec.stop();
        return;
      }
      if (!spokeRef.current && now - t0 > NO_SPEECH_MS) {
        cleanupAudio();
        setState('idle');
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [cleanupAudio, process]);

  React.useEffect(() => {
    startListenRef.current = startListen;
  }, [startListen]);

  // Autoinício ao abrir + limpeza ao sair.
  React.useEffect(() => {
    mounted.current = true;
    preloadSfx();
    playSfx('on'); // som ao entrar na aba de voz
    void startListen();
    return () => {
      mounted.current = false;
      cleanupAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toque no círculo: pausa (se escutando) ou (re)inicia — inclui conceder o mic.
  function onOrbTap() {
    unlockSfx(); // gesto direto no orbe destrava o áudio (mobile)
    if (state === 'listening' || state === 'speech') {
      cleanupAudio();
      setState('idle');
    } else if (state === 'processing') {
      return;
    } else {
      void startListen();
    }
  }

  const listening = state === 'listening' || state === 'speech';

  return (
    <AppShell title="Assistente de voz" subtitle="Fale um comando — ele executa sozinho ao terminar">
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-8 py-6">
        {/* Orbe do microfone */}
        <button
          type="button"
          onClick={onOrbTap}
          aria-label={listening ? 'Pausar escuta' : 'Ativar escuta'}
          className="relative flex h-44 w-44 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-52 sm:w-52"
        >
          {/* Anéis reativos (escala pela voz) */}
          <div
            ref={ringRef}
            className={cn(
              'absolute inset-0 rounded-full transition-colors duration-300',
              state === 'success' && 'bg-chart-2/15',
              state === 'error' && 'bg-destructive/10',
              (listening || state === 'idle' || state === 'init') && 'bg-primary/10',
              state === 'processing' && 'bg-primary/10',
            )}
            style={{ transition: 'transform 90ms ease-out, background-color 300ms' }}
          />
          {listening && (
            <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" style={{ animationDuration: '1.8s' }} />
          )}
          {/* Miolo */}
          <div
            className={cn(
              'relative z-10 flex h-24 w-24 items-center justify-center rounded-full border-2 shadow-sm transition-colors sm:h-28 sm:w-28',
              state === 'success' && 'border-chart-2 bg-chart-2/10 text-chart-2',
              state === 'error' && 'border-destructive bg-destructive/10 text-destructive',
              state === 'blocked' && 'border-muted-foreground/40 bg-muted text-muted-foreground',
              (listening || state === 'processing' || state === 'idle' || state === 'init') &&
                'border-primary/40 bg-background text-foreground',
            )}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={state}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={state === 'error' ? { scale: 1, opacity: 1, x: [0, -6, 6, -4, 4, 0] } : { scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
              >
                {state === 'processing' ? (
                  <Loader2 className="h-10 w-10 animate-spin" />
                ) : state === 'success' ? (
                  <Check className="h-11 w-11" />
                ) : state === 'error' ? (
                  <X className="h-11 w-11" />
                ) : state === 'blocked' || state === 'idle' ? (
                  <MicOff className="h-10 w-10" />
                ) : (
                  <Mic className="h-10 w-10" />
                )}
              </motion.span>
            </AnimatePresence>
          </div>
        </button>

        {/* Status inline (sem pop-ups) */}
        <div className="min-h-[4.5rem] w-full text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={state + (last?.transcript ?? '')}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              {state === 'blocked' ? (
                <p className="text-sm text-muted-foreground">{blockedMsg}</p>
              ) : state === 'idle' ? (
                <p className="text-sm text-muted-foreground">Escuta pausada — toque para retomar.</p>
              ) : state === 'processing' ? (
                <p className="text-sm text-muted-foreground">Entendendo…</p>
              ) : state === 'success' && last ? (
                <>
                  <p className="text-base font-medium text-foreground">“{last.transcript}”</p>
                  <p className="text-xs text-chart-2">Executado · {last.intent} · {last.latencyMs} ms</p>
                </>
              ) : state === 'error' ? (
                <>
                  <p className="text-base font-medium text-foreground">
                    {last ? `“${last.transcript}”` : 'Não consegui ouvir'}
                  </p>
                  <p className="text-xs text-destructive">
                    {last?.suggestions?.length
                      ? `Tente: ${last.suggestions.join(', ')}`
                      : 'Não entendi o comando — tente de novo.'}
                  </p>
                </>
              ) : state === 'speech' ? (
                <p className="text-sm font-medium text-foreground">Ouvindo…</p>
              ) : (
                <p className="text-sm text-muted-foreground">Pode falar — ex.: “ligar tomada Tapo”.</p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </AppShell>
  );
}
