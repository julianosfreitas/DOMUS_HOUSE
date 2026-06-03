import { Injectable, Logger } from '@nestjs/common';
import { DevicesService } from '../devices/devices.service';
import type { AutomationActionDto } from './automation.types';
import type { DeviceCommandDto } from '../devices/dto/device-command.dto';

export interface ActionResult {
  deviceId: string;
  command: string;
  ok: boolean;
  error?: string;
}

/**
 * Executa uma lista ordenada de ações respeitando delaySeconds. Cada ação passa
 * pelo DevicesService (logo, pela FILA serializada por dispositivo). Uma ação que
 * falha não interrompe as demais — registra o erro e segue.
 */
@Injectable()
export class ActionsRunner {
  private readonly logger = new Logger(ActionsRunner.name);

  constructor(private readonly devices: DevicesService) {}

  async run(userId: string, actions: AutomationActionDto[]): Promise<ActionResult[]> {
    const results: ActionResult[] = [];
    for (const action of actions) {
      if (action.delaySeconds && action.delaySeconds > 0) {
        await sleep(action.delaySeconds * 1000);
      }
      try {
        await this.devices.executeCommand(userId, action.deviceId, this.toCommand(action));
        results.push({ deviceId: action.deviceId, command: action.command, ok: true });
      } catch (err) {
        const message = (err as Error).message;
        this.logger.warn(`Ação falhou em ${action.deviceId}: ${message}`);
        results.push({
          deviceId: action.deviceId,
          command: action.command,
          ok: false,
          error: message,
        });
      }
    }
    return results;
  }

  private toCommand(action: AutomationActionDto): DeviceCommandDto {
    const dto: DeviceCommandDto = { command: action.command };
    if (action.brightness !== undefined) dto.brightness = action.brightness;
    if (action.color !== undefined) dto.color = action.color;
    if (action.colorTemp !== undefined) dto.colorTemp = action.colorTemp;
    return dto;
  }
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
