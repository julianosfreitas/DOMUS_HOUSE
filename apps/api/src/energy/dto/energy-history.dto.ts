import { IsIn, IsOptional } from 'class-validator';
import type { EnergyGranularity, EnergyPeriod } from '../energy.service';

export class EnergyHistoryQueryDto {
  @IsOptional()
  @IsIn(['24h', '7d', '30d'])
  period: EnergyPeriod = '24h';

  @IsOptional()
  @IsIn(['hour', 'day'])
  granularity: EnergyGranularity = 'hour';
}
