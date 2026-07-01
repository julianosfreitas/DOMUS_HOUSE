/**
 * Efeitos sonoros curtos (earcons) do assistente de voz. Servidos de
 * `public/sounds`. `play()` é best-effort: se a política de autoplay bloquear
 * (sem gesto do usuário), falha em silêncio — nunca lança.
 */
const SOUNDS = {
  on: '/sounds/VOICE_ON.wav', // entrou na aba / escuta pronta
  done: '/sounds/VOICE_DONE.wav', // comando reconhecido e executado
  fail: '/sounds/VOICE_RUIN.wav', // não entendeu / falhou
} as const;

export type SfxKey = keyof typeof SOUNDS;

const cache: Partial<Record<SfxKey, HTMLAudioElement>> = {};
let unlocked = false;

function get(key: SfxKey): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  let a = cache[key];
  if (!a) {
    a = new Audio(SOUNDS[key]);
    a.preload = 'auto';
    a.volume = 0.7;
    cache[key] = a;
  }
  return a;
}

/**
 * Destrava o áudio no mobile (iOS/Android): precisa ser chamado DENTRO de um gesto
 * do usuário (toque/clique). Toca cada som mudo e pausa — depois disso o navegador
 * permite `play()` mesmo a partir de callbacks assíncronos. Idempotente.
 */
export function unlockSfx(): void {
  if (unlocked || typeof window === 'undefined') return;
  unlocked = true;
  (Object.keys(SOUNDS) as SfxKey[]).forEach((k) => {
    const a = get(k);
    if (!a) return;
    const prevMuted = a.muted;
    a.muted = true;
    a.play()
      .then(() => {
        a.pause();
        a.currentTime = 0;
        a.muted = prevMuted;
      })
      .catch(() => {
        a.muted = prevMuted;
      });
  });
}

/** Toca um earcon do início (reinicia se já estava tocando). */
export function playSfx(key: SfxKey): void {
  const a = get(key);
  if (!a) return;
  try {
    a.currentTime = 0;
    void a.play().catch(() => {});
  } catch {
    // autoplay/decoding — ignora
  }
}

/** Aquece o cache (chame após o 1º gesto para destravar o autoplay). */
export function preloadSfx(): void {
  (Object.keys(SOUNDS) as SfxKey[]).forEach((k) => get(k));
}
