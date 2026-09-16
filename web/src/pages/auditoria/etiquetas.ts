const ETIQUETAS: Record<string, string> = {
  'planificador.programado': 'Programó contenido',
  'planificador.publicado': 'Se publicó contenido programado',
  'planificador.fallido': 'Falló una publicación programada',
  'integracion.rss.creada': 'Conectó una fuente RSS',
  'integracion.webhook.creado': 'Conectó un webhook saliente',
  'integracion.retirada': 'Quitó una integración',
  'integracion.automatizacion.conectada': 'Conectó la publicación automática',
  'integracion.automatizacion.desconectada': 'Desconectó la publicación automática',
  'integracion.sync.completado': 'Una fuente terminó de sincronizar',
  'integracion.sync.fallido': 'Falló la sincronización de una fuente',
};

export function etiquetaAccion(accion: string): string {
  return ETIQUETAS[accion] ?? accion;
}
