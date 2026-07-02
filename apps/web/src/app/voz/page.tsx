'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Keyboard, Send } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { TucoMascot, type TucoState } from '@/components/tuco-mascot';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
  // Fallback por texto: se o microfone falhar/for negado na banca, digita-se o
  // comando e ele segue o MESMO pipeline (POST /voice/command) via texto.
  const [textOpen, setTextOpen] = React.useState(false);
  const [textCmd, setTextCmd] = React.useState('');

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

  // Aplica o resultado do backend na UI (mesmo retorno para áudio e texto).
  const applyResult = React.useCallback(
    (res: VoiceResult) => {
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
    },
    [qc],
  );

  const process = React.useCallback(
    async (blob: Blob) => {
      if (!mounted.current) return;
      setState('processing');
      try {
        const res = await api.voiceCommandAudio(blob);
        applyResult(res);
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
    [applyResult],
  );

  // Envia um comando digitado (fallback quando o microfone falha).
  const sendText = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const text = textCmd.trim();
      if (!text || !mounted.current) return;
      cleanupAudio(); // libera o mic caso estivesse ativo — sem disputa de getUserMedia
      setState('processing');
      try {
        const res = await api.voiceCommandText(text);
        applyResult(res);
        setTextCmd('');
      } catch {
        if (mounted.current) {
          setLast(null);
          setState('error');
          playSfx('fail');
        }
      }
    },
    [textCmd, cleanupAudio, applyResult],
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
  // Estado do mascote TUCO: sucesso = feliz, erro/bloqueado = cabisbaixo, resto = escutando.
  const mascot: TucoState =
    state === 'success' ? 'entendeu' : state === 'error' || state === 'blocked' ? 'cabisbaixo' : 'escutando';

  return (
    <AppShell title="TUCO" subtitle="Seu assistente de voz — fale um comando">
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
          {/* TUCO — mascote tucano pousado no centro (substitui o antigo ícone de mic) */}
          <TucoMascot state={mascot} className="relative z-10" />
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

        {/* Fallback por texto — plano B se o microfone falhar/for negado.
            O atalho só aparece quando o mic está bloqueado ou pausado; uma vez
            aberto, o campo permanece disponível (útil na banca). */}
        <div className="w-full max-w-sm">
          {textOpen ? (
            <form onSubmit={sendText} className="flex items-center gap-2">
              <Input
                autoFocus
                value={textCmd}
                onChange={(e) => setTextCmd(e.target.value)}
                placeholder="Ex.: ligar a luz"
                aria-label="Digite um comando"
                className="flex-1"
              />
              <Button type="submit" size="icon" aria-label="Enviar comando" disabled={!textCmd.trim()}>
                <Send className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Fechar digitação"
                onClick={() => setTextOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </form>
          ) : (
            (state === 'blocked' || state === 'idle') && (
              <button
                type="button"
                onClick={() => setTextOpen(true)}
                className="mx-auto flex items-center gap-2 rounded-full border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Keyboard className="h-4 w-4" />
                Digitar comando
              </button>
            )
          )}
        </div>
      </div>
    </AppShell>
  );
}
