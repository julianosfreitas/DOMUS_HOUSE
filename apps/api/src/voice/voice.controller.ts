import {
  Body,
  Controller,
  Get,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { VoiceService } from './voice.service';
import { VoiceboxService } from './voicebox.service';
import { VoiceCommandTextDto } from './dto/voice-command.dto';
import { TtsSpeakDto } from './dto/tts-speak.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';

// Limite de 5 MB: ~3s de áudio webm/opus cabem com folga.
const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
type UploadedAudio = { buffer: Buffer; size: number } | undefined;

@Controller('voice')
export class VoiceController {
  constructor(
    private readonly voice: VoiceService,
    private readonly voicebox: VoiceboxService,
  ) {}

  @Post('transcribe')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: MAX_AUDIO_BYTES } }))
  transcribe(@UploadedFile() file: UploadedAudio) {
    if (!file) {
      throw new BadRequestException('Envie um arquivo de áudio no campo "audio"');
    }
    return this.voice.transcribe(file.buffer);
  }

  @Post('command')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: MAX_AUDIO_BYTES } }))
  command(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: UploadedAudio,
    @Body() dto: VoiceCommandTextDto,
  ) {
    return this.voice.command(user.id, { text: dto.text, audio: file?.buffer });
  }

  /**
   * Status do Voicebox (app local de voz). O front usa para mostrar o seletor de
   * voz da assistente. Nunca falha: devolve available:false se o app não responder.
   */
  @Get('tts/status')
  ttsStatus() {
    return this.voicebox.status();
  }

  /**
   * Sintetiza a fala da assistente na voz escolhida (Voicebox). Devolve o áudio
   * para o navegador tocar. 503 se o Voicebox estiver indisponível → o front cai
   * no TTS do navegador (pt-BR).
   */
  @Post('tts/speak')
  @HttpCode(HttpStatus.OK)
  async ttsSpeak(
    @Body() dto: TtsSpeakDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { audio, contentType } = await this.voicebox.speak(dto.text, dto.profileId);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-store');
    return new StreamableFile(audio);
  }
}
