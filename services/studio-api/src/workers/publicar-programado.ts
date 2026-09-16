import type { Context } from 'aws-lambda';

import { firmarPayload } from '../domain/integraciones.js';
import { proximoReintento, REINTENTOS_MINUTOS, type ItemDeCola } from '../domain/planificador.js';
import { getItem, putItem, updateItem } from '../lib/ddb.js';
import { id, sortableTimestamp } from '../lib/ids.js';
import { KEY } from '../lib/keys.js';
import { registrarEvento } from '../routes/planificador.js';

/**
 * El trabajador del planificador.
 *
 * EventBridge Scheduler lo llama **una vez**, a la hora exacta, con
 * `{ itemId }` — no un cron que hay que filtrar, un disparo por elemento.
 * Publica llamando al webhook firmado de la cuenta en Tamix, el mismo que
 * usaría cualquier CMS externo: el Studio no tiene —ni necesita— una puerta
 * propia para escribir en la tabla de la red.
 */

type Entrada = { itemId: string };

export async function handler(evento: Entrada, context: Context): Promise<void> {
  const item = await getItem<ItemDeCola>(KEY.itemDeCola(evento.itemId));
  if (!item) return; // se borró entre que se programó el disparo y que sonó

  if (item.estado !== 'programado') return; // cancelado, o un reintento que llegó tarde

  const automatizacion = await getItem<{ url: string; secreto: string }>(
    KEY.automatizacion(item.handle)
  );
  if (!automatizacion) {
    await marcarFallido(item, 'La cuenta ya no tiene la publicación automática conectada');
    return;
  }

  const cuerpo = JSON.stringify({
    idExterno: item.itemId,
    kind: item.kind === 'obra_ignorada' ? 'articulo' : item.kind,
    title: item.title,
    subtitle: item.subtitle ?? null,
    bodyHtml: item.bodyHtml,
    coverUrl: item.coverUrl ?? null,
    access: item.access,
    topics: item.topics ?? [],
    enlaceExterno: item.enlaceExterno ?? null,
    publishedAt: new Date().toISOString(),
  });

  let respuesta: Response;
  try {
    respuesta = await fetch(automatizacion.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-tamix-firma': firmarPayload(cuerpo, automatizacion.secreto),
      },
      body: cuerpo,
    });
  } catch (error) {
    await reintentarOFallar(item, `Tamix no respondió: ${(error as Error).message}`, context);
    return;
  }

  if (!respuesta.ok) {
    const texto = await respuesta.text().catch(() => '');
    await reintentarOFallar(item, `Tamix respondió ${respuesta.status}: ${texto.slice(0, 200)}`, context);
    return;
  }

  await marcarPublicado(item);
}

async function marcarPublicado(item: ItemDeCola): Promise<void> {
  const actualizado: Partial<ItemDeCola> = {
    estado: 'publicado',
    ultimoError: null,
    updatedAt: new Date().toISOString(),
  };
  await updateItem(KEY.cola(item.handle, sortableTimestamp(item.publishAt), item.itemId), actualizado);
  await updateItem(KEY.itemDeCola(item.itemId), actualizado);
  await registrarEvento(item.handle, 'planificador.publicado', 'planificador', { itemId: item.itemId });
}

async function marcarFallido(item: ItemDeCola, motivo: string): Promise<void> {
  const actualizado: Partial<ItemDeCola> = {
    estado: 'fallido',
    ultimoError: motivo,
    updatedAt: new Date().toISOString(),
  };
  await updateItem(KEY.cola(item.handle, sortableTimestamp(item.publishAt), item.itemId), actualizado);
  await updateItem(KEY.itemDeCola(item.itemId), actualizado);
  await registrarEvento(item.handle, 'planificador.fallido', 'planificador', { itemId: item.itemId, motivo });
}

/**
 * Un fallo de Tamix no es necesariamente definitivo: reintenta con la misma
 * escalera que un webhook saliente (`REINTENTOS_MINUTOS`) antes de darlo por
 * perdido. Cada reintento es otro disparo de una vez, no un bucle: así un
 * trabajador que se cae a mitad no deja el elemento sin reintentar.
 *
 * `context.invokedFunctionArn` y no una variable de entorno: una función no
 * puede llevar su propio ARN en su propia configuración —sería una
 * referencia circular en la infraestructura—, y Lambda ya se lo dice solo en
 * cada invocación.
 */
async function reintentarOFallar(item: ItemDeCola, motivo: string, context: Context): Promise<void> {
  const siguienteIntento = item.intentos + 1;
  if (siguienteIntento >= REINTENTOS_MINUTOS.length) {
    await marcarFallido(item, motivo);
    return;
  }

  const cuando = proximoReintento(siguienteIntento)!;
  await updateItem(KEY.itemDeCola(item.itemId), {
    intentos: siguienteIntento,
    ultimoError: motivo,
    updatedAt: new Date().toISOString(),
  });
  await putItem({
    ...KEY.auditoria(item.handle, sortableTimestamp(new Date().toISOString()), id('evt')),
    entity: 'auditoria',
    handle: item.handle,
    accion: 'planificador.reintento',
    actorEmail: 'planificador',
    detalle: { itemId: item.itemId, intento: siguienteIntento, proximoIntento: cuando.toISOString() },
    createdAt: new Date().toISOString(),
  });

  const rol = process.env.SCHEDULER_ROLE_ARN;
  if (!rol) return;

  const { CreateScheduleCommand, SchedulerClient } = await import('@aws-sdk/client-scheduler');
  await new SchedulerClient({}).send(
    new CreateScheduleCommand({
      Name: `studio-reintento-${item.itemId}-${siguienteIntento}`.slice(0, 64),
      GroupName: process.env.SCHEDULER_GROUP ?? 'default',
      ScheduleExpression: `at(${cuando.toISOString().slice(0, 19)})`,
      FlexibleTimeWindow: { Mode: 'OFF' },
      ActionAfterCompletion: 'DELETE',
      Target: { Arn: context.invokedFunctionArn, RoleArn: rol, Input: JSON.stringify({ itemId: item.itemId }) },
    })
  );
}
