import { Injectable } from '@nestjs/common';

export type VoiceIntentName =
  | 'turnOn'
  | 'turnOff'
  | 'toggle'
  | 'setBrightness'
  | 'setColor'
  | 'unknown';

export interface ParsableDevice {
  id: string;
  name: string;
  nickname?: string | null; // apelido dado pelo usuário — casa com o mesmo peso do nome
  type?: string | null; // DeviceType (LIGHT | PLUG | ...) — usado para casar por tipo
  roomName?: string | null;
  supportsBrightness: boolean;
  supportsColor: boolean;
}

export interface ParsedIntent {
  intent: VoiceIntentName;
  deviceId?: string;
  payload?: Record<string, number | string>;
  confidence: number; // 0..1
  suggestions?: string[]; // nomes de dispositivos quando há ambiguidade
}

// Dicionário de cores pt-BR → hex.
const COLORS: Record<string, string> = {
  azul: '#1E66F5',
  vermelho: '#FF0000',
  verde: '#00B140',
  amarelo: '#FFD500',
  branco: '#FFFFFF',
  laranja: '#FF7A00',
  roxo: '#7A1FA2',
  lilas: '#B57EDC',
  rosa: '#FF4FA3',
  ciano: '#00BCD4',
  'azul claro': '#4F8EF7',
};

const ON_VERBS = [
  'liga',
  'ligar',
  'ligue',
  'ligou',
  'acende',
  'acender',
  'acenda',
  'ativa',
  'ativar',
  'ativá',
];
const OFF_VERBS = [
  'desliga',
  'desligar',
  'desligue',
  'desligua',
  'apaga',
  'apagar',
  'apague',
  'desativa',
  'desativar',
];
const TOGGLE_VERBS = ['alterna', 'alternar', 'inverte', 'troca'];
const VERBS = new Set([...ON_VERBS, ...OFF_VERBS, ...TOGGLE_VERBS]);

// Palavra genérica de fala → tipo do aparelho (slot de tipo, à la Alexa/Google).
// "desliga a tomada" prioriza PLUG; "apaga a luz" prioriza LIGHT.
const TYPE_WORDS: Record<string, string> = {
  tomada: 'PLUG',
  tomadas: 'PLUG',
  plugue: 'PLUG',
  plug: 'PLUG',
  luz: 'LIGHT',
  luzes: 'LIGHT',
  lampada: 'LIGHT',
  lampadas: 'LIGHT',
  abajur: 'LIGHT',
};

// Palavras ignoradas ao casar nomes de dispositivos (inclui as de tipo, que viram slot).
const STOPWORDS = new Set([
  'a',
  'o',
  'as',
  'os',
  'da',
  'do',
  'de',
  'na',
  'no',
  'em',
  'para',
  'pra',
  'por',
  'cento',
  'porcento',
  'luz',
  'luzes',
  'lampada',
  'lampadas',
  'tomada',
  'tomadas',
  'aparelho',
  'favor',
  'me',
]);

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9%\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Distância de edição Damerau-Levenshtein (OSA) — conta transposição de letras
 * vizinhas como 1 (ex.: "quatro"→"quarto"), comum em fala/STT. Base da tolerância.
 */
function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const d: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1); // transposição
      }
    }
  }
  return d[m][n];
}

/**
 * Similaridade 0..1 tolerante a erros de reconhecimento de fala. Exato = 1;
 * prefixo/substring forte = alto ("tap"→"tapo"); senão, distância de edição relativa
 * ("taipo"/"tampo" ≈ "tapo"). É o que aproxima o casamento do comportamento da Alexa.
 */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const long = a.length >= b.length ? a : b;
  const short = a.length >= b.length ? b : a;
  if (short.length >= 3 && long.startsWith(short)) return 0.9;
  if (short.length >= 4 && long.includes(short)) return 0.85;
  return 1 - editDistance(a, b) / Math.max(a.length, b.length);
}

function bestSim(token: string, set: string[]): number {
  let best = 0;
  for (const t of set) best = Math.max(best, similarity(token, t));
  return best;
}

/**
 * Converte uma frase em pt-BR num intent estruturado. O casamento do dispositivo
 * imita a "associação" de Alexa/Google: (1) tolerante a erros do STT via similaridade,
 * (2) o NOME dado pelo usuário pesa mais que o cômodo, e (3) a palavra de tipo
 * ("tomada"/"luz") funciona como slot que prioriza aparelhos daquele tipo.
 */
@Injectable()
export class VoiceCommandParser {
  private static readonly SIM_MIN = 0.72; // aceita ~1 erro em tokens de 4 letras

  parse(rawText: string, devices: ParsableDevice[]): ParsedIntent {
    const text = normalize(rawText);
    const tokens = text.split(' ').filter(Boolean);

    const intent = this.detectIntent(text, tokens);
    const match = this.matchDevice(tokens, devices);

    if (intent === 'unknown') {
      return { intent: 'unknown', confidence: 0.2, suggestions: this.names(devices) };
    }

    if (match.candidates.length > 1) {
      return { intent, confidence: 0.4, suggestions: match.candidates.map((d) => d.name) };
    }

    const device = match.best;
    if (!device) {
      if (devices.length === 1) {
        return this.build(intent, devices[0], text, 0.55);
      }
      return { intent, confidence: 0.3, suggestions: this.names(devices) };
    }

    const confidence = Math.min(0.99, 0.6 + match.matchCount * 0.15);
    return this.build(intent, device, text, confidence);
  }

  private detectIntent(text: string, tokens: string[]): VoiceIntentName {
    const has = (list: string[]): boolean => tokens.some((t) => list.includes(t));

    if (text.includes('brilho') || /\d+\s*%/.test(text) || /\d+\s+(por\s+)?cento/.test(text)) {
      return 'setBrightness';
    }
    if (text.includes('cor') || Object.keys(COLORS).some((c) => text.includes(c))) {
      return 'setColor';
    }
    if (has(OFF_VERBS)) return 'turnOff';
    if (has(ON_VERBS)) return 'turnOn';
    if (has(TOGGLE_VERBS)) return 'toggle';
    return 'unknown';
  }

  private build(
    intent: VoiceIntentName,
    device: ParsableDevice,
    text: string,
    confidence: number,
  ): ParsedIntent {
    const payload: Record<string, number | string> = {};

    if (intent === 'setBrightness') {
      const num = /(\d{1,3})\s*(%|por\s+cento|porcento|cento)?/.exec(text);
      const value = num ? Math.max(0, Math.min(100, Number(num[1]))) : 100;
      payload.brightness = value;
      if (!device.supportsBrightness) {
        return { intent, deviceId: device.id, confidence: confidence * 0.7, payload };
      }
    }

    if (intent === 'setColor') {
      const found = Object.keys(COLORS).find((c) => text.includes(c));
      payload.color = found ? COLORS[found] : '#FFFFFF';
      if (!device.supportsColor) {
        return { intent, deviceId: device.id, confidence: confidence * 0.7, payload };
      }
    }

    return {
      intent,
      deviceId: device.id,
      confidence,
      ...(Object.keys(payload).length ? { payload } : {}),
    };
  }

  /**
   * Casa o dispositivo por similaridade de tokens (nome pesa 2, cômodo 1) + bônus de
   * tipo quando a fala cita "tomada"/"luz". Tolerante a erros do STT.
   */
  private matchDevice(
    tokens: string[],
    devices: ParsableDevice[],
  ): { best?: ParsableDevice; score: number; matchCount: number; candidates: ParsableDevice[] } {
    const meaningful = tokens.filter(
      (t) => !STOPWORDS.has(t) && !VERBS.has(t) && t.length > 1 && !/^\d+$/.test(t),
    );
    const typeHint = tokens.map((t) => TYPE_WORDS[t]).find(Boolean) ?? null;
    const tokenize = (s: string): string[] =>
      normalize(s)
        .split(' ')
        .filter((t) => !STOPWORDS.has(t) && t.length > 1);

    const scored = devices.map((d) => {
      // Nome + apelido casam com o mesmo peso (o apelido é como o usuário chama o aparelho).
      const nameTokens = [...tokenize(d.name), ...tokenize(d.nickname ?? '')];
      const roomTokens = tokenize(d.roomName ?? '');
      let score = 0;
      let count = 0;
      for (const t of meaningful) {
        const nameM = bestSim(t, nameTokens);
        const roomM = bestSim(t, roomTokens);
        if (nameM >= VoiceCommandParser.SIM_MIN) {
          score += 2 * nameM;
          count += 1;
        } else if (roomM >= VoiceCommandParser.SIM_MIN) {
          score += 1 * roomM;
          count += 1;
        }
      }
      // A palavra de tipo prioriza aparelhos daquele tipo (ex.: "tomada" → PLUG).
      if (typeHint && d.type === typeHint) score += 0.75;
      return { device: d, score, count };
    });

    const bestScore = scored.reduce((m, s) => Math.max(m, s.score), 0);
    if (bestScore < 0.5) {
      return { score: 0, matchCount: 0, candidates: [] };
    }
    // Empate quando o topo está muito próximo (dentro de 0.1) → pede confirmação.
    const top = scored.filter((s) => s.score >= bestScore - 0.1);
    return {
      best: top.length === 1 ? top[0].device : undefined,
      score: bestScore,
      matchCount: top.length === 1 ? Math.max(1, top[0].count) : 0,
      candidates: top.length > 1 ? top.map((s) => s.device) : [],
    };
  }

  private names(devices: ParsableDevice[]): string[] {
    return devices.map((d) => d.name);
  }
}
