import {
  CreateScheduleCommand,
  DeleteScheduleCommand,
  SchedulerClient,
  UpdateScheduleCommand,
} from '@aws-sdk/client-scheduler';
import { Hono } from 'hono';

import { construirEvento } from '../domain/auditoria.js';
import {
  editable,
  PAPEL_MINIMO_PARA_PROGRAMAR,
  PAPEL_MINIMO_PARA_VER,
  revisarEntrada,
  type ItemDeCola,
} from '../domain/planificador.js';
import { HttpError, requireAuth, viewerOf, type AppEnv } from '../lib/auth.js';
import { deleteItem, getItem, putItem, query, updateItem } from '../lib/ddb.js';
import { param } from '../lib/http.js';
import { id, sortableTimestamp } from '../lib/ids.js';
import { KEY, SK_PREFIX } from '../lib/keys.js';
import { exigirGestion } from '../lib/tamix.js';

/**
 * La cola de publicación programada.
 *
 * Es lo que Tamix no tiene: hoy publicar ahí es publicar ya. Este es el
 * cajón donde algo espera su hora, con una cola durable de verdad —
 * EventBridge Scheduler, no un `setTimeout` que muere con el contenedor—
 * detrás de cada elemento. A la hora en punto, el trabajador
 * (`src/workers/publicar-programado.ts`) llama al webhook firmado de la
 * propia cuenta en Tamix (`POST /hooks/:publicationId/publicar`): el mismo
 * mecanismo que ya usa cualquier medio con su propio CMS, con la llave que
 * `POST /automatizacion/:handle` dejó cacheada.
 */

export const planificadorRoutes = new Hono<AppEnv>();

const scheduler = new SchedulerClient({});
const GRUPO = process.env.SCHEDULER_GROUP ?? 'default';
const ROL_DEL_PROGRAMADOR = process.env.SCHEDULER_ROLE_ARN ?? '';
const ARN_DEL_TRABAJADOR = process.env.PUBLICAR_PROGRAMADO_ARN ?? '';

planificadorRoutes.get('/planificador/:handle', requireAuth, async (c) => {
  const viewer = viewerOf(c);
  const handle = param(c, 'handle');
  await exigirGestion(handle, viewer.token, PAPEL_MINIMO_PARA_VER);

  const { items } = await query<ItemDeCola>(KEY.cola(handle, '', '').PK, {
    skPrefix: SK_PREFIX.item,
    limit: 100,
  });

  return c.json({ items: items.sort((a, b) => a.publishAt.localeCompare(b.publishAt)) });
});

planificadorRoutes.post('/planificador/:handle', requireAuth, async (c) => {
  const viewer = viewerOf(c);
  const handle = param(c, 'handle');
  await exigirGestion(handle, viewer.token, PAPEL_MINIMO_PARA_PROGRAMAR);

  const automatizacion = await getItem<{ url: string }>(KEY.automatizacion(handle));
  if (!automatizacion?.url) {
    throw new HttpError(
      409,
      'Antes de programar hace falta conectar la publicación automática de esta cuenta, en Integraciones.'
    );
  }

  const revision = revisarEntrada(await c.req.json());
  if (!revision.ok) throw new HttpError(400, revision.motivo);

  const itemId = id('prg');
  const ahora = new Date().toISOString();
  const item: ItemDeCola = {
    ...revision.entrada,
    itemId,
    handle,
    estado: 'programado',
    intentos: 0,
    ultimoError: null,
    creadoPor: viewer.email,
    createdAt: ahora,
    updatedAt: ahora,
  };

  await putItem({ ...KEY.cola(handle, sortableTimestamp(item.publishAt), itemId), entity: 'cola', ...item });
  await putItem({ ...KEY.itemDeCola(itemId), entity: 'cola', ...item });

  await crearHorario(item);
  await registrarEvento(handle, 'planificador.programado', viewer.email, {
    itemId,
    title: item.title,
    publishAt: item.publishAt,
  });

  return c.json(item, 201);
});

planificadorRoutes.patch('/planificador/:handle/:itemId', requireAuth, async (c) => {
  const viewer = viewerOf(c);
  const handle = param(c, 'handle');
  const itemId = param(c, 'itemId');
  await exigirGestion(handle, viewer.token, PAPEL_MINIMO_PARA_PROGRAMAR);

  const item = await getItem<ItemDeCola>(KEY.itemDeCola(itemId));
  if (!item || item.handle !== handle) throw new HttpError(404, 'Ese elemento no existe');
  if (!editable(item.estado)) {
    throw new HttpError(409, 'Esto ya está publicándose o publicado: no se puede reprogramar');
  }

  const cuerpo = await c.req.json<Partial<ItemDeCola>>();
  const revision = revisarEntrada({ ...item, ...cuerpo });
  if (!revision.ok) throw new HttpError(400, revision.motivo);

  const actualizado: ItemDeCola = {
    ...item,
    ...revision.entrada,
    estado: 'programado',
    updatedAt: new Date().toISOString(),
  };

  // La fecha es parte de la clave de ordenación: reprogramar mueve de fila.
  if (actualizado.publishAt !== item.publishAt) {
    await deleteItem(KEY.cola(handle, sortableTimestamp(item.publishAt), itemId));
    await putItem({ ...KEY.cola(handle, sortableTimestamp(actualizado.publishAt), itemId), entity: 'cola', ...actualizado });
  } else {
    await updateItem(KEY.cola(handle, sortableTimestamp(item.publishAt), itemId), actualizado);
  }
  await putItem({ ...KEY.itemDeCola(itemId), entity: 'cola', ...actualizado });
  await actualizarHorario(actualizado);

  return c.json(actualizado);
});

planificadorRoutes.delete('/planificador/:handle/:itemId', requireAuth, async (c) => {
  const viewer = viewerOf(c);
  const handle = param(c, 'handle');
  const itemId = param(c, 'itemId');
  await exigirGestion(handle, viewer.token, PAPEL_MINIMO_PARA_PROGRAMAR);

  const item = await getItem<ItemDeCola>(KEY.itemDeCola(itemId));
  if (!item || item.handle !== handle) throw new HttpError(404, 'Ese elemento no existe');
  if (!editable(item.estado)) {
    throw new HttpError(409, 'Esto ya está publicándose o publicado: no se puede cancelar');
  }

  await deleteItem(KEY.cola(handle, sortableTimestamp(item.publishAt), itemId));
  await updateItem(KEY.itemDeCola(itemId), { estado: 'cancelado', updatedAt: new Date().toISOString() });
  await borrarHorario(itemId);

  return c.json({ cancelado: true });
});

/* ------------------------------ Apoyos ------------------------------ */

function nombreDelHorario(itemId: string): string {
  return `studio-planificador-${itemId}`.slice(0, 64);
}

async function crearHorario(item: ItemDeCola): Promise<void> {
  if (!ROL_DEL_PROGRAMADOR || !ARN_DEL_TRABAJADOR) return; // entorno de pruebas sin infra
  await scheduler.send(
    new CreateScheduleCommand({
      Name: nombreDelHorario(item.itemId),
      GroupName: GRUPO,
      ScheduleExpression: `at(${item.publishAt.slice(0, 19)})`,
      FlexibleTimeWindow: { Mode: 'OFF' },
      ActionAfterCompletion: 'DELETE',
      Target: {
        Arn: ARN_DEL_TRABAJADOR,
        RoleArn: ROL_DEL_PROGRAMADOR,
        Input: JSON.stringify({ itemId: item.itemId }),
      },
    })
  );
}

async function actualizarHorario(item: ItemDeCola): Promise<void> {
  if (!ROL_DEL_PROGRAMADOR || !ARN_DEL_TRABAJADOR) return;
  try {
    await scheduler.send(
      new UpdateScheduleCommand({
        Name: nombreDelHorario(item.itemId),
        GroupName: GRUPO,
        ScheduleExpression: `at(${item.publishAt.slice(0, 19)})`,
        FlexibleTimeWindow: { Mode: 'OFF' },
        ActionAfterCompletion: 'DELETE',
        Target: {
          Arn: ARN_DEL_TRABAJADOR,
          RoleArn: ROL_DEL_PROGRAMADOR,
          Input: JSON.stringify({ itemId: item.itemId }),
        },
      })
    );
  } catch {
    // El horario pudo ya haber corrido o no existir; crear uno nuevo es lo
    // seguro para no dejar una reprogramación sin efecto.
    await crearHorario(item);
  }
}

async function borrarHorario(itemId: string): Promise<void> {
  if (!ROL_DEL_PROGRAMADOR || !ARN_DEL_TRABAJADOR) return;
  try {
    await scheduler.send(new DeleteScheduleCommand({ Name: nombreDelHorario(itemId), GroupName: GRUPO }));
  } catch {
    // Ya no estaba: no es un fallo, es justo lo que se pedía.
  }
}

export async function registrarEvento(
  handle: string,
  accion: string,
  actorEmail: string,
  detalle: Record<string, unknown>
): Promise<void> {
  const evento = construirEvento({ eventoId: id('evt'), handle, accion, actorEmail, detalle });
  await putItem({
    ...KEY.auditoria(handle, sortableTimestamp(evento.createdAt), evento.eventoId),
    entity: 'auditoria',
    ...evento,
  });
}
