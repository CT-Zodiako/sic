import { randomUUID } from 'node:crypto';
import { ConfigurationError } from '../common/config.ts';
import { ApiError } from '../common/errors.ts';
import { PasswordHasher } from './password.ts';
import { signAccessToken, verifyAccessToken, type AccessClaims } from './jwt.ts';
import { SessionService, type SessionRepository } from './session.service.ts';

export type AuthUser = { id: string; email: string; name: string; passwordHash: string; status?: 'ACTIVE' | 'INACTIVE' };
export type AuthConfig = { jwtSecret?: string; issuer?: string; audience?: string; accessTtlSeconds?: number; refreshTtlSeconds?: number };

export class AuthService {
  readonly users: AuthUser[];
  readonly sessions: SessionService;
  readonly hasher: PasswordHasher;
  private readonly config: Required<AuthConfig>;
    private readonly audit?: (event: Record<string, unknown>) => void;

  constructor(users: AuthUser[] = [], config: AuthConfig = {}, audit: ((event: Record<string, unknown>) => void) | undefined, sessionRepository: SessionRepository) {
    this.users = users;
    this.hasher = new PasswordHasher();
    this.audit = audit;
    const jwtSecret = config.jwtSecret ?? process.env.JWT_SECRET;
    if (!jwtSecret?.trim()) throw new ConfigurationError(['JWT_SECRET']);
    this.config = { jwtSecret, issuer: config.issuer ?? 'sic-api', audience: config.audience ?? 'sic-web', accessTtlSeconds: config.accessTtlSeconds ?? 900, refreshTtlSeconds: config.refreshTtlSeconds ?? 2_592_000 };
    this.sessions = new SessionService(this.config.refreshTtlSeconds, (event) => audit?.({ resource: 'session', ...event }), sessionRepository);
  }

  async login(email: string, password: string, now = Math.floor(Date.now() / 1000)) {
    const user = this.users.find((candidate) => candidate.email.toLowerCase() === email?.trim().toLowerCase());
    if (!user || user.status === 'INACTIVE' || !this.hasher.verify(password, user.passwordHash)) throw new ApiError(401, 'UNAUTHENTICATED', 'Invalid credentials.');
    const { session, token } = await this.sessions.create(user.id, now);
    const accessToken = this.issue(user.id, session.id, now);
    this.audit?.({ resource: 'session', action: 'login', userId: user.id, sessionId: session.id, result: 'SUCCESS' });
    return { accessToken, token, user: { id: user.id, email: user.email, name: user.name }, sessionId: session.id };
  }

  async refresh(token: string, now = Math.floor(Date.now() / 1000)) {
    if (!token) throw new ApiError(401, 'UNAUTHENTICATED', 'Refresh authentication is required.');
    try { const { session, token: nextToken } = await this.sessions.rotate(token, now); return { accessToken: this.issue(session.userId, session.id, now), token: nextToken, sessionId: session.id }; }
    catch (error) { throw new ApiError(401, error instanceof Error && error.message === 'REFRESH_REUSE' ? 'SESSION_REVOKED' : 'UNAUTHENTICATED', 'The refresh session is no longer valid.'); }
  }

  async logout(accessToken: string, now = Math.floor(Date.now() / 1000)) {
    const claims = await this.authenticate(accessToken, now);
    await this.sessions.revoke(claims.sid, now);
    return { loggedOut: true };
  }

  async authenticate(accessToken: string, now = Math.floor(Date.now() / 1000)): Promise<AccessClaims> {
    if (!accessToken) throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication is required.');
    let claims: AccessClaims;
    try { claims = verifyAccessToken(accessToken.replace(/^Bearer\s+/i, ''), { secret: this.config.jwtSecret, issuer: this.config.issuer, audience: this.config.audience, now }); }
    catch (error) { throw new ApiError(401, error instanceof Error && error.message === 'expired' ? 'TOKEN_EXPIRED' : 'UNAUTHENTICATED', 'The access token is invalid.'); }
    try { await this.sessions.validate(claims.sid, claims.sub, now); } catch { throw new ApiError(401, 'SESSION_REVOKED', 'The session is no longer valid.'); }
    return claims;
  }

  async me(accessToken: string, now?: number) {
    const claims = await this.authenticate(accessToken, now);
    const user = this.users.find((candidate) => candidate.id === claims.sub);
    if (!user || user.status === 'INACTIVE') throw new ApiError(401, 'SESSION_REVOKED', 'The account is no longer active.');
    return { id: user.id, email: user.email, name: user.name };
  }

  private issue(userId: string, sessionId: string, now: number) { return signAccessToken({ sub: userId, sid: sessionId, iat: now, exp: now + this.config.accessTtlSeconds }, this.config.jwtSecret, this.config.issuer, this.config.audience); }
  static user(id: string, email: string, password: string, name = email) { const hasher = new PasswordHasher(); return { id: id || randomUUID(), email, name, passwordHash: hasher.hash(password), status: 'ACTIVE' as const }; }
}
