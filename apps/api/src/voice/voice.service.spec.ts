import { BadRequestException } from '@nestjs/common';
import { VoiceService } from './voice.service';
import { VoiceCommandParser } from './voice-command.parser';

describe('VoiceService', () => {
  let prisma: {
    device: { findMany: jest.Mock };
    voiceCommand: { create: jest.Mock };
  };
  let devices: { executeCommand: jest.Mock };
  let stt: { transcribe: jest.Mock };
  let service: VoiceService;

  const seededDevices = [
    {
      id: 'l1',
      name: 'Luz da Sala',
      supportsBrightness: true,
      supportsColor: true,
      room: { name: 'Sala' },
    },
  ];

  beforeEach(() => {
    prisma = {
      device: { findMany: jest.fn().mockResolvedValue(seededDevices) },
      voiceCommand: { create: jest.fn().mockResolvedValue({}) },
    };
    devices = { executeCommand: jest.fn().mockResolvedValue({ on: true }) };
    stt = { transcribe: jest.fn() };
    const config = { get: jest.fn(() => 'pt') };
    service = new VoiceService(
      prisma as never,
      devices as never,
      stt as never,
      new VoiceCommandParser(),
      config as never,
    );
  });

  it('executa o comando quando a intenção é clara e registra a métrica', async () => {
    const res = await service.command('u1', { text: 'liga a luz da sala' });

    expect(res.executed).toBe(true);
    expect(res.intent).toBe('turnOn');
    expect(devices.executeCommand).toHaveBeenCalledWith('u1', 'l1', { command: 'turnOn' });
    // métrica do TCC: latência registrada
    expect(prisma.voiceCommand.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ success: true, latencyMs: expect.any(Number) }),
      }),
    );
  });

  it('pede confirmação (não executa) quando a frase não tem comando', async () => {
    const res = await service.command('u1', { text: 'bom dia casa' });
    expect(res.executed).toBe(false);
    expect(res.needsConfirmation).toBe(true);
    expect(devices.executeCommand).not.toHaveBeenCalled();
  });

  it('transcreve o áudio quando não há texto', async () => {
    stt.transcribe.mockResolvedValue('liga a luz da sala');
    const res = await service.command('u1', { audio: Buffer.from('fake') });
    expect(stt.transcribe).toHaveBeenCalled();
    expect(res.transcript).toBe('liga a luz da sala');
    expect(res.executed).toBe(true);
  });

  it('rejeita quando não há texto nem áudio', async () => {
    await expect(service.command('u1', {})).rejects.toBeInstanceOf(BadRequestException);
  });
});
