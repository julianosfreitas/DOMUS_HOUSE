import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, resetDb } from './test-utils';

describe('Auth (e2e)', () => {
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

  const signUp = (email: string) =>
    http.post('/api/auth/sign_up').send({ email, name: 'Teste', password: 'Senha@123' });

  it('sign_up cria conta e retorna tokens', async () => {
    const res = await signUp('a@casai.local');
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it('sign_in com senha correta retorna 200 + tokens', async () => {
    await signUp('a@casai.local');
    const res = await http
      .post('/api/auth/sign_in')
      .send({ email: 'a@casai.local', password: 'Senha@123' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });

  it('sign_in com senha errada retorna 401', async () => {
    await signUp('a@casai.local');
    const res = await http
      .post('/api/auth/sign_in')
      .send({ email: 'a@casai.local', password: 'errada' });
    expect(res.status).toBe(401);
  });

  it('rota protegida sem token retorna 401', async () => {
    const res = await http.get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rota protegida com token válido retorna o usuário', async () => {
    const { body } = await signUp('a@casai.local');
    const res = await http.get('/api/auth/me').set('Authorization', `Bearer ${body.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('a@casai.local');
  });

  it('refresh emite novo access token', async () => {
    const { body } = await signUp('a@casai.local');
    const res = await http.post('/api/auth/refresh').send({ refreshToken: body.refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });

  it('sign_out revoga o refresh token (refresh subsequente falha)', async () => {
    const { body } = await signUp('a@casai.local');
    await http
      .post('/api/auth/sign_out')
      .set('Authorization', `Bearer ${body.accessToken}`)
      .send({ refreshToken: body.refreshToken })
      .expect(200);
    const res = await http.post('/api/auth/refresh').send({ refreshToken: body.refreshToken });
    expect(res.status).toBe(401);
  });

  it('isolamento: o token de um usuário só enxerga os próprios dados', async () => {
    const a = (await signUp('a@casai.local')).body;
    const b = (await signUp('b@casai.local')).body;

    const meA = await http.get('/api/auth/me').set('Authorization', `Bearer ${a.accessToken}`);
    const meB = await http.get('/api/auth/me').set('Authorization', `Bearer ${b.accessToken}`);

    expect(meA.body.email).toBe('a@casai.local');
    expect(meB.body.email).toBe('b@casai.local');
    expect(meA.body.id).not.toBe(meB.body.id);
  });

  it('e-mail duplicado retorna 409', async () => {
    await signUp('a@casai.local');
    const res = await signUp('a@casai.local');
    expect(res.status).toBe(409);
  });
});
