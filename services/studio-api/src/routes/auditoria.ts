import { Hono } from 'hono';

import type { EventoDeAuditoria } from '../domain/auditoria.js';
import { requireAuth, viewerOf, type AppEnv } from '../lib/auth.js';
import { query } from '../lib/ddb.js';
import { param } from '../lib/http.js';
import { KEY, SK_PREFIX } from '../lib/keys.js';
import { exigirGestion } from '../lib/tamix.js';

/** Lo que el Studio hizo por esta cuenta: sólo lectura, sólo para quien la gestiona. */
export const auditoriaRoutes = new Hono<AppEnv>();

auditoriaRoutes.get('/auditoria/:handle', requireAuth, async (c) => {
  const viewer = viewerOf(c);
  const handle = param(c, 'handle');
  await exigirGestion(handle, viewer.token, 'analista');

  const cursor = c.req.query('cursor') ?? null;
  const pagina = await query<EventoDeAuditoria>(KEY.auditoria(handle, '', '').PK, {
    skPrefix: SK_PREFIX.evento,
    limit: 50,
    ascending: false,
    cursor,
  });

  return c.json({ items: pagina.items, nextCursor: pagina.nextCursor });
});
