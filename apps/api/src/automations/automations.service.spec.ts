import { UnprocessableEntityException } from '@nestjs/common';
import { AutomationsService } from './automations.service';

/**
 * Cobre a validação de agendamento adicionada para evitar 500 com a automação já
 * gravada: cron malformado / config vazia precisa falhar ANTES do INSERT/UPDATE.
 * Os caminhos felizes de SCHEDULE (que iniciam um CronJob real) ficam no e2e.
 */
describe('AutomationsService — validação de agendamento', () => {
  let prisma: {
    automation: {
      create: jest.Mock;
      update: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      delete: jest.Mock;
    };
  };
  let scheduler: { addCronJob: jest.Mock; deleteCronJob: jest.Mock; doesExist: jest.Mock };
  let runner: { run: jest.Mock };
  let events: { emitAutomationTriggered: jest.Mock };
  let service: AutomationsService;

  beforeEach(() => {
    prisma = {
      automation: {
        create: jest.fn().mockResolvedValue({ id: 'a1', triggerType: 'MANUAL' }),
        update: jest.fn().mockResolvedValue({ id: 'a1', triggerType: 'MANUAL' }),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        delete: jest.fn().mockResolvedValue({}),
      },
    };
    scheduler = {
      addCronJob: jest.fn(),
      deleteCronJob: jest.fn(),
      doesExist: jest.fn().mockReturnValue(false),
    };
    runner = { run: jest.fn().mockResolvedValue([]) };
    events = { emitAutomationTriggered: jest.fn() };
    service = new AutomationsService(
      prisma as never,
      scheduler as never,
      runner as never,
      events as never,
    );
  });

  it('create SCHEDULE sem time/cron é rejeitado antes de persistir', async () => {
    await expect(
      service.create('u1', {
        name: 'R',
        triggerType: 'SCHEDULE',
        triggerConfig: {},
        actions: [],
      } as never),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(prisma.automation.create).not.toHaveBeenCalled();
  });

  it('create SCHEDULE com cron inválido é rejeitado antes de persistir', async () => {
    await expect(
      service.create('u1', {
        name: 'R',
        triggerType: 'SCHEDULE',
        triggerConfig: { cron: 'isto não é cron' },
        actions: [],
      } as never),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(prisma.automation.create).not.toHaveBeenCalled();
  });

  it('create MANUAL não exige horário e persiste sem agendar', async () => {
    await service.create('u1', {
      name: 'R',
      triggerType: 'MANUAL',
      triggerConfig: {},
      actions: [],
    } as never);
    expect(prisma.automation.create).toHaveBeenCalled();
    expect(scheduler.addCronJob).not.toHaveBeenCalled();
  });

  it('update SCHEDULE com cron inválido é rejeitado antes de persistir', async () => {
    prisma.automation.findFirst.mockResolvedValue({
      id: 'a1',
      userId: 'u1',
      triggerType: 'SCHEDULE',
      triggerConfig: { time: '07:00' },
    });
    await expect(
      service.update('u1', 'a1', { triggerConfig: { cron: 'xyz' } } as never),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(prisma.automation.update).not.toHaveBeenCalled();
  });
});
