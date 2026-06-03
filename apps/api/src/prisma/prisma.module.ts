import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// Global: PrismaService fica disponível para injeção em qualquer módulo sem reimportar.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
