import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';

// Testes unitários — sem banco. Prisma e dependências são mockados.
describe('AuthService', () => {
  let auth: AuthService;
  let users: jest.Mocked<
    Pick<UsersService, 'create' | 'findByEmail' | 'verifyPassword' | 'findById'>
  >;
  let prisma: {
    refreshToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let jwt: jest.Mocked<Pick<JwtService, 'signAsync' | 'verifyAsync'>>;

  beforeEach(async () => {
    users = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      verifyPassword: jest.fn(),
      findById: jest.fn(),
    };
    prisma = {
      refreshToken: {
        create: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    jwt = {
      signAsync: jest.fn().mockResolvedValue('signed.jwt.token'),
      verifyAsync: jest.fn(),
    };
    const config = {
      get: jest.fn((k: string) => (k === 'JWT_SECRET' ? 'x'.repeat(40) : undefined)),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    auth = moduleRef.get(AuthService);
  });

  it('signIn devolve tokens quando a senha confere', async () => {
    users.findByEmail.mockResolvedValue({
      id: 'u1',
      email: 'a@a.com',
      passwordHash: 'hash',
    } as never);
    users.verifyPassword.mockResolvedValue(true);

    const tokens = await auth.signIn('a@a.com', 'Senha@123');

    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();
    expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
  });

  it('signIn rejeita senha errada com 401', async () => {
    users.findByEmail.mockResolvedValue({ id: 'u1', email: 'a@a.com', passwordHash: 'h' } as never);
    users.verifyPassword.mockResolvedValue(false);

    await expect(auth.signIn('a@a.com', 'errada')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it('signIn rejeita e-mail inexistente com a mesma mensagem (anti-enumeração)', async () => {
    users.findByEmail.mockResolvedValue(null);
    await expect(auth.signIn('nao@existe.com', 'x')).rejects.toThrow('E-mail ou senha incorretos');
  });

  it('refresh rejeita token revogado', async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: 'u1', email: 'a@a.com' } as never);
    prisma.refreshToken.findUnique.mockResolvedValue({
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 1000),
    });
    await expect(auth.refresh('tok')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refresh emite novo access token quando válido', async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: 'u1', email: 'a@a.com' } as never);
    prisma.refreshToken.findUnique.mockResolvedValue({
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    const out = await auth.refresh('tok');
    expect(out.accessToken).toBe('signed.jwt.token');
  });

  it('signOut revoga o refresh token do próprio usuário', async () => {
    await auth.signOut('u1', 'tok');
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'u1' }) }),
    );
  });
});
