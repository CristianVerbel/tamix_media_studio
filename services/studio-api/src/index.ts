import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { handle } from 'hono/aws-lambda';

import { HttpError, type AppEnv } from './lib/auth.js';
import { automatizacionRoutes } from './routes/automatizacion.js';
import { auditoriaRoutes } from './routes/auditoria.js';
import { integracionesRoutes } from './routes/integraciones.js';
import { planificadorRoutes } from './routes/planificador.js';

/**
 * API de Tamix Media Studio.
 *
 * Un solo Lambda con Hono, igual que `services/social-api` — pero es **otra
 * función, en otro stack de SST, con otra tabla**. No hay import cruzado
 * entre los dos backends: si algo de aquí necesita un dato de la red, lo
 * pide por HTTP a `TAMIX_API_URL` (ver `src/lib/tamix.ts`), nunca leyendo su
 * tabla.
 */

const app = new Hono<AppEnv>();

app.use('*', logger());
app.use(
  '*',
  cors({
    origin: (process.env.ALLOWED_ORIGINS ?? '').split(',').filter(Boolean),
    allowHeaders: ['content-type', 'authorization'],
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    maxAge: 86_400,
  })
);

app.get('/salud', (c) =>
  c.json({
    ok: true,
    servicio: 'tamix-media-studio-api',
    version: process.env.VERSION || 'dev',
    commit: process.env.COMMIT || null,
    etapa: process.env.ETAPA || 'desconocida',
    hora: new Date().toISOString(),
  })
);

app.route('/', planificadorRoutes);
app.route('/', automatizacionRoutes);
app.route('/', integracionesRoutes);
app.route('/', auditoriaRoutes);

app.notFound((c) => c.json({ error: 'Ruta no encontrada' }, 404));

app.onError((error, c) => {
  if (error instanceof HttpError) {
    return c.json({ error: error.message }, error.status);
  }
  console.error('Error no controlado', error);
  return c.json({ error: 'Algo falló de nuestro lado. Inténtalo de nuevo.' }, 500);
});

export const handler = handle(app);
export default app;
