import { Hono } from 'hono';

import { registrarEvento } from './planificador.js';
import { HttpError, requireAuth, viewerOf, type AppEnv } from '../lib/auth.js';
import { deleteItem, getItem, putItem } from '../lib/ddb.js';
import { param } from '../lib/http.js';
import { KEY } from '../lib/keys.js';
import { exigirGestion, tamixFetch } from '../lib/tamix.js';

/**
 * Conectar la publicación automática de una cuenta con el planificador.
 *
 * Tamix enseña el secreto de `POST /publicaciones/:handle/automatizacion`
 * **una sola vez**, al crearlo o rotarlo. El Studio lo guarda cifrado en
 * reposo por DynamoDB (SSE, la que ya trae la tabla) para que el trabajador
 * del planificador pueda publicar a la hora programada sin que nadie tenga
 * la sesión abierta. Rotarlo aquí también lo rota en Tamix: no hay dos
 * llaves para la misma cuenta.
 */

export const automatizacionRoutes = new Hono<AppEnv>();

automatizacionRoutes.get('/automatizacion/:handle', requireAuth, async (c) => {
  const viewer = viewerOf(c);
  const handle = param(c, 'handle');
  await exigirGestion(handle, viewer.token, 'analista');

  const conectada = await getItem<{ url: string; conectadaEn: string }>(KEY.automatizacion(handle));
  return c.json({
    conectada: Boolean(conectada),
    url: conectada?.url ?? null,
    conectadaEn: conectada?.conectadaEn ?? null,
  });
});

automatizacionRoutes.post('/automatizacion/:handle', requireAuth, async (c) => {
  const viewer = viewerOf(c);
  const handle = param(c, 'handle');
  await exigirGestion(handle, viewer.token, 'editor');

  const respuesta = await tamixFetch<{ url: string; secreto: string }>(
    `/publicaciones/${encodeURIComponent(handle)}/automatizacion`,
    { token: viewer.token, method: 'POST' }
  );
  if (!respuesta?.url || !respuesta?.secreto) {
    throw new HttpError(502, 'Tamix no devolvió una llave de automatización');
  }

  await putItem({
    ...KEY.automatizacion(handle),
    entity: 'automatizacion',
    handle,
    url: respuesta.url,
    secreto: respuesta.secreto,
    conectadaEn: new Date().toISOString(),
  });

  await registrarEvento(handle, 'integracion.automatizacion.conectada', viewer.email, {});

  return c.json({ conectada: true, url: respuesta.url }, 201);
});

automatizacionRoutes.delete('/automatizacion/:handle', requireAuth, async (c) => {
  const viewer = viewerOf(c);
  const handle = param(c, 'handle');
  await exigirGestion(handle, viewer.token, 'editor');

  await deleteItem(KEY.automatizacion(handle));
  await registrarEvento(handle, 'integracion.automatizacion.desconectada', viewer.email, {});

  // No desactiva la llave en Tamix: si alguien quiere cerrarla del todo,
  // lo hace desde Tamix (`DELETE /publicaciones/:handle/automatizacion`),
  // que es donde vive de verdad. Esto sólo suelta la copia del Studio, así
  // que el planificador deja de poder usarla para publicar.
  return c.json({ conectada: false });
});
