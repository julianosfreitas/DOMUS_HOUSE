import { Module } from '@nestjs/common';
import { AutomationsService } from './automations.service';
import { AutomationsController } from './automations.controller';
import { ActionsRunner } from './actions-runner';
import { DevicesModule } from '../devices/devices.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [DevicesModule, WebsocketModule],
  controllers: [AutomationsController],
  providers: [AutomationsService, ActionsRunner],
  // ActionsRunner é reutilizado pelo módulo de cenas.
  exports: [ActionsRunner],
})
export class AutomationsModule {}
