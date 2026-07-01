import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { DevicesService } from '../devices/devices.service';
import { DeviceEvents } from '../devices/device-events';

export type EnergyPeriod = '24h' | '7d' | '30d';
export type EnergyGranularity = 'hour' | 'day';

export interface HistoryBucket {
  bucket: string; // ISO do início do balde
  avgWatts: number;
  samples: number;
}

const PERIOD_MS: Record<EnergyPeriod, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

// Retenção das leituras de energia: um pouco acima da maior janela de consulta (30d).
const RETENTION_DAYS = 35;
// Teto de linhas carregadas em memória por consulta de histórico (defesa contra crescimento).
const HISTORY_MAX_ROWS = 20_000;

@Injectable()
export class EnergyService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EnergyService.name);
  private readonly intervalName = 'energy-poll';
  private readonly pruneIntervalName = 'energy-prune';

  constructor(
    private readonly prisma: PrismaService,
    private readonly devices: DevicesService,
    private readonly events: DeviceEvents,
    private readonly config: ConfigService,
    private readonly scheduler: SchedulerRegistry,
  ) {}

  onModuleInit(): void {
    // Em teste não ligamos o timer (os specs chamam pollOnce() diretamente).
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    const seconds = Number(this.config.get<string>('ENERGY_POLL_INTERVAL_SECONDS') ?? '5');
    const interval = setInterval(() => {
      void this.pollOnce().catch((e) => this.logger.warn(`poll falhou: ${String(e)}`));
    }, seconds * 1000);
    this.scheduler.addInterval(this.intervalName, interval);
    this.logger.log(`Polling de energia a cada ${seconds}s`);

    // Retenção: remove leituras antigas de hora em hora p/ a tabela não crescer sem limite.
    const prune = setInterval(
      () => {
        void this.pruneOldReadings().catch((e) =>
          this.logger.warn(`limpeza de leituras falhou: ${String(e)}`),
        );
      },
      60 * 60 * 1000,
    );
    this.scheduler.addInterval(this.pruneIntervalName, prune);
  }

  onModuleDestroy(): void {
    for (const name of [this.intervalName, this.pruneIntervalName]) {
      if (this.scheduler.doesExist('interval', name)) {
        this.scheduler.deleteInterval(name);
      }
    }
  }

  /** Remove leituras de energia mais antigas que a janela de retenção. */
  async pruneOldReadings(): Promise<number> {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const { count } = await this.prisma.energyReading.deleteMany({
      where: { readAt: { lt: cutoff } },
    });
    if (count > 0) {
      this.logger.debug(`Retenção: ${count} leitura(s) de energia removida(s)`);
    }
    return count;
  }

  /**
   * Lê a energia de todos os dispositivos com supportsEnergy, salva em
   * energy_readings e faz broadcast energy:reading. Dispositivos offline são
   * pulados sem derrubar o ciclo.
   */
  async pollOnce(): Promise<number> {
    const devices = await this.devices.listEnergyDevices();
    let saved = 0;
    for (const device of devices) {
      try {
        const energy = await this.devices.pollEnergy(device);
        if (!energy) {
          continue;
        }
        const readAt = new Date();
        await this.prisma.energyReading.create({
          data: {
            deviceId: device.id,
            watts: energy.watts,
            kwhToday: energy.kwhToday ?? null,
            kwhMonth: energy.kwhMonth ?? null,
            readAt,
          },
        });
        this.events.emitEnergyReading(device.userId, device.id, energy.watts, readAt);
        saved++;
      } catch (err) {
        this.logger.debug(`energia de ${device.id} pulada: ${(err as Error).message}`);
      }
    }
    return saved;
  }

  /** Histórico agregado de potência de um dispositivo do usuário. */
  async history(
    userId: string,
    deviceId: string,
    period: EnergyPeriod,
    granularity: EnergyGranularity,
  ): Promise<{
    deviceId: string;
    period: EnergyPeriod;
    granularity: EnergyGranularity;
    buckets: HistoryBucket[];
  }> {
    const owns = await this.prisma.device.count({ where: { id: deviceId, userId } });
    if (owns === 0) {
      throw new NotFoundException('Dispositivo não encontrado');
    }
    const since = new Date(Date.now() - PERIOD_MS[period]);
    // Limite de linhas em memória (take). A agregação por balde independe da ordem,
    // então pegamos as mais recentes (desc) e ordenamos os baldes no fim.
    const readings = await this.prisma.energyReading.findMany({
      where: { deviceId, readAt: { gte: since } },
      orderBy: { readAt: 'desc' },
      take: HISTORY_MAX_ROWS,
      select: { watts: true, readAt: true },
    });

    const groups = new Map<string, { sum: number; count: number }>();
    for (const r of readings) {
      const key = this.bucketKey(r.readAt, granularity);
      const g = groups.get(key) ?? { sum: 0, count: 0 };
      g.sum += r.watts;
      g.count += 1;
      groups.set(key, g);
    }
    const buckets: HistoryBucket[] = [...groups.entries()]
      .map(([bucket, g]) => ({
        bucket,
        avgWatts: Math.round((g.sum / g.count) * 100) / 100,
        samples: g.count,
      }))
      .sort((a, b) => (a.bucket < b.bucket ? -1 : 1));
    return { deviceId, period, granularity, buckets };
  }

  /** Resumo de consumo e custo (R$) do usuário, com projeção mensal. */
  async summary(userId: string): Promise<{
    totalWatts: number;
    kwhToday: number;
    kwhMonth: number;
    costToday: number;
    costMonth: number;
    projectedMonthlyCost: number;
    rate: number;
  }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const rate = user.energyRate;
    const devices = await this.prisma.device.findMany({
      where: { userId, supportsEnergy: true },
      select: { id: true },
    });

    let totalWatts = 0;
    let kwhToday = 0;
    let kwhMonth = 0;
    for (const d of devices) {
      const latest = await this.prisma.energyReading.findFirst({
        where: { deviceId: d.id },
        orderBy: { readAt: 'desc' },
      });
      if (latest) {
        totalWatts += latest.watts;
        kwhToday += latest.kwhToday ?? 0;
        kwhMonth += latest.kwhMonth ?? 0;
      }
    }

    const costToday = round2(kwhToday * rate);
    const costMonth = round2(kwhMonth * rate);
    const now = new Date();
    const dayOfMonth = now.getDate();
    // Dias reais do mês corrente (28–31), em vez de 30 fixo.
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    // Projeção: extrapola o consumo até o fim do mês corrente.
    const projectedMonthlyCost =
      kwhMonth > 0
        ? round2((kwhMonth / dayOfMonth) * daysInMonth * rate)
        : round2(kwhToday * daysInMonth * rate);

    return {
      totalWatts: round2(totalWatts),
      kwhToday: round2(kwhToday),
      kwhMonth: round2(kwhMonth),
      costToday,
      costMonth,
      projectedMonthlyCost,
      rate,
    };
  }

  private bucketKey(date: Date, granularity: EnergyGranularity): string {
    const d = new Date(date);
    if (granularity === 'day') {
      d.setHours(0, 0, 0, 0);
    } else {
      d.setMinutes(0, 0, 0);
    }
    return d.toISOString();
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
