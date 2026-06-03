import { Injectable } from '@nestjs/common';

export interface TranscribeOptions {
  language: string; // 'pt'
}

/** Porta de entrada de STT — implementada pelo Whisper no hub. */
@Injectable()
export abstract class SpeechToText {
  abstract transcribe(audio: Buffer, opts: TranscribeOptions): Promise<string>;
}
