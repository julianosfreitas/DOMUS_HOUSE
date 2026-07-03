import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, resetDb } from './test-utils';

describe('Voice (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    http = request(app.getHttpServer() as Parameters<typeof request>[0]);
  });

  beforeEach(async () => {
    await resetDb(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  async function setup(): Promise<{ token: string }> {
    const s = await http
      .post('/api/auth/sign_up')
      .send({ email: 'a@casai.local', name: 'Ana', password: 'Senha@123' });
    const token = s.body.accessToken as string;
    await http
      .post('/api/devices')
      .set({ Authorization: `Bearer ${token}` })
      .send({ name: 'Luz da Sala', type: 'LIGHT', protocol: 'MOCK', supportsBrightness: true });
    return { token };
  }

  it('comando por texto executa a ação (liga a luz da sala)', async () => {
    const { token } = await setup();
    const res = await http
      .post('/api/voice/command')
      .set({ Authorization: `Bearer ${token}` })
      .send({ text: 'liga a luz da sala' })
      .expect(200);
    expect(res.body.executed).toBe(true);
    expect(res.body.intent).toBe('turnOn');
    expect(res.body.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('frase sem comando pede confirmação e não executa', async () => {
    const { token } = await setup();
    const res = await http
      .post('/api/voice/command')
      .set({ Authorization: `Bearer ${token}` })
      .send({ text: 'bom dia minha casa' })
      .expect(200);
    expect(res.body.executed).toBe(false);
    expect(res.body.needsConfirmation).toBe(true);
  });

  it('transcribe sem arquivo de áudio retorna 400', async () => {
    const { token } = await setup();
    await http
      .post('/api/voice/transcribe')
      .set({ Authorization: `Bearer ${token}` })
      .expect(400);
  });

  it('o comando de voz é registrado na tabela voice_commands (métrica do TCC)', async () => {
    const { token } = await setup();
    await http
      .post('/api/voice/command')
      .set({ Authorization: `Bearer ${token}` })
      .send({ text: 'liga a luz da sala' });
    const count = await prisma.voiceCommand.count();
    expect(count).toBe(1);
  });

  it('/voice/stats agrega as métricas de voz do usuário', async () => {
    const { token } = await setup();
    await http
      .post('/api/voice/command')
      .set({ Authorization: `Bearer ${token}` })
      .send({ text: 'liga a luz da sala' });
    await http
      .post('/api/voice/command')
      .set({ Authorization: `Bearer ${token}` })
      .send({ text: 'bom dia minha casa' });

    const res = await http
      .get('/api/voice/stats')
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);
    expect(res.body.total).toBe(2);
    expect(res.body.successCount).toBeGreaterThanOrEqual(1);
    expect(res.body.successRate).toBeGreaterThan(0);
    expect(res.body.latencyP50).toBeGreaterThanOrEqual(0);
    expect(res.body.latencyP95).toBeGreaterThanOrEqual(0);
    expect(res.body).toHaveProperty('avgConfidence');
  });

  it('/voice/stats sem comandos volta zerado (null nas métricas)', async () => {
    const { token } = await setup();
    const res = await http
      .get('/api/voice/stats')
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);
    expect(res.body.total).toBe(0);
    expect(res.body.successRate).toBeNull();
    expect(res.body.latencyP50).toBeNull();
    expect(res.body.avgConfidence).toBeNull();
  });
});
