import type { Key } from './ddb.js';

/**
 * Constructores de clave para la tabla del Studio.
 *
 * Cinco particiones, una por cada cosa que el Studio guarda de verdad y que
 * Tamix no guarda: la cola de programación, las integraciones, sus entregas
 * de webhook, la automatización cacheada y la auditoría propia. Todo lo
 * demás —contenido, equipo, métricas, ingresos— se lee en vivo de
 * `services/social-api`, así que no tiene clave aquí.
 */

/**
 * Todo se particiona por `handle` y no por el identificador interno de
 * Tamix (`pub_…`): el Studio nunca ve ese identificador porque no lo
 * necesita — `/publicaciones/:handle/…` en Tamix ya resuelve por alias, y
 * pedirle a cada llamada que además cargue el identificador sería un viaje
 * de red de más para un dato que no cambia nada aquí. El alias es lo
 * estable de cara al Studio.
 */
export const KEY = {
  /** Un elemento programado para publicarse. */
  cola: (handle: string, sortTs: string, itemId: string): Key => ({
    PK: `COLA#${handle}`,
    SK: `ITEM#${sortTs}#${itemId}`,
  }),
  /** El mismo elemento, por su identificador, para poder resolverlo sin conocer su fecha. */
  itemDeCola: (itemId: string): Key => ({ PK: `ITEMCOLA#${itemId}`, SK: 'ITEM' }),

  /** Una integración (fuente RSS o webhook saliente) de una publicación. */
  integracion: (handle: string, integracionId: string): Key => ({
    PK: `INTEGRACIONES#${handle}`,
    SK: `INTEGRACION#${integracionId}`,
  }),

  /** Una entrega de un webhook saliente, para el registro. */
  entrega: (integracionId: string, sortTs: string, entregaId: string): Key => ({
    PK: `ENTREGAS#${integracionId}`,
    SK: `ENTREGA#${sortTs}#${entregaId}`,
  }),

  /**
   * La llave de automatización de Tamix para esta cuenta, cacheada.
   *
   * Tamix sólo la enseña una vez, al crearla o rotarla
   * (`POST /publicaciones/:handle/automatizacion`) — es la única forma de
   * que el planificador pueda publicar sin que la persona esté delante
   * sesión abierta a la hora programada. Guarda también la URL completa del
   * webhook, tal como la devolvió Tamix: reconstruirla aquí exigiría saber
   * el identificador interno de la publicación, que es justo lo que no se
   * guarda.
   */
  automatizacion: (handle: string): Key => ({
    PK: `AUTOMATIZACION#${handle}`,
    SK: 'SECRETO',
  }),

  /** Un evento de auditoría del Studio (no el de Tamix, que vive en su propia tabla). */
  auditoria: (handle: string, sortTs: string, eventoId: string): Key => ({
    PK: `AUDITORIA#${handle}`,
    SK: `EVENTO#${sortTs}#${eventoId}`,
  }),
} as const;

export const SK_PREFIX = {
  item: 'ITEM#',
  integracion: 'INTEGRACION#',
  entrega: 'ENTREGA#',
  evento: 'EVENTO#',
} as const;
