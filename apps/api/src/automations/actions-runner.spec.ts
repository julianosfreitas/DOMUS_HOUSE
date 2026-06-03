import { ActionsRunner } from './actions-runner';
import type { AutomationActionDto } from './automation.types';

describe('ActionsRunner', () => {
  it('executa as ações em ordem, passando pelo DevicesService', async () => {
    const calls: string[] = [];
    const devices = {
      executeCommand: jest.fn(async (_u: string, deviceId: string) => {
        calls.push(deviceId);
      }),
    };
    const runner = new ActionsRunner(devices as never);
    const actions: AutomationActionDto[] = [
      { deviceId: 'a', command: 'turnOn' },
      { deviceId: 'b', command: 'turnOff' },
    ];

    const results = await runner.run('u1', actions);
    expect(calls).toEqual(['a', 'b']);
    expect(results.every((r) => r.ok)).toBe(true);
  });

  it('uma ação que falha não interrompe as demais', async () => {
    const devices = {
      executeCommand: jest
        .fn()
        .mockRejectedValueOnce(new Error('offline'))
        .mockResolvedValueOnce(undefined),
    };
    const runner = new ActionsRunner(devices as never);
    const results = await runner.run('u1', [
      { deviceId: 'a', command: 'turnOn' },
      { deviceId: 'b', command: 'turnOn' },
    ]);
    expect(results[0].ok).toBe(false);
    expect(results[0].error).toBe('offline');
    expect(results[1].ok).toBe(true);
  });

  it('repassa o payload (brilho/cor) ao comando', async () => {
    const devices = { executeCommand: jest.fn().mockResolvedValue(undefined) };
    const runner = new ActionsRunner(devices as never);
    await runner.run('u1', [{ deviceId: 'a', command: 'setBrightness', brightness: 40 }]);
    expect(devices.executeCommand).toHaveBeenCalledWith('u1', 'a', {
      command: 'setBrightness',
      brightness: 40,
    });
  });
});
