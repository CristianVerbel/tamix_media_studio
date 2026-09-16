import type { Access, PostKind } from './tamix';

export type EstadoDeItem = 'programado' | 'publicando' | 'publicado' | 'fallido' | 'cancelado';

export type ItemDeCola = {
  itemId: string;
  handle: string;
  kind: PostKind;
  title: string;
  subtitle?: string | null;
  bodyHtml: string;
  coverUrl?: string | null;
  access: Access;
  topics?: string[];
  enlaceExterno?: string | null;
  publishAt: string;
  estado: EstadoDeItem;
  intentos: number;
  ultimoError?: string | null;
  creadoPor: string;
  createdAt: string;
  updatedAt: string;
};

export type EntradaDeItem = Pick<
  ItemDeCola,
  'kind' | 'title' | 'subtitle' | 'bodyHtml' | 'coverUrl' | 'access' | 'topics' | 'enlaceExterno' | 'publishAt'
>;

export type AutomatizacionStudio = {
  conectada: boolean;
  url: string | null;
  conectadaEn: string | null;
};

export type TipoDeIntegracion = 'rss' | 'webhook_saliente';

export type EventoWebhook =
  | 'planificador.programado'
  | 'planificador.publicado'
  | 'planificador.fallido'
  | 'integracion.sync.completado'
  | 'integracion.sync.fallido';

export const EVENTOS_DISPONIBLES: EventoWebhook[] = [
  'planificador.programado',
  'planificador.publicado',
  'planificador.fallido',
  'integracion.sync.completado',
  'integracion.sync.fallido',
];

export type IntegracionRss = {
  integracionId: string;
  tipo: 'rss';
  url: string;
  activa: boolean;
  ultimoSync?: string | null;
  ultimoError?: string | null;
  createdAt: string;
};

export type IntegracionWebhook = {
  integracionId: string;
  tipo: 'webhook_saliente';
  url: string;
  eventos: EventoWebhook[];
  secreto?: string;
  aviso?: string;
  activa: boolean;
  createdAt: string;
};

export type Integracion = IntegracionRss | IntegracionWebhook;

export type EventoDeAuditoria = {
  eventoId: string;
  handle: string;
  accion: string;
  actorEmail: string;
  detalle?: Record<string, unknown>;
  createdAt: string;
};

export type AuditoriaPagina = {
  items: EventoDeAuditoria[];
  nextCursor: string | null;
};
