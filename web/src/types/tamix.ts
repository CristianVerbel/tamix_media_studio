import type { Rol } from '@/lib/roles';

/** `/me`: se trata sueltamente, sólo se muestra lo que llega. */
export type Viewer = Record<string, unknown> & {
  id?: string;
  handle?: string;
  name?: string;
  avatarUrl?: string;
};

/** Una fila de `/me/cuentas`: cada publicación/medio que la persona gestiona. */
export type CuentaResumen = Record<string, unknown> & {
  handle: string;
  name?: string;
  avatarUrl?: string;
  verified?: boolean;
  rol: Rol;
  esPropia: boolean;
};

export type Automatizacion = {
  disponible: boolean;
  activa?: boolean;
  publicadas?: number;
  ultimoUso?: string | null;
  url?: string | null;
};

/** `/publicaciones/:handle/gestion`: la autoridad de rol para esta cuenta. */
export type Gestion = {
  handle: string;
  nombre: string;
  verificada: boolean;
  tipoDeCuenta: string;
  tuRol: Rol | null;
  eresDueno: boolean;
  automatizacion: Automatizacion;
};

export type Access = 'publico' | 'suscriptores' | 'pago';
export type PostKind = 'articulo' | 'audio' | 'video' | 'envivo' | string;

/** Una pieza (post o nota/apunte), tratada con campos sueltos según venga. */
export type Pieza = Record<string, unknown> & {
  id: string;
  kind?: PostKind;
  title?: string;
  subtitle?: string;
  body?: string;
  bodyHtml?: string;
  coverUrl?: string | null;
  access?: Access;
  topics?: string[];
  circulo?: string;
  archivado?: boolean;
  createdAt?: string;
  publishedAt?: string;
  updatedAt?: string;
};

export type PublicationFull = {
  publication: Record<string, unknown> & {
    handle: string;
    name?: string;
    avatarUrl?: string;
    followerCount?: number;
    postCount?: number;
    verified?: boolean;
  };
  posts: Pieza[];
  notes: Pieza[];
  siguientePieza?: unknown;
  siguienteApunte?: unknown;
  escaparate?: unknown;
  canales?: unknown;
  obras?: unknown;
};

export type PiezasPage = {
  items: Pieza[];
  nextCursor: string | null;
};

/** Un cubo de un desglose de audiencia, con su porcentaje ya calculado. */
export type ValorDeDesglose = { clave: string; cantidad: number; porcentaje: number };

/**
 * Un desglose —país, aparato, edad, género, hora de actividad.
 *
 * `suficiente` en `false` no es «sin datos»: es «con pocos». La pantalla lo
 * dice con palabras en vez de enseñar un porcentaje que no significa nada,
 * el mismo criterio que ya usa `tasaDeLectura` en `ComoVa`.
 */
export type Desglose = { total: number; suficiente: boolean; valores: ValorDeDesglose[] };

/** Quién mira una cuenta, o una pieza suya: país, aparato, edad, género. */
export type QuienMira = {
  dias: number;
  muestraMinima: number;
  pais: Desglose;
  dispositivo: Desglose;
  edad: Desglose;
  genero: Desglose;
  /** Sólo en la de la cuenta entera: por pieza no hace falta. */
  horasDeActividad?: Desglose;
};

/** Un vídeo de la cuenta, con su resumen, para la lista de vídeos. */
export type VideoDeLaCuenta = {
  id: string;
  titulo: string | null;
  portadaUrl: string | null;
  publicadaEn: string;
  reproducciones: number;
  tasaDeFinalizacion: number | null;
  tiempoPromedio: number | null;
};

export type EtapaDelFunnel = { etapa: 'inicio' | 'q25' | 'q50' | 'q75' | 'completo'; valor: number };

/** Cómo le fue a un vídeo: reproducciones, tiempo visto, y dónde se cae la gente. */
export type VideoStats = {
  pieza: { id: string; titulo: string; portadaUrl: string | null };
  dias: number;
  resumen: {
    inicio: number;
    q25: number;
    q50: number;
    q75: number;
    completo: number;
    segundos: number;
  };
  tasaDeFinalizacion: number | null;
  tiempoPromedio: number | null;
  funnel: EtapaDelFunnel[];
  trend: { date: string; inicio: number; completo: number }[];
};

export type ComoVa = {
  pieza: Pieza;
  dias: number;
  serie: unknown[];
  resumen: unknown;
  totales: {
    meGusta: number;
    comentarios: number;
    republicaciones: number;
    respuestas: number;
  };
  tasaDeLectura: number | null;
  sinMedir: boolean;
};

export type Caja = {
  monthlyPriceCop: number | null;
  cobrado: { total: number; creador: number; acento: number; pasarela: number; cuantas: number };
  pendiente: { total: number; creador: number; acento: number; pasarela: number; cuantas: number };
  suscripcionesActivas: number;
  pasarelaConectada: boolean;
  cobraYa: boolean;
};

export type Cobros = {
  conectada: boolean;
  cobraYa: boolean;
  pendiente: string[];
};

export type MiembroEquipo = {
  userId: string;
  rol: Rol;
  desde: string;
  esDueno: boolean;
  medio?: Omit<CuentaResumen, 'rol' | 'esPropia'> | null;
};

export type Equipo = {
  equipo: MiembroEquipo[];
  roles: Rol[];
};

export type CrearPostEntrada = {
  kind: PostKind;
  title: string;
  bodyHtml: string;
  access: Access;
  subtitle?: string;
  coverUrl?: string;
  topics?: string[];
  priceCop?: number;
  comoPublicacion?: boolean;
  /** Sólo con `kind: 'audio'`. Un audio sin portada no se deja publicar. */
  audioUrl?: string;
  /** Sólo con `kind: 'video'`. */
  videoUrl?: string;
  videoAncho?: number;
  videoAlto?: number;
  durationSeconds?: number;
  /** Sólo con `kind: 'envivo'`: el enlace de la transmisión de YouTube. */
  youtubeUrl?: string;
};

/** La respuesta de `POST /media/upload-url`: a dónde subir, y a qué URL queda el archivo. */
export type PermisoDeSubida = {
  uploadUrl: string;
  headers: Record<string, string>;
  publicUrl: string | null;
  key: string;
  expiresIn: number;
};

/** Una pieza del carrusel de un apunte: hasta diez, imagen y vídeo mezclados. */
export type MedioDelCarrusel = {
  tipo: 'imagen' | 'video';
  url: string;
  duracionSegundos?: number | null;
  ancho?: number | null;
  alto?: number | null;
};

export type CrearNotaEntrada = {
  body: string;
  circulo?: string;
  medios?: MedioDelCarrusel[];
};

export type EditarPostEntrada = Partial<
  Pick<
    CrearPostEntrada,
    | 'title'
    | 'subtitle'
    | 'bodyHtml'
    | 'coverUrl'
    | 'access'
    | 'priceCop'
    | 'topics'
    | 'audioUrl'
    | 'videoUrl'
    | 'videoAncho'
    | 'videoAlto'
    | 'durationSeconds'
    | 'youtubeUrl'
  >
>;

export type EditarNotaEntrada = Partial<CrearNotaEntrada>;
