import type { Context } from 'hono';

import { HttpError, type AppEnv } from './auth.js';

/** Igual que en Tamix-social-media: falla con un 400 legible en vez de un `!`. */
export function param(c: Context<AppEnv>, name: string): string {
  const value = c.req.param(name);
  if (!value) throw new HttpError(400, `Falta el parámetro «${name}» en la ruta`);
  return value;
}
