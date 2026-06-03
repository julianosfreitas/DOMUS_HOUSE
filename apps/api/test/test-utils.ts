import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

export async function createTestApp(): Promise<{ app: INestApplication; prisma: PrismaService }> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.setGlobalPrefix('api', { exclude: ['health'] });
  await app.init();
  const prisma = app.get(PrismaService);
  return { app, prisma };
}

/** Limpa todas as tabelas de dados de usuário (ordem respeita as FKs via cascade). */
export async function resetDb(prisma: PrismaService): Promise<void> {
  await prisma.energyReading.deleteMany();
  await prisma.voiceCommand.deleteMany();
  await prisma.automation.deleteMany();
  await prisma.scene.deleteMany();
  await prisma.device.deleteMany();
  await prisma.room.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
}
