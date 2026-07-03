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

  it('histórico da casa (/energy/history) agrega e traz breakdown por conexão', async () => {
    const { token, deviceId } = await setup();
    await http
      .post(`/api/devices/${deviceId}/command`)
      .set({ Authorization: `Bearer ${token}` })
      .send({ command: 'turnOn' });
    await energy.pollOnce();
    await energy.pollOnce();

    const res = await http
      .get('/api/energy/history?period=24h&granularity=minute')
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);
    expect(Array.isArray(res.body.buckets)).toBe(true);
    expect(res.body.buckets.length).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(res.body.byDevice)).toBe(true);
    expect(res.body.byDevice[0]).toMatchObject({ deviceId, name: 'Tomada' });
    expect(res.body.byDevice[0].recentWatts).toBeGreaterThan(0);
  });

  it('comparativo mensal (/energy/monthly) soma o kwhMonth por mês', async () => {
    const { token, deviceId } = await setup();
    await http
      .post(`/api/devices/${deviceId}/command`)
      .set({ Authorization: `Bearer ${token}` })
      .send({ command: 'turnOn' });
    await energy.pollOnce();

    const res = await http
      .get('/api/energy/monthly')
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);
    expect(res.body.rate).toBeGreaterThan(0);
    expect(Array.isArray(res.body.months)).toBe(true);
    expect(res.body.months.length).toBeGreaterThanOrEqual(1);
    expect(res.body.months[0]).toHaveProperty('kwh');
    expect(res.body.months[0]).toHaveProperty('cost');
  });

  it('sem conexões de energia, history e monthly voltam vazios', async () => {
    const signup = await http
      .post('/api/auth/sign_up')
      .send({ email: 'c@casai.local', name: 'Caio', password: 'Senha@123' });
    const token = signup.body.accessToken as string;

    const h = await http
      .get('/api/energy/history')
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);
    expect(h.body.buckets).toEqual([]);
    expect(h.body.byDevice).toEqual([]);

    const m = await http
      .get('/api/energy/monthly')
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);
    expect(m.body.months).toEqual([]);
  });

  it('pruneOldReadings executa sem erro', async () => {
    await expect(energy.pruneOldReadings()).resolves.toBeGreaterThanOrEqual(0);
  });
});
