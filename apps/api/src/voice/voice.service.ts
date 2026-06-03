import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { DevicesService } from '../devices/devices.service';
import { SpeechToText } from './speech-to-text';
import { VoiceCommandParser, type ParsableDevice, type ParsedIntent } from './voice-command.parser';
import type { DeviceCommandDto, DeviceCommandName } from '../devices/dto/device-command.dto';

const CONFIDENCE_THRESHOLD = 0.6;

export interface VoiceCommandResult {
  transcript: string;
  intent: ParsedIntent['intent'];
  deviceId?: string;
  confidence: number;
  executed: boolean;
  needsConfirmation: boolean;
  suggestions?: string[];
  latencyMs: number;
}

@Injectable()
export class VoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly devices: DevicesService,
    private readonly stt: SpeechToText,
    private readonly parser: VoiceCommandParser,
    private readonly config: ConfigService,
  ) {}

  async transcribe(audio: Buffer): Promise<{ transcript: string }> {
    const language = this.config.get<string>('WHISPER_LANGUAGE') ?? 'pt';
    const transcript = await this.stt.transcribe(audio, { language });
    return { transcript };
  }

  /** Recebe texto OU áudio, identifica a intenção e (se confiante) executa. */
  async command(
    userId: string,
    input: { text?: string; audio?: Buffer },
  ): Promise<VoiceCommandResult> {
    const startedAt = Date.now();

    let transcript = input.text?.trim();
    if (!transcript) {
      if (!input.audio) {
        throw new BadRequestException('Envie "text" ou um arquivo de áudio');
      }
      transcript = (await this.transcribe(input.audio)).transcript;
    }

    const devices = await this.loadDevices(userId);
    const parsed = this.parser.parse(transcript, devices);

    const ambiguous =
      parsed.intent === 'unknown' ||
      parsed.confidence < CONFIDENCE_THRESHOLD ||
      (parsed.suggestions?.length ?? 0) > 0 ||
      !parsed.deviceId;

    let executed = false;
    if (!ambiguous && parsed.deviceId) {
      await this.devices.executeCommand(userId, parsed.deviceId, this.toCommand(parsed));
      executed = true;
    }

    const latencyMs = Date.now() - startedAt;
    await this.log(userId, transcript, parsed, executed, latencyMs);

    return {
      transcript,
      intent: parsed.intent,
      deviceId: parsed.deviceId,
      confidence: parsed.confidence,
      executed,
      needsConfirmation: ambiguous,
      suggestions: parsed.suggestions,
      latencyMs,
    };
  }

  private async loadDevices(userId: string): Promise<ParsableDevice[]> {
    const devices = await this.prisma.device.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        supportsBrightness: true,
        supportsColor: true,
        room: { select: { name: true } },
      },
    });
    return devices.map((d) => ({
      id: d.id,
      name: d.name,
      roomName: d.room?.name ?? null,
      supportsBrightness: d.supportsBrightness,
      supportsColor: d.supportsColor,
    }));
  }

  private toCommand(parsed: ParsedIntent): DeviceCommandDto {
    const command = parsed.intent as DeviceCommandName;
    const dto: DeviceCommandDto = { command };
    if (parsed.payload?.brightness !== undefined) {
      dto.brightness = Number(parsed.payload.brightness);
    }
    if (parsed.payload?.color !== undefined) {
      dto.color = String(parsed.payload.color);
    }
    return dto;
  }

  private log(
    userId: string,
    transcript: string,
    parsed: ParsedIntent,
    success: boolean,
    latencyMs: number,
  ): Promise<unknown> {
    return this.prisma.voiceCommand.create({
      data: {
        userId,
        transcript,
        intent: parsed.intent,
        deviceId: parsed.deviceId ?? null,
        payload: (parsed.payload as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        confidence: parsed.confidence,
        success,
        latencyMs,
      },
    });
  }
}
