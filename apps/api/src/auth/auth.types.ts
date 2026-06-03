export interface JwtPayload {
  sub: string; // userId
  email: string;
}

/** Usuário autenticado anexado à request pelo JwtStrategy. */
export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
