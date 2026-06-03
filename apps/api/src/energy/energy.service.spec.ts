import { NotFoundException } from '@nestjs/common';
import { EnergyService } from './energy.service';

describe('EnergyService', () => {
  let prisma: {
    energyReading: { create: jest.Mock; findMany: jest.Mock; findFirst: jest.Mock };
    device: { count: jest.Mock; findMany: jest.Mock };
    user: { findUniqueOrThrow: jest.Mock };
  };
  let devices: { listEnergyDevices: jest.Mock; pollEnergy: jest.Mock };
  let events: { emitEnergyReading: jest.Mock };
  let service: EnergyService;

  beforeEach(() => {
    prisma = {
      energyReading: {
        create: jest.fn().mockResolvedValue({}),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      device: { count: jest.fn(), findMany: jest.fn() },
      user: { findUniqueOrThrow: jest.fn() },
    };
    devices = { listEnergyDevices: jest.fn(), pollEnergy: jest.fn() };
    events = { emitEnergyReading: jest.fn() };
    const config = { get: jest.fn(() => '5') };
    const scheduler = { addInterval: jest.fn(), deleteInterval: jest.fn(), doesExist: jest.fn() };
    service = new EnergyService(
      prisma as never,
      devices as never,
      events as never,
      config as never,
      scheduler as never,
    );
  });

  it('pollOnce salva leitura e faz broadcast por dispositivo', async () => {
    devices.listEnergyDevices.mockResolvedValue([{ id: 'd1', userId: 'u1' }]);
    devices.pollEnergy.mockResolvedValue({ watts: 110, kwhToday: 0.4, kwhMonth: 12 });

    const saved = await service.pollOnce();

    expect(saved).toBe(1);
    expect(prisma.energyReading.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ deviceId: 'd1', watts: 110 }) }),
    );
    expect(events.emitEnergyReading).toHaveBeenCalledWith('u1', 'd1', 110, expect.any(Date));
  });

  it('pollOnce pula dispositivo offline sem derrubar o ciclo', async () => {
    devices.listEnergyDevices.mockResolvedValue([
      { id: 'd1', userId: 'u1' },
      { id: 'd2', userId: 'u1' },
    ]);
    devices.pollEnergy
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ watts: 50 });

    const saved = await service.pollOnce();
    expect(saved).toBe(1);
  });

  it('summary calcula custo em R$ e projeção mensal', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({ energyRate: 1.0 });
    prisma.device.findMany.mockResolvedValue([{ id: 'd1' }]);
    prisma.energyReading.findFirst.mockResolvedValue({ watts: 100, kwhToday: 2, kwhMonth: 30 });

    const s = await service.summary('u1');
    expect(s.kwhToday).toBe(2);
    expect(s.costToday).toBe(2); // 2 kWh * R$1.00
    expect(s.costMonth).toBe(30);
    expect(s.projectedMonthlyCost).toBeGreaterThan(0);
  });

  it('history lança NotFound se o dispositivo não é do usuário', async () => {
    prisma.device.count.mockResolvedValue(0);
    await expect(service.history('u1', 'x', '24h', 'hour')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('history agrupa leituras por balde (hora)', async () => {
    prisma.device.count.mockResolvedValue(1);
    const base = new Date('2026-06-01T10:05:00.000Z');
    const sameHour = new Date('2026-06-01T10:40:00.000Z');
    prisma.energyReading.findMany.mockResolvedValue([
      { watts: 100, readAt: base },
      { watts: 200, readAt: sameHour },
    ]);
    const res = await service.history('u1', 'd1', '24h', 'hour');
    expect(res.buckets).toHaveLength(1);
    expect(res.buckets[0].avgWatts).toBe(150);
    expect(res.buckets[0].samples).toBe(2);
  });
});
