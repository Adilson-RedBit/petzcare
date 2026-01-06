/**
 * Implementação de JWT usando Web Crypto API
 * Compatível com Cloudflare Workers e Next.js
 */

export interface JWTPayload {
  userId: number;
  email: string;
  name: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * Gera uma chave secreta para assinatura JWT
 * Em produção, use uma variável de ambiente
 */
function getSecretKey(): string {
  // SECURITY: Nunca usar NEXT_PUBLIC_JWT_SECRET em produção - isso exporia a chave
  // @ts-ignore
  const secret = typeof process !== 'undefined' ? process.env.JWT_SECRET : null;
  
  if (!secret) {
    // Em desenvolvimento, usar uma chave padrão apenas se não houver configuração
    // @ts-ignore
    const isDev = typeof process !== 'undefined' ? process.env.NODE_ENV === "development" : true;
    
    if (isDev) {
      console.warn("⚠️ JWT_SECRET não configurado. Usando chave padrão de desenvolvimento.");
      return "dev-secret-key-for-local-development-only-K8j3mN9pQ2rT5vX8zA1bC4dE7fG0hI3jK6mN9pQ2rT5vX8zA1bC4dE7fG0hI";
    }
    throw new Error('JWT_SECRET não configurado. Configure a variável de ambiente JWT_SECRET.');
  }
  return secret;
}

/**
 * Codifica string para base64url
 */
function base64UrlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Decodifica base64url para string
 */
function base64UrlDecode(str: string): string {
  // Adicionar padding se necessário
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

/**
 * Gera assinatura HMAC-SHA256
 */
async function sign(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  const signatureArray = Array.from(new Uint8Array(signature));
  const signatureBase64 = btoa(String.fromCharCode(...signatureArray));
  
  return base64UrlEncode(signatureBase64);
}

/**
 * Verifica assinatura HMAC-SHA256
 */
async function verify(data: string, signature: string, secret: string): Promise<boolean> {
  try {
    const expectedSignature = await sign(data, secret);
    return expectedSignature === signature;
  } catch {
    return false;
  }
}

/**
 * Gera um token JWT
 * @param payload - Dados do usuário
 * @param secret - Chave secreta para assinatura
 * @param expiresIn - Tempo de expiração em segundos (padrão: 7 dias)
 * @returns Token JWT assinado
 */
export async function generateJWT(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  secret: string,
  expiresIn: number = 60 * 60 * 24 * 7 // 7 dias
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  
  const jwtPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
  };

  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(jwtPayload));
  const data = `${encodedHeader}.${encodedPayload}`;
  
  const signature = await sign(data, secret);
  
  return `${data}.${signature}`;
}

/**
 * Verifica e decodifica um token JWT
 * @param token - Token JWT
 * @param secret - Chave secreta para verificação
 * @returns Payload decodificado ou null se inválido
 */
export async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.');
    
    if (parts.length !== 3) {
      return null;
    }

    const [encodedHeader, encodedPayload, signature] = parts;
    const data = `${encodedHeader}.${encodedPayload}`;
    
    // Verificar assinatura
    const isValid = await verify(data, signature, secret);
    if (!isValid) {
      return null;
    }

    // Decodificar payload
    const payloadJson = base64UrlDecode(encodedPayload);
    const payload: JWTPayload = JSON.parse(payloadJson);
    
    // Verificar expiração
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return null; // Token expirado
    }
    
    return payload;
  } catch (error) {
    console.error('Erro ao verificar JWT:', error);
    return null;
  }
}

/**
 * Gera hash do token para armazenamento seguro no banco
 * Não armazenamos o token completo, apenas um hash
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}









