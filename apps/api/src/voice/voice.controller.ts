import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VoiceService } from './voice.service';
import { VoiceCommandTextDto } from './dto/voice-command.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';

// Limite de 5 MB: ~3s de áudio webm/opus cabem com folga.
const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
type UploadedAudio = { buffer: Buffer; size: number } | undefined;

@Controller('voice')
export class VoiceController {
  constructor(private readonly voice: VoiceService) {}

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
}
