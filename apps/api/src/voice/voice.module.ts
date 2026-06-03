import { Module } from '@nestjs/common';
import { VoiceService } from './voice.service';
import { VoiceController } from './voice.controller';
import { VoiceCommandParser } from './voice-command.parser';
import { SpeechToText } from './speech-to-text';
import { WhisperSttService } from './whisper.stt';
import { DevicesModule } from '../devices/devices.module';

@Module({
  imports: [DevicesModule],
  controllers: [VoiceController],
  providers: [
    VoiceService,
    VoiceCommandParser,
    // STT real (Whisper no hub). Trocável por outra impl. de SpeechToText.
    { provide: SpeechToText, useClass: WhisperSttService },
  ],
  exports: [VoiceCommandParser],
})
export class VoiceModule {}
