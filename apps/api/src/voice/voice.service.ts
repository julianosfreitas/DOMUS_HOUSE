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

export interface VoiceStats {
  total: number;
  successCount: number;
  successRate: number | null; // 0..1
  latencyP50: number | null; // ms
  latencyP95: number | null; // ms
  latencyMax: number | null; // ms
  latencyAvg: number | null; // ms
  avgConfidence: number | null; // 0..1
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

  /**
   * Agrega as métricas de voz do usuário direto das linhas persistidas em
   * VoiceCommand — o "confirmado ao vivo" da defesa: n, taxa de execução,
   * latência p50/p95/máx e confiança média. NÃO calcula acurácia de intenção:
   * o banco guarda a intenção interpretada, não a intenção-verdade.
   */
  async stats(userId: string): Promise<VoiceStats> {
    const rows = await this.prisma.voiceCommand.findMany({
      where: { userId },
      select: { success: true, latencyMs: true, confidence: true },
    });

    const total = rows.length;
    const successCount = rows.filter((r) => r.success).length;
    const latencies = rows
      .map((r) => r.latencyMs)
      .filter((n): n is number => typeof n === 'number')
      .sort((a, b) => a - b);
    const confidences = rows
      .map((r) => r.confidence)
      .filter((n): n is number => typeof n === 'number');

    return {
      total,
      successCount,
      successRate: total > 0 ? successCount / total : null,
      latencyP50: percentile(latencies, 50),
      latencyP95: percentile(latencies, 95),
      latencyMax: latencies.length > 0 ? latencies[latencies.length - 1] : null,
      latencyAvg: latencies.length > 0 ? Math.round(mean(latencies)) : null,
      avgConfidence: confidences.length > 0 ? mean(confidences) : null,
    };
  }

  private async loadDevices(userId: string): Promise<ParsableDevice[]> {
    const devices = await this.prisma.device.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        nickname: true,
        type: true,
        supportsBrightness: true,
        supportsColor: true,
        room: { select: { name: true } },
      },
    });
    return devices.map((d) => ({
      id: d.id,
      name: d.name,
      nickname: d.nickname,
      type: d.type,
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

/** Percentil (nearest-rank) sobre um array JÁ ordenado em ordem crescente. */
function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const rank = Math.ceil((p / 100) * sorted.length);
  const idx = Math.min(sorted.length - 1, Math.max(0, rank - 1));
  return sorted[idx];
}

function mean(xs: number[]): number {
  return xs.reduce((sum, x) => sum + x, 0) / xs.length;
}
