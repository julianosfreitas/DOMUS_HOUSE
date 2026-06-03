import { VoiceCommandParser, type ParsableDevice } from './voice-command.parser';

const DEVICES: ParsableDevice[] = [
  {
    id: 'l1',
    name: 'Luz da Sala',
    roomName: 'Sala',
    supportsBrightness: true,
    supportsColor: true,
  },
  {
    id: 'p1',
    name: 'Tomada da Cozinha',
    roomName: 'Cozinha',
    supportsBrightness: false,
    supportsColor: false,
  },
  {
    id: 'q1',
    name: 'Luz do Quarto',
    roomName: 'Quarto',
    supportsBrightness: true,
    supportsColor: false,
  },
];

describe('VoiceCommandParser', () => {
  const parser = new VoiceCommandParser();

  it.each([
    ['liga a luz da sala', 'turnOn', 'l1'],
    ['ligue a luz da sala', 'turnOn', 'l1'],
    ['acende a luz da sala', 'turnOn', 'l1'],
    ['desliga a luz da sala', 'turnOff', 'l1'],
    ['desligua a luz da sala', 'turnOff', 'l1'], // variação informal de sotaque
    ['apaga a luz da sala', 'turnOff', 'l1'],
    ['liga a tomada da cozinha', 'turnOn', 'p1'],
    ['acende a luz do quarto', 'turnOn', 'q1'],
  ])('"%s" → %s no dispositivo %s', (frase, intent, deviceId) => {
    const r = parser.parse(frase, DEVICES);
    expect(r.intent).toBe(intent);
    expect(r.deviceId).toBe(deviceId);
    expect(r.confidence).toBeGreaterThanOrEqual(0.6);
  });

  it('entende brilho em porcentagem', () => {
    const r = parser.parse('ajusta o brilho da luz da sala para 50%', DEVICES);
    expect(r.intent).toBe('setBrightness');
    expect(r.deviceId).toBe('l1');
    expect(r.payload?.brightness).toBe(50);
  });

  it('entende "por cento" por extenso', () => {
    const r = parser.parse('coloca a luz do quarto em 30 por cento', DEVICES);
    expect(r.intent).toBe('setBrightness');
    expect(r.deviceId).toBe('q1');
    expect(r.payload?.brightness).toBe(30);
  });

  it('entende cor a partir do dicionário pt-BR', () => {
    const r = parser.parse('deixa a luz da sala na cor azul', DEVICES);
    expect(r.intent).toBe('setColor');
    expect(r.deviceId).toBe('l1');
    expect(r.payload?.color).toBe('#1E66F5');
  });

  it('reduz a confiança quando o dispositivo não suporta a capacidade', () => {
    const r = parser.parse('muda a cor da tomada da cozinha para verde', DEVICES);
    expect(r.intent).toBe('setColor');
    expect(r.deviceId).toBe('p1');
    expect(r.confidence).toBeLessThan(0.6);
  });

  it('pede confirmação quando o dispositivo é ambíguo (sugere opções)', () => {
    const r = parser.parse('liga a luz', DEVICES);
    expect(r.suggestions?.length).toBeGreaterThan(1);
  });

  it('retorna unknown para frase sem comando', () => {
    const r = parser.parse('que horas são agora', DEVICES);
    expect(r.intent).toBe('unknown');
    expect(r.confidence).toBeLessThan(0.6);
  });

  it('assume o único dispositivo quando há só um', () => {
    const r = parser.parse('desliga', [DEVICES[0]]);
    expect(r.intent).toBe('turnOff');
    expect(r.deviceId).toBe('l1');
  });
});
