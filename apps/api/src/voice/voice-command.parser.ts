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
// Palavras ignoradas ao casar nomes de dispositivos.
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
  'lampada',
  'tomada',
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
 * Converte uma frase em pt-BR num intent estruturado, casando o dispositivo
 * pelos tokens do nome + cômodo. Resolve ambiguidade: se a confiança for baixa
 * ou houver múltiplos dispositivos igualmente prováveis, devolve sugestões.
 */
@Injectable()
export class VoiceCommandParser {
  parse(rawText: string, devices: ParsableDevice[]): ParsedIntent {
    const text = normalize(rawText);
    const tokens = text.split(' ').filter(Boolean);

    const intent = this.detectIntent(text, tokens);
    const match = this.matchDevice(tokens, devices);

    if (intent === 'unknown') {
      return { intent: 'unknown', confidence: 0.2, suggestions: this.names(devices) };
    }

    // Ambiguidade de dispositivo: vários empatados no topo.
    if (match.candidates.length > 1) {
      return {
        intent,
        confidence: 0.4,
        suggestions: match.candidates.map((d) => d.name),
      };
    }

    const device = match.best;
    if (!device) {
      // Sem dispositivo identificado: se só existe 1, assume; senão, sugere.
      if (devices.length === 1) {
        return this.build(intent, devices[0], text, 0.55);
      }
      return { intent, confidence: 0.3, suggestions: this.names(devices) };
    }

    // Confiança: verbo claro + dispositivo casado.
    const confidence = Math.min(0.99, 0.6 + match.score * 0.15);
    return this.build(intent, device, text, confidence);
  }

  private detectIntent(text: string, tokens: string[]): VoiceIntentName {
    const has = (list: string[]): boolean => tokens.some((t) => list.includes(t));

    // Brilho: "brilho", "X%" ou "X por cento".
    if (text.includes('brilho') || /\d+\s*%/.test(text) || /\d+\s+(por\s+)?cento/.test(text)) {
      return 'setBrightness';
    }
    // Cor: menção a "cor" ou a uma cor conhecida.
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

  /** Casa o dispositivo por interseção de tokens (nome + cômodo). */
  private matchDevice(
    tokens: string[],
    devices: ParsableDevice[],
  ): { best?: ParsableDevice; score: number; candidates: ParsableDevice[] } {
    const meaningful = tokens.filter((t) => !STOPWORDS.has(t) && t.length > 1 && !/^\d+$/.test(t));
    let bestScore = 0;
    const scored = devices.map((d) => {
      const deviceTokens = new Set(
        normalize(`${d.name} ${d.roomName ?? ''}`)
          .split(' ')
          .filter((t) => !STOPWORDS.has(t) && t.length > 1),
      );
      const score = meaningful.reduce((acc, t) => acc + (deviceTokens.has(t) ? 1 : 0), 0);
      bestScore = Math.max(bestScore, score);
      return { device: d, score };
    });

    if (bestScore === 0) {
      return { score: 0, candidates: [] };
    }
    const top = scored.filter((s) => s.score === bestScore).map((s) => s.device);
    return {
      best: top.length === 1 ? top[0] : undefined,
      score: bestScore,
      candidates: top.length > 1 ? top : [],
    };
  }

  private names(devices: ParsableDevice[]): string[] {
    return devices.map((d) => d.name);
  }
}
