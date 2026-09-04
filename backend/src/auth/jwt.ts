import { createHmac, timingSafeEqual } from 'node:crypto';

export type AccessClaims = { sub: string; sid: string; iat: number; exp: number };
type JwtHeader = { alg: 'HS256'; typ: 'JWT' };

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
const decode = (value: string) => JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Record<string, unknown>;
const signature = (data: string, secret: string) => createHmac('sha256', secret).update(data).digest('base64url');

export function signAccessToken(claims: AccessClaims, secret: string, issuer: string, audience: string): string {
  const header = encode({ alg: 'HS256', typ: 'JWT' } satisfies JwtHeader);
  const payload = encode({ ...claims, iss: issuer, aud: audience });
  return `${header}.${payload}.${signature(`${header}.${payload}`, secret)}`;
}

export function verifyAccessToken(token: string, options: { secret: string; issuer: string; audience: string; now?: number }): AccessClaims {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('malformed');
    const signed = `${parts[0]}.${parts[1]}`;
    const actual = Buffer.from(parts[2]);
    const expected = Buffer.from(signature(signed, options.secret));
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('signature');
    const header = decode(parts[0]);
    const payload = decode(parts[1]);
    if (header.alg !== 'HS256' || header.typ !== 'JWT') throw new Error('header');
    if (payload.iss !== options.issuer || payload.aud !== options.audience) throw new Error('issuer');
    const numeric = (key: string) => typeof payload[key] === 'number' && Number.isFinite(payload[key]);
    if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string' || !numeric('iat') || !numeric('exp')) throw new Error('claims');
    const now = options.now ?? Math.floor(Date.now() / 1000);
    if ((payload.exp as number) <= now) throw new Error('expired');
    if ((payload.iat as number) > now + 30) throw new Error('issued-at');
    return { sub: payload.sub, sid: payload.sid, iat: payload.iat as number, exp: payload.exp as number };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'malformed';
    throw new Error(reason);
  }
}
