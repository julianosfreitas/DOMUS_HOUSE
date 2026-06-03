import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthTokens, AuthUser, JwtPayload } from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async signUp(email: string, name: string, password: string): Promise<AuthTokens> {
    const user = await this.users.create(email, name, password);
    return this.issueTokens(user.id, user.email);
  }

  async signIn(email: string, password: string): Promise<AuthTokens> {
    const user = await this.users.findByEmail(email);
    // Mesma mensagem para e-mail inexistente e senha errada (evita enumeração de contas).
    if (!user || !(await this.users.verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException('E-mail ou senha incorretos');
    }
    return this.issueTokens(user.id, user.email);
  }

  /** Valida o refresh token (assinatura + registro no banco) e emite novo access token. */
  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.get<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hashToken(refreshToken) },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Sessão expirada, faça login novamente');
    }

    const accessToken = await this.signAccess(payload.sub, payload.email);
    return { accessToken };
  }

  /** Revoga o refresh token informado (logout). Idempotente. */
  async signOut(userId: string, refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, tokenHash: this.hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  me(user: AuthUser): Promise<{ id: string; email: string; name: string }> {
    return this.users.findById(user.id).then((u) => ({ id: u.id, email: u.email, name: u.name }));
  }

  // ───────────────────────── internos ─────────────────────────

  private async issueTokens(userId: string, email: string): Promise<AuthTokens> {
    const accessToken = await this.signAccess(userId, email);
    const refreshToken = await this.signRefresh(userId, email);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.refreshDays());
    await this.prisma.refreshToken.create({
      data: { userId, tokenHash: this.hashToken(refreshToken), expiresAt },
    });

    return { accessToken, refreshToken };
  }

  private signAccess(sub: string, email: string): Promise<string> {
    return this.jwt.signAsync(
      { sub, email },
      {
        secret: this.config.get<string>('JWT_SECRET'),
        // ConfigService devolve string; o tipo do jwt espera StringValue ('15m', '30d'...).
        expiresIn: (this.config.get<string>('JWT_ACCESS_EXPIRES') ??
          '15m') as JwtSignOptions['expiresIn'],
      },
    );
  }

  private signRefresh(sub: string, email: string): Promise<string> {
    return this.jwt.signAsync(
      { sub, email },
      {
        secret: this.config.get<string>('JWT_SECRET'),
        expiresIn: (this.config.get<string>('JWT_REFRESH_EXPIRES') ??
          '30d') as JwtSignOptions['expiresIn'],
        // jti único: garante tokens distintos mesmo emitidos no mesmo segundo
        // (evita colisão de hash quando sign_up e sign_in ocorrem juntos).
        jwtid: randomUUID(),
      },
    );
  }

  // SHA-256 determinístico: precisamos buscar o token pelo hash (bcrypt não permite lookup).
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private refreshDays(): number {
    const raw = this.config.get<string>('JWT_REFRESH_EXPIRES') ?? '30d';
    const match = /^(\d+)d$/.exec(raw);
    return match ? Number(match[1]) : 30;
  }
}
