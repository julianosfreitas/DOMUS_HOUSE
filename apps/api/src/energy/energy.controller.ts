import { Controller, Get, Param, Query } from '@nestjs/common';
import { EnergyService } from './energy.service';
import { EnergyHistoryQueryDto } from './dto/energy-history.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';

@Controller()
export class EnergyController {
  constructor(private readonly energy: EnergyService) {}

  @Get('devices/:id/energy/history')
  history(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: EnergyHistoryQueryDto,
  ) {
    return this.energy.history(user.id, id, query.period, query.granularity);
  }

  @Get('energy/summary')
  summary(@CurrentUser() user: AuthUser) {
    return this.energy.summary(user.id);
  }
}
