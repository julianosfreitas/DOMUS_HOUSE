// Tipos compartilhados entre o backend (apps/api) e o dashboard web (apps/web).
// Espelham contratos estáveis; mantenha em sincronia com o adapter e os DTOs.

export type Protocol = 'TUYA' | 'TAPO' | 'MOCK' | 'ZIGBEE';
export type DeviceType = 'LIGHT' | 'PLUG' | 'SWITCH' | 'SENSOR' | 'OTHER';
export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'UNKNOWN';

export interface DeviceState {
  on: boolean;
  brightness?: number; // 0-100
  color?: string; // hex
  colorTemp?: number; // kelvin
}

export interface EnergyData {
  watts: number;
  kwhToday?: number;
  kwhMonth?: number;
}

export type DeviceCommand =
  | { command: 'turnOn' }
  | { command: 'turnOff' }
  | { command: 'toggle' }
  | { command: 'setBrightness'; value: number }
  | { command: 'setColor'; hex: string }
  | { command: 'setColorTemp'; kelvin: number };

// Eventos do WebSocket (servidor → cliente)
export interface ServerToClientEvents {
  'device:status_changed': (p: { deviceId: string; state: DeviceState; status: DeviceStatus }) => void;
  'device:offline': (p: { deviceId: string }) => void;
  'energy:reading': (p: { deviceId: string; watts: number; readAt: string }) => void;
  'automation:triggered': (p: { automationId: string; name: string }) => void;
}

export interface VoiceIntent {
  intent: 'turnOn' | 'turnOff' | 'setBrightness' | 'setColor' | 'unknown';
  deviceId?: string;
  payload?: Record<string, unknown>;
  confidence: number;
  suggestions?: string[];
}
