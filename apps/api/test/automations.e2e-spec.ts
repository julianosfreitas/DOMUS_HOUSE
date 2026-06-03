import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, resetDb } from './test-utils';

describe('Automations & Scenes (e2e)', () => {
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

  async function setup(): Promise<{ token: string; deviceId: string }> {
    const s = await http
      .post('/api/auth/sign_up')
      .send({ email: 'a@casai.local', name: 'Ana', password: 'Senha@123' });
    const token = s.body.accessToken as string;
    const dev = await http
      .post('/api/devices')
      .set({ Authorization: `Bearer ${token}` })
      .send({ name: 'Luz', type: 'LIGHT', protocol: 'MOCK', supportsBrightness: true });
    return { token, deviceId: dev.body.id as string };
  }

  it('cria automação MANUAL e dispara com /run', async () => {
    const { token, deviceId } = await setup();
    const created = await http
      .post('/api/automations')
      .set({ Authorization: `Bearer ${token}` })
      .send({
        name: 'Ligar luz',
        triggerType: 'MANUAL',
        triggerConfig: {},
        actions: [{ deviceId, command: 'turnOn' }],
      })
      .expect(201);

    const run = await http
      .post(`/api/automations/${created.body.id}/run`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);
    expect(run.body.triggered).toBe(true);
    expect(run.body.results[0].ok).toBe(true);
  });

  it('aceita automação SCHEDULE com cron e a persiste', async () => {
    const { token, deviceId } = await setup();
    const created = await http
      .post('/api/automations')
      .set({ Authorization: `Bearer ${token}` })
      .send({
        name: 'Café da manhã',
        triggerType: 'SCHEDULE',
        triggerConfig: { time: '07:00', weekdays: [1, 2, 3, 4, 5] },
        conditions: [{ type: 'WEEKDAY', weekdays: [1, 2, 3, 4, 5] }],
        actions: [{ deviceId, command: 'turnOn' }],
      })
      .expect(201);
    expect(created.body.triggerType).toBe('SCHEDULE');
    expect(created.body.enabled).toBe(true);
  });

  it('rejeita automação com ação inválida (400)', async () => {
    const { token, deviceId } = await setup();
    await http
      .post('/api/automations')
      .set({ Authorization: `Bearer ${token}` })
      .send({
        name: 'Inválida',
        triggerType: 'MANUAL',
        triggerConfig: {},
        actions: [{ deviceId, command: 'explodir' }],
      })
      .expect(400);
  });

  it('cria cena e ativa executando as ações', async () => {
    const { token, deviceId } = await setup();
    const scene = await http
      .post('/api/scenes')
      .set({ Authorization: `Bearer ${token}` })
      .send({
        name: 'Modo noite',
        actions: [{ deviceId, command: 'setBrightness', brightness: 20 }],
      })
      .expect(201);

    const activate = await http
      .post(`/api/scenes/${scene.body.id}/activate`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);
    expect(activate.body.results[0].ok).toBe(true);
  });

  it('isolamento: usuário B não dispara automação de A', async () => {
    const { token, deviceId } = await setup();
    const created = await http
      .post('/api/automations')
      .set({ Authorization: `Bearer ${token}` })
      .send({
        name: 'A',
        triggerType: 'MANUAL',
        triggerConfig: {},
        actions: [{ deviceId, command: 'turnOn' }],
      });
    const other = await http
      .post('/api/auth/sign_up')
      .send({ email: 'b@casai.local', name: 'Bruno', password: 'Senha@123' });
    await http
      .post(`/api/automations/${created.body.id}/run`)
      .set({ Authorization: `Bearer ${other.body.accessToken}` })
      .expect(404);
  });
});
