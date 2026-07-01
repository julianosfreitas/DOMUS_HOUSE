import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  UnprocessableEntityException,
} from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob, CronTime } from 'cron';
import { Prisma, type Automation } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DeviceEvents } from '../devices/device-events';
import { ActionsRunner, type ActionResult } from './actions-runner';
import { evaluateConditions } from './conditions';
import type {
  AutomationActionDto,
  AutomationConditionDto,
  CreateAutomationDto,
  TriggerConfigDto,
} from './automation.types';
import type { UpdateAutomationDto } from './update-automation.dto';

const jobName = (id: string): string => `automation:${id}`;

@Injectable()
export class AutomationsService implements OnModuleInit {
  private readonly logger = new Logger(AutomationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduler: SchedulerRegistry,
    private readonly runner: ActionsRunner,
    private readonly events: DeviceEvents,
  ) {}

  async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    // Reagenda automações SCHEDULE habilitadas ao subir o hub.
    const automations = await this.prisma.automation.findMany({
      where: { enabled: true, triggerType: 'SCHEDULE' },
    });
    for (const a of automations) {
      this.schedule(a);
    }
    this.logger.log(`${automations.length} automação(ões) agendada(s)`);
  }

  list(userId: string): Promise<Automation[]> {
    return this.prisma.automation.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
  }

  async get(userId: string, id: string): Promise<Automation> {
    const a = await this.prisma.automation.findFirst({ where: { id, userId } });
    if (!a) {
      throw new NotFoundException('Automação não encontrada');
    }
    return a;
  }

  async create(userId: string, dto: CreateAutomationDto): Promise<Automation> {
    this.validateSchedule(dto.triggerType, dto.triggerConfig);
    const automation = await this.prisma.automation.create({
      data: {
        userId,
        name: dto.name,
        enabled: dto.enabled ?? true,
        triggerType: dto.triggerType,
        triggerConfig: dto.triggerConfig as unknown as Prisma.InputJsonValue,
        conditions: (dto.conditions ?? []) as unknown as Prisma.InputJsonValue,
        actions: dto.actions as unknown as Prisma.InputJsonValue,
      },
    });
    this.reschedule(automation);
    return automation;
  }

  async update(userId: string, id: string, dto: UpdateAutomationDto): Promise<Automation> {
    const existing = await this.get(userId, id);
    // Valida com a configuração EFETIVA (merge do que veio no PATCH + o já gravado)
    // antes do UPDATE — evita persistir um agendamento que estouraria no scheduler.
    this.validateSchedule(
      dto.triggerType ?? existing.triggerType,
      (dto.triggerConfig ?? existing.triggerConfig) as unknown as TriggerConfigDto,
    );
    const automation = await this.prisma.automation.update({
      where: { id },
      data: {
        name: dto.name,
        enabled: dto.enabled,
        triggerType: dto.triggerType,
        triggerConfig: dto.triggerConfig as unknown as Prisma.InputJsonValue,
        conditions: dto.conditions as unknown as Prisma.InputJsonValue,
        actions: dto.actions as unknown as Prisma.InputJsonValue,
      },
    });
    this.reschedule(automation);
    return automation;
  }

  async remove(userId: string, id: string): Promise<{ ok: true }> {
    await this.get(userId, id);
    this.unschedule(id);
    await this.prisma.automation.delete({ where: { id } });
    return { ok: true };
  }

  /** Execução manual ("simular agora") — roda as ações ignorando as condições. */
  async run(userId: string, id: string): Promise<{ triggered: boolean; results: ActionResult[] }> {
    const automation = await this.get(userId, id);
    const results = await this.runner.run(userId, this.actionsOf(automation));
    this.events.emitAutomationTriggered(userId, automation.id, automation.name);
    return { triggered: true, results };
  }

  // ───────────────────────── agendamento ─────────────────────────

  private reschedule(automation: Automation): void {
    this.unschedule(automation.id);
    if (automation.enabled && automation.triggerType === 'SCHEDULE') {
      this.schedule(automation);
    }
  }

  private schedule(automation: Automation): void {
    const cronTime = this.toCron(this.triggerOf(automation));
    if (!cronTime) {
      this.logger.warn(`Automação ${automation.id} sem cron válido — não agendada`);
      return;
    }
    try {
      const job = new CronJob(cronTime, () => {
        void this.fire(automation.id);
      });
      this.scheduler.addCronJob(jobName(automation.id), job as unknown as CronJob);
      job.start();
    } catch (e: unknown) {
      // Cron inválido em runtime/boot não pode derrubar o app nem interromper o
      // reagendamento das demais automações (onModuleInit itera sobre todas).
      this.logger.error(`Automação ${automation.id} não agendada (cron inválido): ${String(e)}`);
    }
  }

  /**
   * Valida a configuração de horário ANTES de persistir. Sem isso, um cron malformado
   * só estouraria no agendamento (depois do INSERT), deixando a automação gravada porém
   * inagendável e respondendo 500.
   */
  private validateSchedule(triggerType: string, trigger: TriggerConfigDto): void {
    if (triggerType !== 'SCHEDULE') {
      return;
    }
    const cronTime = this.toCron(trigger);
    if (!cronTime) {
      throw new UnprocessableEntityException(
        'Configuração de horário inválida: informe "time" (HH:MM) ou "cron".',
      );
    }
    if (!this.isValidCron(cronTime)) {
      throw new UnprocessableEntityException('Expressão de horário (cron) inválida.');
    }
  }

  private isValidCron(expr: string): boolean {
    try {
      const t = new CronTime(expr);
      return Boolean(t);
    } catch {
      return false;
    }
  }

  private unschedule(id: string): void {
    if (this.scheduler.doesExist('cron', jobName(id))) {
      this.scheduler.deleteCronJob(jobName(id));
    }
  }

  /** Disparo agendado: recarrega, checa enabled e condições, então executa. */
  private async fire(id: string): Promise<void> {
    const automation = await this.prisma.automation.findUnique({ where: { id } });
    if (!automation || !automation.enabled) {
      return;
    }
    if (!evaluateConditions(this.conditionsOf(automation), new Date())) {
      this.logger.debug(`Automação ${id} não disparou: condições não satisfeitas`);
      return;
    }
    await this.runner.run(automation.userId, this.actionsOf(automation));
    this.events.emitAutomationTriggered(automation.userId, automation.id, automation.name);
  }

  /** Converte time+weekdays em expressão cron; ou usa o cron explícito. */
  private toCron(trigger: TriggerConfigDto): string | null {
    if (trigger.cron) {
      return trigger.cron;
    }
    if (trigger.time) {
      const [h, m] = trigger.time.split(':').map(Number);
      const dow = trigger.weekdays && trigger.weekdays.length ? trigger.weekdays.join(',') : '*';
      return `${m || 0} ${h || 0} * * ${dow}`;
    }
    return null;
  }

  // ───────── desserialização dos campos Json ─────────

  private triggerOf(a: Automation): TriggerConfigDto {
    return a.triggerConfig as unknown as TriggerConfigDto;
  }
  private conditionsOf(a: Automation): AutomationConditionDto[] {
    return (a.conditions as unknown as AutomationConditionDto[]) ?? [];
  }
  private actionsOf(a: Automation): AutomationActionDto[] {
    return (a.actions as unknown as AutomationActionDto[]) ?? [];
  }
}
