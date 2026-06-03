import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Headers de segurança (CLAUDE.md / Passo 3). Na LAN não usamos TLS no MVP.
  app.use(helmet());

  // CORS restrito à origem do dashboard web.
  const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
  app.enableCors({ origin: webOrigin, credentials: true });

  // Validação global: nunca confiar no body cru.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api', { exclude: ['health'] });

  // Documentação OpenAPI em /docs (com auth Bearer).
  const swaggerConfig = new DocumentBuilder()
    .setTitle('CASAI API')
    .setDescription('API do hub CASAI — dispositivos, energia, voz, automações e cenas.')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  Logger.log(`CASAI API ouvindo em http://localhost:${port}`, 'Bootstrap');
}

void bootstrap();
