import { Module } from '@nestjs/common';
import { EnergyService } from './energy.service';
import { EnergyController } from './energy.controller';
import { DevicesModule } from '../devices/devices.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [DevicesModule, WebsocketModule],
  controllers: [EnergyController],
  providers: [EnergyService],
  exports: [EnergyService],
})
export class EnergyModule {}
