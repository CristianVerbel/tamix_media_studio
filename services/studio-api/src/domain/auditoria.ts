export type EventoDeAuditoria = {
  eventoId: string;
  handle: string;
  accion: string;
  actorEmail: string;
  detalle?: Record<string, unknown>;
  createdAt: string;
};

/** Registro append-only: nunca se edita ni se borra un evento ya escrito. */
export function construirEvento(params: {
  eventoId: string;
  handle: string;
  accion: string;
  actorEmail: string;
  detalle?: Record<string, unknown>;
}): EventoDeAuditoria {
  return {
    eventoId: params.eventoId,
    handle: params.handle,
    accion: params.accion,
    actorEmail: params.actorEmail,
    detalle: params.detalle,
    createdAt: new Date().toISOString(),
  };
}
