import { firmarPayload, type EventoWebhook, type IntegracionWebhook } from '../domain/integraciones.js';
import { putItem, queryAll } from './ddb.js';
import { id, sortableTimestamp } from './ids.js';
import { KEY, SK_PREFIX } from './keys.js';

/**
 * Reparte un evento del Studio a los webhooks salientes suscritos.
 *
 * A propósito **sin la escalera de reintentos** todavía: eso pide otra cola
 * durable (`docs/IMPLEMENTATION_BACKLOG.md` lo anota como pendiente). Lo que
 * hay hoy es un intento, firmado, con el resultado siempre registrado en
 * `ENTREGAS#<integracionId>` — así una entrega que falla se ve, aunque
 * todavía no se reintente sola.
 */
export async function despacharEvento(
  handle: string,
  tipo: EventoWebhook,
  datos: Record<string, unknown>
): Promise<void> {
  const integraciones = await queryAll<IntegracionWebhook & { integracionId: string }>(
    KEY.integracion(handle, '').PK,
    { skPrefix: SK_PREFIX.integracion }
  );

  const suscritos = integraciones.filter(
    (i) => i.tipo === 'webhook_saliente' && i.activa && i.eventos?.includes(tipo)
  );
  if (suscritos.length === 0) return;

  const eventoId = id('evt');
  const cuerpo = JSON.stringify({
    id: eventoId,
    tipo,
    handle,
    ocurrioEn: new Date().toISOString(),
    datos,
  });

  await Promise.all(
    suscritos.map(async (integracion) => {
      let estado: 'entregado' | 'fallido';
      let detalle = '';
      try {
        const res = await fetch(integracion.url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-tamix-firma': firmarPayload(cuerpo, integracion.secreto),
          },
          body: cuerpo,
        });
        estado = res.ok ? 'entregado' : 'fallido';
        detalle = `HTTP ${res.status}`;
      } catch (error) {
        estado = 'fallido';
        detalle = (error as Error).message;
      }

      const ahora = new Date().toISOString();
      await putItem({
        ...KEY.entrega(integracion.integracionId, sortableTimestamp(ahora), id('ent')),
        entity: 'entrega',
        integracionId: integracion.integracionId,
        tipo,
        estado,
        detalle,
        createdAt: ahora,
      });
    })
  );
}
