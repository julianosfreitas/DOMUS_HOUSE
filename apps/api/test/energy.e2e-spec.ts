import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { EnergyService } from '../src/energy/energy.service';
import { createTestApp, resetDb } from './test-utils';

describe('Energy (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let energy: EnergyService;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    energy = app.get(EnergyService);
    http = request(app.getHttpServer() as Parameters<typeof request>[0]);
  });

  beforeEach(async () => {
    await resetDb(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  async function setup(): Promise<{ token: string; deviceId: string }> {
    const signup = await http
      .post('/api/auth/sign_up')
      .send({ email: 'a@casai.local', name: 'Ana', password: 'Senha@123' });
    if (signup.status !== 201) {
      throw new Error(`signup falhou ${signup.status}: ${JSON.stringify(signup.body)}`);
    }
    const token = signup.body.accessToken as string;
    const dev = await http
      .post('/api/devices')
      .set({ Authorization: `Bearer ${token}` })
      .send({ name: 'Tomada', type: 'PLUG', protocol: 'MOCK', supportsEnergy: true });
    if (dev.status !== 201) {
      throw new Error(`device falhou ${dev.status}: ${JSON.stringify(dev.body)}`);
    }
    return { token, deviceId: dev.body.id as string };
  }

  it('pollOnce coleta energia do MOCK e o histórico/summary refletem', async () => {
    const { token, deviceId } = await setup();
    // Liga a tomada para gerar consumo > 0 no MockAdapter.
    await http
      .post(`/api/devices/${deviceId}/command`)
      .set({ Authorization: `Bearer ${token}` })
      .send({ command: 'turnOn' });

    const saved = await energy.pollOnce();
    expect(saved).toBeGreaterThanOrEqual(1);

    const hist = await http
      .get(`/api/devices/${deviceId}/energy/history?period=24h&granularity=hour`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);
    expect(hist.body.buckets.length).toBeGreaterThanOrEqual(1);

    const summary = await http
      .get('/api/energy/summary')
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);
    expect(summary.body).toHaveProperty('costMonth');
    expect(summary.body.rate).toBeGreaterThan(0);
  });

  it('histórico de dispositivo de outro usuário retorna 404', async () => {
    const { deviceId } = await setup();
    const other = await http
      .post('/api/auth/sign_up')
      .send({ email: 'b@casai.local', name: 'Bruno', password: 'Senha@123' });
    await http
      .get(`/api/devices/${deviceId}/energy/history`)
      .set({ Authorization: `Bearer ${other.body.accessToken}` })
      .expect(404);
  });
});
