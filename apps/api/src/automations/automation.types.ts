import {
  IsArray,
  IsHexColor,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';

// 'HH:MM' 24h: 00:00–23:59. Usado para validar horários de gatilho/condição.
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
import { Type } from 'class-transformer';
import { DEVICE_COMMANDS, type DeviceCommandName } from '../devices/dto/device-command.dto';

/** Uma ação de automação/cena: um comando a um dispositivo, com atraso opcional. */
export class AutomationActionDto {
  @IsString()
  deviceId!: string;

  @IsIn(DEVICE_COMMANDS)
  command!: DeviceCommandName;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  brightness?: number;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(7000)
  colorTemp?: number;

  // Atraso antes de executar esta ação (encadeamento de cena). Padrão 0.
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3600)
  delaySeconds?: number;
}

export const CONDITION_TYPES = ['TIME_RANGE', 'WEEKDAY'] as const;
export type ConditionType = (typeof CONDITION_TYPES)[number];

/** Condição avaliada antes de uma automação disparar. */
export class AutomationConditionDto {
  @IsIn(CONDITION_TYPES)
  type!: ConditionType;

  // TIME_RANGE: 'HH:MM' (suporta faixa que cruza a meia-noite, ex 22:00→06:00)
  @IsOptional()
  @IsString()
  @Matches(HHMM, { message: 'start deve estar no formato HH:MM' })
  start?: string;

  @IsOptional()
  @IsString()
  @Matches(HHMM, { message: 'end deve estar no formato HH:MM' })
  end?: string;

  // WEEKDAY: dias da semana 0=Dom .. 6=Sáb
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  weekdays?: number[];
}

/** Configuração do gatilho SCHEDULE: cron direto OU horário + dias. */
export class TriggerConfigDto {
  @IsOptional()
  @IsString()
  cron?: string;

  @IsOptional()
  @IsString()
  @Matches(HHMM, { message: 'time deve estar no formato HH:MM' })
  time?: string; // 'HH:MM'

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  weekdays?: number[];
}

export class CreateAutomationDto {
  @IsString()
  name!: string;

  @IsOptional()
  enabled?: boolean;

  @IsIn(['SCHEDULE', 'MANUAL'])
  triggerType!: 'SCHEDULE' | 'MANUAL';

  @ValidateNested()
  @Type(() => TriggerConfigDto)
  triggerConfig!: TriggerConfigDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AutomationConditionDto)
  conditions?: AutomationConditionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AutomationActionDto)
  actions!: AutomationActionDto[];
}
