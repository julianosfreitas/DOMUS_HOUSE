/**
 * Síntese de voz (TTS) da assistente — a "fala" de confirmação dos comandos.
 * Dois motores, escolhidos pelo usuário e persistidos em localStorage:
 *  - 'browser' (padrão): SpeechSynthesis do navegador, pt-BR, sem dependências.
 *  - 'voicebox': voz clonada/preset do app local Voicebox (via hub). Cai no
 *    navegador se o Voicebox estiver indisponível — sem regressão.
 * Acessibilidade: confirmar por voz além do retorno visual.
 */
import { api } from './api';

const KEY = 'casai:tts';
const ENGINE_KEY = 'casai:tts-engine';
const PROFILE_KEY = 'casai:tts-profile';

export type TtsEngine = 'browser' | 'voicebox';

/** TTS habilitado? Padrão: ligado. SSR-safe (assume ligado no servidor). */
export function isTtsEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(KEY) !== 'off';
}

/** Liga/desliga a fala e persiste a escolha; ao desligar, corta qualquer fala em curso. */
export function setTtsEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, enabled ? 'on' : 'off');
  if (!enabled && 'speechSynthesis' in window) window.speechSynthesis.cancel();
}

/** Motor de voz atual. Padrão: navegador. */
export function getTtsEngine(): TtsEngine {
  if (typeof window === 'undefined') return 'browser';
  return window.localStorage.getItem(ENGINE_KEY) === 'voicebox' ? 'voicebox' : 'browser';
}

export function setTtsEngine(engine: TtsEngine): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ENGINE_KEY, engine);
}

/** Perfil de voz escolhido no Voicebox (id). */
export function getTtsProfile(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(PROFILE_KEY);
}

export function setTtsProfile(profileId: string | null): void {
  if (typeof window === 'undefined') return;
  if (profileId) window.localStorage.setItem(PROFILE_KEY, profileId);
  else window.localStorage.removeItem(PROFILE_KEY);
}

/** Fala pelo navegador (SpeechSynthesis, pt-BR). */
function speakBrowser(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'pt-BR';
  window.speechSynthesis.speak(u);
}

/**
 * Fala o texto — no-op se desligado. Com o motor Voicebox, busca o áudio no hub e
 * toca; qualquer falha (app off, sem perfil, erro) cai no navegador (pt-BR).
 */
export function speak(text: string): void {
  if (typeof window === 'undefined') return;
  if (!isTtsEnabled()) return;

  if (getTtsEngine() === 'voicebox') {
    const profile = getTtsProfile() ?? undefined;
    void api
      .ttsSpeakAudio(text, profile)
      .then((blob) => {
        if (!blob) {
          speakBrowser(text); // Voicebox indisponível → fallback
          return;
        }
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => URL.revokeObjectURL(url);
        void audio.play().catch(() => {
          URL.revokeObjectURL(url);
          speakBrowser(text);
        });
      })
      .catch(() => speakBrowser(text));
    return;
  }

  speakBrowser(text);
}
