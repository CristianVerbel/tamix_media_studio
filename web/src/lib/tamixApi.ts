import { createApiClient } from './httpClient';
import type {
  Caja,
  Cobros,
  CrearNotaEntrada,
  CrearPostEntrada,
  CuentaResumen,
  EditarNotaEntrada,
  EditarPostEntrada,
  Equipo,
  ComoVa,
  Gestion,
  PermisoDeSubida,
  Pieza,
  PiezasPage,
  PublicationFull,
  QuienMira,
  VideoDeLaCuenta,
  VideoStats,
  Viewer,
} from '@/types/tamix';
import type { Rol } from './roles';

/**
 * Cliente de la API real de Tamix: identidad, publicaciones, contenido,
 * equipo, caja. Se llama directo, sin pasar por el backend del Studio — ese
 * backend no duplica estos datos a propósito.
 */
const api = createApiClient(import.meta.env.VITE_TAMIX_API_URL ?? '', 'VITE_TAMIX_API_URL');

export const tamixApi = {
  me: () => api.get<Viewer>('/me'),

  misCuentas: () => api.get<{ cuentas: CuentaResumen[] }>('/me/cuentas'),

  gestion: (handle: string) => api.get<Gestion>(`/publicaciones/${encodeURIComponent(handle)}/gestion`),

  publicacion: (handle: string) => api.get<PublicationFull>(`/publications/${encodeURIComponent(handle)}`),

  piezas: (handle: string, opts: { tipo?: 'posts' | 'apuntes'; cursor?: string } = {}) =>
    api.get<PiezasPage>(`/publications/${encodeURIComponent(handle)}/piezas`, {
      tipo: opts.tipo,
      cursor: opts.cursor,
    }),

  comoVa: (tipo: 'post' | 'nota', id: string, dias = 30) =>
    api.get<ComoVa>(`/piezas/${tipo}/${encodeURIComponent(id)}/como-va`, { dias }),

  /**
   * Quién mira una cuenta: país, aparato, edad, género, horas de actividad.
   *
   * `GET /publicaciones/:handle/quien-mira` en Tamix, con permiso de equipo
   * —no `/me/quien-mira`, que resolvería contra la sesión de quien lleva el
   * Studio y no contra la cuenta que está gestionando—.
   */
  quienMira: (handle: string, dias = 30) =>
    api.get<QuienMira>(`/publicaciones/${encodeURIComponent(handle)}/quien-mira`, { dias }),

  piezaQuienMira: (tipo: 'post' | 'nota', id: string, dias = 30) =>
    api.get<QuienMira>(`/piezas/${tipo}/${encodeURIComponent(id)}/quien-mira`, { dias }),

  videos: (handle: string, dias = 30) =>
    api.get<VideoDeLaCuenta[]>(`/publicaciones/${encodeURIComponent(handle)}/videos`, { dias }),

  videoStats: (postId: string, dias = 30) =>
    api.get<VideoStats>(`/piezas/post/${encodeURIComponent(postId)}/video`, { dias }),

  /**
   * Pide dónde subir un archivo. Devuelve una URL firmada del bucket, no un
   * camino por este API: el archivo va directo al bucket, y esto sólo abre
   * la puerta. La misma ruta que usa la app — ver `subirArchivo.ts`.
   */
  permisoDeSubida: (contentType: string, size: number) =>
    api.post<PermisoDeSubida>('/media/upload-url', { contentType, size }),

  crearPost: (body: CrearPostEntrada) => api.post<Pieza>('/posts', body),
  editarPost: (id: string, body: EditarPostEntrada) => api.patch<Pieza>(`/posts/${encodeURIComponent(id)}`, body),
  archivarPost: (id: string, archivado: boolean) => api.post<{ archivado: boolean }>(`/posts/${encodeURIComponent(id)}/archivar`, { archivado }),
  borrarPost: (id: string) => api.delete<{ eliminado: boolean } | null>(`/posts/${encodeURIComponent(id)}`),

  crearNota: (body: CrearNotaEntrada) => api.post<Pieza>('/notes', body),
  editarNota: (id: string, body: EditarNotaEntrada) => api.patch<Pieza>(`/notes/${encodeURIComponent(id)}`, body),
  archivarNota: (id: string, archivado: boolean) => api.post<{ archivado: boolean }>(`/notes/${encodeURIComponent(id)}/archivar`, { archivado }),
  borrarNota: (id: string) => api.delete<{ eliminado: boolean } | null>(`/notes/${encodeURIComponent(id)}`),

  caja: (handle: string) => api.get<Caja>(`/publications/${encodeURIComponent(handle)}/caja`),
  cobros: (handle: string) => api.get<Cobros>(`/publications/${encodeURIComponent(handle)}/cobros`),
  conectarCobros: (handle: string) => api.post<{ url: string }>(`/publications/${encodeURIComponent(handle)}/cobros`),
  fijarPrecio: (handle: string, monthlyPriceCop: number | null) =>
    api.patch<{ monthlyPriceCop: number | null }>(`/publications/${encodeURIComponent(handle)}/precio`, { monthlyPriceCop }),

  equipo: (handle: string) => api.get<Equipo>(`/publicaciones/${encodeURIComponent(handle)}/equipo`),
  invitar: (handle: string, alias: string, rol: Rol) =>
    api.post<Equipo['equipo'][number]>(`/publicaciones/${encodeURIComponent(handle)}/equipo`, { alias, rol }),
  cambiarRol: (handle: string, userId: string, rol: Rol) =>
    api.patch<Equipo['equipo'][number]>(`/publicaciones/${encodeURIComponent(handle)}/equipo/${encodeURIComponent(userId)}`, { rol }),
  quitarDelEquipo: (handle: string, userId: string) =>
    api.delete<{ retirado: boolean } | null>(`/publicaciones/${encodeURIComponent(handle)}/equipo/${encodeURIComponent(userId)}`),
};
