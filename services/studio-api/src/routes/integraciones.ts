import { randomBytes } from 'node:crypto';
import { Hono } from 'hono';

import {
  revisarFuenteRss,
  revisarWebhookSaliente,
  type EventoWebhook,
  type IntegracionRss,
  type IntegracionWebhook,
} from '../domain/integraciones.js';
import { HttpError, requireAuth, viewerOf, type AppEnv } from '../lib/auth.js';
import { deleteItem, putItem, queryAll, updateItem } from '../lib/ddb.js';
import { param } from '../lib/http.js';
import { id } from '../lib/ids.js';
import { KEY, SK_PREFIX } from '../lib/keys.js';
import { exigirGestion } from '../lib/tamix.js';
import { registrarEvento } from './planificador.js';

/**
 * RSS y webhooks salientes.
 *
 * Sólo lo que Tamix no tiene: una fuente que el Studio vigila para proponer
 * contenido, y un aviso firmado hacia un sistema externo cuando el Studio
 * hace algo (programa, publica, sincroniza). Es P0 del backlog original en
 * su forma mínima: sin adaptador de WordPress y sin ingestión automática
 * todavía correindo en cron — eso queda anotado en el backlog del repo.
 */

export const integracionesRoutes = new Hono<AppEnv>();

type Integracion = (IntegracionRss | IntegracionWebhook) & {
  integracionId: string;
  createdAt: string;
};

integracionesRoutes.get('/integraciones/:handle', requireAuth, async (c) => {
  const viewer = viewerOf(c);
  const handle = param(c, 'handle');
  await exigirGestion(handle, viewer.token, 'analista');

  const items = await queryAll<Integracion>(KEY.integracion(handle, '').PK, {
    skPrefix: SK_PREFIX.integracion,
  });

  // El secreto de un webhook no vuelve a salir tras crearlo, por la misma
  // razón que la llave de automatización de Tamix.
  return c.json({
    items: items.map((item) => ('secreto' in item ? { ...item, secreto: undefined } : item)),
  });
});

integracionesRoutes.post('/integraciones/:handle', requireAuth, async (c) => {
  const viewer = viewerOf(c);
  const handle = param(c, 'handle');
  await exigirGestion(handle, viewer.token, 'editor');

  const cuerpo = await c.req.json<{ tipo?: string; url?: string; eventos?: EventoWebhook[] }>();
  const integracionId = id('itg');
  const ahora = new Date().toISOString();

  if (cuerpo.tipo === 'rss') {
    const revision = revisarFuenteRss({ url: cuerpo.url });
    if (!revision.ok) throw new HttpError(400, revision.motivo);

    const item: Integracion = {
      integracionId,
      tipo: 'rss',
      url: revision.url,
      activa: true,
      ultimoSync: null,
      ultimoError: null,
      createdAt: ahora,
    };
    await putItem({ ...KEY.integracion(handle, integracionId), entity: 'integracion', handle, ...item });
    await registrarEvento(handle, 'integracion.rss.creada', viewer.email, { integracionId, url: revision.url });
    return c.json(item, 201);
  }

  if (cuerpo.tipo === 'webhook_saliente') {
    const revision = revisarWebhookSaliente({ url: cuerpo.url, eventos: cuerpo.eventos });
    if (!revision.ok) throw new HttpError(400, revision.motivo);

    const secreto = randomBytes(32).toString('hex');
    const item: Integracion = {
      integracionId,
      tipo: 'webhook_saliente',
      url: revision.url,
      eventos: revision.eventos,
      secreto,
      activa: true,
      createdAt: ahora,
    };
    await putItem({ ...KEY.integracion(handle, integracionId), entity: 'integracion', handle, ...item });
    await registrarEvento(handle, 'integracion.webhook.creado', viewer.email, {
      integracionId,
      url: revision.url,
      eventos: revision.eventos,
    });
    // Aquí sí, es el único momento en que se enseña.
    return c.json({ ...item, aviso: 'Guarda este secreto ahora. No se puede volver a ver.' }, 201);
  }

  throw new HttpError(400, 'El tipo tiene que ser «rss» o «webhook_saliente»');
});

integracionesRoutes.patch('/integraciones/:handle/:integracionId', requireAuth, async (c) => {
  const viewer = viewerOf(c);
  const handle = param(c, 'handle');
  const integracionId = param(c, 'integracionId');
  await exigirGestion(handle, viewer.token, 'editor');

  const { activa } = await c.req.json<{ activa: boolean }>();
  await updateItem(KEY.integracion(handle, integracionId), {
    activa: Boolean(activa),
    updatedAt: new Date().toISOString(),
  });
  return c.json({ activa: Boolean(activa) });
});

integracionesRoutes.delete('/integraciones/:handle/:integracionId', requireAuth, async (c) => {
  const viewer = viewerOf(c);
  const handle = param(c, 'handle');
  const integracionId = param(c, 'integracionId');
  await exigirGestion(handle, viewer.token, 'editor');

  await deleteItem(KEY.integracion(handle, integracionId));
  await registrarEvento(handle, 'integracion.retirada', viewer.email, { integracionId });
  return c.json({ retirada: true });
});
