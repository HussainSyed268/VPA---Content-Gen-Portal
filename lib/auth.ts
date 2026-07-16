export const AUTH_COOKIE = 'vpa_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getCredentials() {
  return {
    username: process.env.AUTH_USERNAME ?? '',
    password: process.env.AUTH_PASSWORD ?? '',
  };
}

export function isAuthConfigured(): boolean {
  const { username, password } = getCredentials();
  return username.length > 0 && password.length > 0;
}

export function verifyCredentials(username: string, password: string): boolean {
  const expected = getCredentials();
  if (!expected.username || !expected.password) return false;
  return safeEqual(username, expected.username) && safeEqual(password, expected.password);
}

function getSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (secret) return secret;
  const { username, password } = getCredentials();
  return `vpa:${username}:${password}`;
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmac(message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return toBase64Url(sig);
}

export async function createSessionToken(): Promise<string> {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = String(exp);
  const signature = await hmac(payload);
  return `${payload}.${signature}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token || !isAuthConfigured()) return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;
  const exp = Number(payload);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const expected = await hmac(payload);
  return safeEqual(signature, expected);
}

export function sessionCookieOptions(token: string) {
  return {
    name: AUTH_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}
