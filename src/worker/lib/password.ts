/**
 * Hash de senha PBKDF2-SHA256 via Web Crypto. Sem dependências externas.
 * Formato armazenado: `pbkdf2$<iters>$<salt_b64>$<hash_b64>`
 */

const ITERATIONS = 600_000;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBuffer(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function pbkdf2(
  password: string,
  salt: Uint8Array,
  iterations: number,
  keyLength: number,
): Promise<ArrayBuffer> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    keyMaterial,
    keyLength * 8,
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const hash = await pbkdf2(password, salt, ITERATIONS, KEY_LENGTH);
  return `pbkdf2$${ITERATIONS}$${bufferToBase64(salt.buffer)}$${bufferToBase64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const parts = stored.split('$');
    if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
    const iterations = parseInt(parts[1], 10);
    const salt = base64ToBuffer(parts[2]);
    const expected = base64ToBuffer(parts[3]);
    const computed = new Uint8Array(
      await pbkdf2(password, salt, iterations, expected.length),
    );
    if (computed.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < computed.length; i++) diff |= computed[i] ^ expected[i];
    return diff === 0;
  } catch {
    return false;
  }
}

export function validatePasswordComplexity(password: string): string | null {
  if (!password || password.length < 8) return 'Senha deve ter no mínimo 8 caracteres';
  if (password.length > 256) return 'Senha muito longa (máximo 256 caracteres)';
  if (!/[A-Za-z]/.test(password)) return 'Senha deve conter pelo menos uma letra';
  if (!/[0-9]/.test(password)) return 'Senha deve conter pelo menos um número';
  return null;
}
