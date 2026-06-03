import { Module } from '@nestjs/common';
import { ScenesService } from './scenes.service';
import { ScenesController } from './scenes.controller';
import { AutomationsModule } from '../automations/automations.module';

@Module({
  // AutomationsModule fornece o ActionsRunner reutilizado pelas cenas.
  imports: [AutomationsModule],
  controllers: [ScenesController],
  providers: [ScenesService],
})
export class ScenesModule {}
