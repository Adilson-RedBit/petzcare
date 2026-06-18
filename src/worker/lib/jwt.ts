/**
 * JWT usando Web Crypto API. Versão do worker (importa process via globalThis).
 */

export interface JWTPayload {
  userId: number;
  email: string;
  name: string;
  role: string;
  tenantId: number;
  iat: number;
  exp: number;
}

function getSecretKey(secret?: string): string {
  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET não configurado ou muito curto (mínimo 32 caracteres). ' +
      'Configure via wrangler secret put JWT_SECRET. ' +
      'Gere com: openssl rand -hex 32',
    );
  }
  return secret;
}

function base64UrlEncode(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return atob(base64);
}

async function sign(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  const arr = Array.from(new Uint8Array(sig));
  return base64UrlEncode(btoa(String.fromCharCode(...arr)));
}

async function verify(data: string, signature: string, secret: string): Promise<boolean> {
  try {
    return (await sign(data, secret)) === signature;
  } catch {
    return false;
  }
}

export async function generateJWT(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  jwtSecret: string,
  expiresIn: number = 60 * 60 * 24 * 7,
): Promise<string> {
  const secret = getSecretKey(jwtSecret);
  const now = Math.floor(Date.now() / 1000);
  const jwtPayload: JWTPayload = { ...payload, iat: now, exp: now + expiresIn };

  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(jwtPayload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = await sign(data, secret);
  return `${data}.${signature}`;
}

export async function verifyJWT(token: string, jwtSecret: string): Promise<JWTPayload | null> {
  try {
    const secret = getSecretKey(jwtSecret);
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    const data = `${encodedHeader}.${encodedPayload}`;
    if (!(await verify(data, signature, secret))) return null;

    const payload: JWTPayload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;
    return payload;
  } catch (error) {
    console.error('Erro ao verificar JWT:', error);
    return null;
  }
}

export async function hashToken(token: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(token));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
