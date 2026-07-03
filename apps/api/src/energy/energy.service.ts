import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DevicesService } from '../devices/devices.service';
import { DeviceEvents } from '../devices/device-events';

export type EnergyPeriod = '24h' | '7d' | '30d';
export type EnergyGranularity = 'minute' | 'hour' | 'day';

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

  /**
   * Histórico agregado da CASA INTEIRA: para cada balde de tempo, soma a potência
   * média de cada conexão que mede energia. Também devolve a contribuição de cada
   * conexão (potência recente + kWh estimado na janela) — é o escopo geral da aba
   * Energia, cobrindo todas as conexões de uma vez.
   */
  async homeHistory(
    userId: string,
    period: EnergyPeriod,
    granularity: EnergyGranularity,
  ): Promise<{
    period: EnergyPeriod;
    granularity: EnergyGranularity;
    buckets: HistoryBucket[];
    byDevice: { deviceId: string; name: string; recentWatts: number; kwh: number }[];
  }> {
    const devices = await this.prisma.device.findMany({
      where: { userId, supportsEnergy: true },
      select: { id: true, name: true },
    });
    const ids = devices.map((d) => d.id);
    if (ids.length === 0) {
      return { period, granularity, buckets: [], byDevice: [] };
    }

    const since = new Date(Date.now() - PERIOD_MS[period]);
    // Teto de linhas em memória (mesmo tradeoff do history() por dispositivo): com
    // muitas conexões numa janela longa (30d) o take 'desc' pode cortar leituras
    // antigas e subestimar baldes distantes. O caso da aba Energia é 24h/hour, bem
    // abaixo do teto, então na prática não trunca.
    const readings = await this.prisma.energyReading.findMany({
      where: { deviceId: { in: ids }, readAt: { gte: since } },
      orderBy: { readAt: 'desc' },
      take: HISTORY_MAX_ROWS,
      select: { deviceId: true, watts: true, readAt: true },
    });

    // deviceId -> (balde -> {soma, contagem})
    const perDevice = new Map<string, Map<string, { sum: number; count: number }>>();
    const bucketKeys = new Set<string>();
    for (const r of readings) {
      const key = this.bucketKey(r.readAt, granularity);
      bucketKeys.add(key);
      let byBucket = perDevice.get(r.deviceId);
      if (!byBucket) {
        byBucket = new Map();
        perDevice.set(r.deviceId, byBucket);
      }
      const g = byBucket.get(key) ?? { sum: 0, count: 0 };
      g.sum += r.watts;
      g.count += 1;
      byBucket.set(key, g);
    }

    const orderedKeys = [...bucketKeys].sort();

    // Total da casa por balde = soma das médias de cada conexão naquele balde.
    const buckets: HistoryBucket[] = orderedKeys.map((key) => {
      let total = 0;
      let samples = 0;
      for (const byBucket of perDevice.values()) {
        const g = byBucket.get(key);
        if (g) {
          total += g.sum / g.count;
          samples += g.count;
        }
      }
      return { bucket: key, avgWatts: round2(total), samples };
    });

    // Energia (kWh) = potência média × duração do balde. Cada balde cobre 1 min
    // ('minute'), 1h ('hour') ou 24h ('day') — sem essa duração o kWh sairia errado.
    const hoursPerBucket = granularity === 'day' ? 24 : granularity === 'minute' ? 1 / 60 : 1;

    // Contribuição de cada conexão na janela (mais gastadora primeiro).
    const byDevice = devices
      .map((d) => {
        const byBucket = perDevice.get(d.id);
        const avgs = byBucket
          ? orderedKeys
              .map((k) => byBucket.get(k))
              .filter((g): g is { sum: number; count: number } => !!g)
              .map((g) => g.sum / g.count)
          : [];
        const recentWatts = avgs.length ? round2(avgs[avgs.length - 1]) : 0;
        const kwh = avgs.length
          ? round2((avgs.reduce((s, x) => s + x, 0) * hoursPerBucket) / 1000)
          : 0;
        return { deviceId: d.id, name: d.name, recentWatts, kwh };
      })
      .sort((a, b) => b.recentWatts - a.recentWatts);

    return { period, granularity, buckets, byDevice };
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

  /**
   * Consumo por mês (comparativo entre meses). Usa o kWh acumulado do medidor
   * (kwhMonth) — pega o maior valor lido em cada mês por conexão e soma a casa.
   * A retenção de leituras (35d) limita o histórico real a ~1–2 meses; devolve o
   * que existe, sem inventar meses.
   */
  async monthly(
    userId: string,
    monthsBack = 6,
  ): Promise<{ rate: number; months: { month: string; kwh: number; cost: number }[] }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const rate = user.energyRate;
    const devices = await this.prisma.device.findMany({
      where: { userId, supportsEnergy: true },
      select: { id: true },
    });
    const ids = devices.map((d) => d.id);
    if (ids.length === 0) {
      return { rate, months: [] };
    }

    const since = new Date();
    since.setMonth(since.getMonth() - monthsBack);
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    // Agrega NO BANCO: maior kwhMonth acumulado de cada conexão em cada mês. Feito em
    // SQL para não esbarrar no teto de linhas — carregar as leituras cortaria os meses
    // recentes (uma janela longa tem muito mais que HISTORY_MAX_ROWS linhas).
    const rows = await this.prisma.$queryRaw<{ month: string; deviceMax: number }[]>(Prisma.sql`
      SELECT to_char(date_trunc('month', "readAt"), 'YYYY-MM') AS month,
             max("kwhMonth") AS "deviceMax"
      FROM "EnergyReading"
      WHERE "deviceId" IN (${Prisma.join(ids)})
        AND "readAt" >= ${since}
        AND "kwhMonth" IS NOT NULL
      GROUP BY month, "deviceId"
    `);

    // Soma a contribuição de cada conexão por mês.
    const byMonth = new Map<string, number>();
    for (const r of rows) {
      byMonth.set(r.month, (byMonth.get(r.month) ?? 0) + Number(r.deviceMax));
    }

    const months = [...byMonth.entries()]
      .map(([month, kwh]) => ({ month, kwh: round2(kwh), cost: round2(kwh * rate) }))
      .sort((a, b) => (a.month < b.month ? -1 : 1));

    return { rate, months };
  }

  private bucketKey(date: Date, granularity: EnergyGranularity): string {
    const d = new Date(date);
    if (granularity === 'day') {
      d.setHours(0, 0, 0, 0);
    } else if (granularity === 'minute') {
      d.setSeconds(0, 0);
    } else {
      d.setMinutes(0, 0, 0);
    }
    return d.toISOString();
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
