import { Router } from 'express';
import { z } from 'zod';
import { checkCredentials, isAuthConfigured, issueToken } from '../../lib/auth';

const loginSchema = z.object({
  user: z.string().min(1).max(200),
  password: z.string().min(1).max(200),
});

// Rate limit simple en memoria por IP para frenar fuerza bruta.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const attempts = new Map<string, { count: number; resetAt: number }>();

export const authRouter = Router();

authRouter.post('/login', (req, res, next) => {
  try {
    if (!isAuthConfigured()) {
      console.error('Login admin deshabilitado: faltan ADMIN_USER, ADMIN_PASSWORD o ADMIN_TOKEN_SECRET');
      res.status(503).json({ error: 'El acceso de administrador no está configurado en el servidor' });
      return;
    }

    const ip = req.ip || 'unknown';
    const now = Date.now();
    const entry = attempts.get(ip);
    if (entry && entry.resetAt > now && entry.count >= MAX_ATTEMPTS) {
      res.status(429).json({ error: 'Demasiados intentos. Probá de nuevo en unos minutos.' });
      return;
    }

    const { user, password } = loginSchema.parse(req.body);

    if (!checkCredentials(user, password)) {
      const current = entry && entry.resetAt > now ? entry : { count: 0, resetAt: now + WINDOW_MS };
      current.count += 1;
      attempts.set(ip, current);
      res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
      return;
    }

    attempts.delete(ip);
    res.json(issueToken());
  } catch (err) {
    next(err);
  }
});
