/**
 * Dados de demonstração do CASAI — usados pelo seed (`prisma db seed`) e pelo
 * DEMO_MODE (deploy público). Sem dependências do Nest: dados puros.
 */

export const DEMO_USER = {
  email: 'dev@casai.local',
  name: 'Casa Demo',
  password: 'Senha@123',
};

export const DEMO_ROOMS = [
  { name: 'Sala', order: 0 },
  { name: 'Quarto', order: 1 },
  { name: 'Cozinha', order: 2 },
] as const;

export interface DemoDevice {
  name: string;
  type: 'LIGHT' | 'PLUG';
  protocol: 'MOCK' | 'TUYA' | 'TUYA_CLOUD' | 'TAPO' | 'HOME_ASSISTANT';
  room: string;
  ip?: string;
  supportsBrightness?: boolean;
  supportsColor?: boolean;
  supportsColorTemp?: boolean;
  supportsEnergy?: boolean;
  lastState: { on: boolean; brightness?: number };
}

// Apenas dispositivos FÍSICOS do TCC — a lâmpada Intelbras/Tuya (EWS 410) e a
// tomada TP-Link Tapo (P110). Sem simulados (MOCK). As credenciais dos aparelhos
// são cadastradas pelo usuário no app (nunca no seed).
export const DEMO_DEVICES: DemoDevice[] = [
  {
    name: 'Lâmpada Tuya EWS 410',
    type: 'LIGHT',
    protocol: 'TUYA',
    room: 'Sala',
    supportsBrightness: true,
    supportsColor: true,
    supportsColorTemp: true,
    lastState: { on: false, brightness: 80 },
  },
  {
    name: 'Tomada Tapo P110',
    type: 'PLUG',
    protocol: 'TAPO',
    room: 'Cozinha',
    ip: '192.168.25.64',
    supportsEnergy: true,
    lastState: { on: false },
  },
];

interface DemoAction {
  deviceName: string;
  command: 'turnOn' | 'turnOff' | 'setBrightness' | 'setColorTemp';
  brightness?: number;
  colorTemp?: number;
  delaySeconds?: number;
}

export interface DemoAutomation {
  name: string;
  triggerConfig: { time: string; weekdays?: number[] };
  actions: DemoAction[];
}

/** Rotinas de exemplo — contam a história da demo (acordar, café, dormir, economizar). */
export const DEMO_AUTOMATIONS: DemoAutomation[] = [
  {
    name: '☀️ Bom dia',
    triggerConfig: { time: '07:00', weekdays: [1, 2, 3, 4, 5] },
    actions: [
      { deviceName: 'Lâmpada Tuya EWS 410', command: 'turnOn' },
      { deviceName: 'Lâmpada Tuya EWS 410', command: 'setBrightness', brightness: 80 },
    ],
  },
  {
    name: '☕ Café da manhã',
    triggerConfig: { time: '06:50', weekdays: [1, 2, 3, 4, 5] },
    actions: [
      { deviceName: 'Tomada Tapo P110', command: 'turnOn' },
      // Desliga sozinha meia hora depois — café pronto, sem desperdício.
      { deviceName: 'Tomada Tapo P110', command: 'turnOff', delaySeconds: 1800 },
    ],
  },
  {
    name: '🌙 Boa noite',
    triggerConfig: { time: '23:00' },
    actions: [
      { deviceName: 'Lâmpada Tuya EWS 410', command: 'turnOff' },
      { deviceName: 'Tomada Tapo P110', command: 'turnOff' },
    ],
  },
  {
    name: '💸 Economia na madrugada',
    triggerConfig: { time: '00:30' },
    actions: [{ deviceName: 'Tomada Tapo P110', command: 'turnOff' }],
  },
];

export interface DemoScene {
  name: string;
  icon: string;
  actions: DemoAction[];
}

export const DEMO_SCENES: DemoScene[] = [
  {
    name: '🎬 Modo cinema',
    icon: 'clapperboard',
    actions: [
      { deviceName: 'Lâmpada Tuya EWS 410', command: 'turnOn' },
      { deviceName: 'Lâmpada Tuya EWS 410', command: 'setBrightness', brightness: 20 },
    ],
  },
  {
    name: '🏠 Cheguei em casa',
    icon: 'house',
    actions: [
      { deviceName: 'Lâmpada Tuya EWS 410', command: 'turnOn' },
      { deviceName: 'Lâmpada Tuya EWS 410', command: 'setBrightness', brightness: 100 },
      { deviceName: 'Tomada Tapo P110', command: 'turnOn' },
    ],
  },
  {
    name: '🌅 Acordar suave',
    icon: 'sunrise',
    actions: [
      { deviceName: 'Lâmpada Tuya EWS 410', command: 'turnOn' },
      { deviceName: 'Lâmpada Tuya EWS 410', command: 'setBrightness', brightness: 30 },
      { deviceName: 'Lâmpada Tuya EWS 410', command: 'setColorTemp', colorTemp: 3000 },
    ],
  },
];

/** Converte ações de demo (por nome) em ações persistíveis (por id). */
export function resolveActions(
  actions: DemoAction[],
  deviceIdByName: Record<string, string>,
): Array<Record<string, unknown>> {
  return actions.map(({ deviceName, ...rest }) => ({
    deviceId: deviceIdByName[deviceName],
    ...rest,
  }));
}
