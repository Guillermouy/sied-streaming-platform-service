import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 horas

function getSecret(): string | null {
  return process.env.ADMIN_TOKEN_SECRET || null;
}

function sign(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function isAuthConfigured(): boolean {
  return Boolean(process.env.ADMIN_USER && process.env.ADMIN_PASSWORD && getSecret());
}

export function checkCredentials(user: string, password: string): boolean {
  const expectedUser = process.env.ADMIN_USER;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPassword) return false;
  // Evaluar ambos siempre para no filtrar cuál de los dos falló por timing.
  const userOk = safeEqual(user, expectedUser);
  const passOk = safeEqual(password, expectedPassword);
  return userOk && passOk;
}

export function issueToken(): { token: string; expiresAt: number } {
  const secret = getSecret();
  if (!secret) throw new Error('ADMIN_TOKEN_SECRET no está configurado');
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const payload = Buffer.from(JSON.stringify({ role: 'admin', exp: expiresAt })).toString('base64url');
  return { token: `${payload}.${sign(payload, secret)}`, expiresAt };
}

export function verifyToken(token: string): boolean {
  const secret = getSecret();
  if (!secret) return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;
  if (!safeEqual(signature, sign(payload, secret))) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return data.role === 'admin' && typeof data.exp === 'number' && data.exp > Date.now();
  } catch {
    return false;
  }
}

/** true si la request trae un token de admin válido (sin cortar la request si no). */
export function isAdminRequest(req: Request): boolean {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  return Boolean(token) && verifyToken(token);
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token || !verifyToken(token)) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }
  next();
}
