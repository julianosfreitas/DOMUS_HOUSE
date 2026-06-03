import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeFile, unlink, mkdtemp, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import type { nodewhisper as NodeWhisperFn } from 'nodejs-whisper';
import { SpeechToText, type TranscribeOptions } from './speech-to-text';

/**
 * STT com Whisper rodando NO HUB (offline-first). Escolha documentada:
 * usamos `nodejs-whisper` (bindings do whisper.cpp em CPU) — não exige Python e
 * roda no mesmo processo Node do hub. Alternativa para hubs com GPU: trocar por
 * `faster-whisper` (Python) atrás desta mesma interface SpeechToText.
 *
 * A lib é OPCIONAL (optionalDependencies): se não estiver instalada/compilada,
 * o endpoint responde 503 com orientação, sem derrubar o resto do sistema.
 *
 * LGPD: o áudio é gravado em arquivo temporário só para a transcrição e
 * APAGADO logo em seguida. Nunca é persistido no banco.
 */
@Injectable()
export class WhisperSttService extends SpeechToText {
  private readonly logger = new Logger(WhisperSttService.name);

  constructor(private readonly config: ConfigService) {
    super();
  }

  async transcribe(audio: Buffer, opts: TranscribeOptions): Promise<string> {
    const nodewhisper = await this.loadWhisper();
    const model = this.config.get<string>('WHISPER_MODEL') ?? 'small';

    const dir = await mkdtemp(join(tmpdir(), 'casai-voice-'));
    const file = join(dir, `${randomUUID()}.wav`);
    try {
      await writeFile(file, audio);
      const raw = await nodewhisper(file, {
        modelName: model,
        autoDownloadModelName: model,
        whisperOptions: { language: opts.language },
      });
      return this.cleanTranscript(raw);
    } finally {
      // Descarte do áudio (LGPD) — best-effort.
      await unlink(file).catch(() => undefined);
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  /** Remove timestamps/linhas do formato de saída e devolve só o texto. */
  private cleanTranscript(raw: string): string {
    return raw
      .split('\n')
      .map((line) => line.replace(/\[[\d:.\->\s]+\]/g, '').trim())
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  private async loadWhisper(): Promise<typeof NodeWhisperFn> {
    try {
      // Import dinâmico: só carrega a lib nativa quando há de fato uma transcrição.
      const mod = await import('nodejs-whisper');
      return mod.nodewhisper;
    } catch (err) {
      this.logger.error(`nodejs-whisper indisponível: ${(err as Error).message}`);
      throw new ServiceUnavailableException(
        'STT indisponível: instale e compile `nodejs-whisper` no hub (npm i nodejs-whisper).',
      );
    }
  }
}
