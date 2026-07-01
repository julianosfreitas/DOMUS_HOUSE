import { Injectable } from '@nestjs/common';
import { SpeechToText, type TranscribeOptions } from './speech-to-text';
import { VoiceboxService } from './voicebox.service';

/**
 * STT via Voicebox (Whisper turbo/large do app). Ativado por VOICE_STT_ENGINE=voicebox.
 * O Whisper do Voicebox é agnóstico de idioma, então funciona em pt-BR.
 */
@Injectable()
export class VoiceboxSttService extends SpeechToText {
  constructor(private readonly voicebox: VoiceboxService) {
    super();
  }

  async transcribe(audio: Buffer, _opts: TranscribeOptions): Promise<string> {
    return this.voicebox.transcribe(audio);
  }
}
