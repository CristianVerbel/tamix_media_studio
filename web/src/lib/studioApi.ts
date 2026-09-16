import { createApiClient } from './httpClient';
import type {
  AuditoriaPagina,
  AutomatizacionStudio,
  EntradaDeItem,
  EventoWebhook,
  Integracion,
  ItemDeCola,
} from '@/types/studio';

/**
 * Cliente de la API propia del Studio: sólo lo que Tamix no tiene —
 * planificador, integraciones, automatización cacheada y auditoría propia.
 */
const api = createApiClient(import.meta.env.VITE_STUDIO_API_URL ?? '', 'VITE_STUDIO_API_URL');

export const studioApi = {
  planificador: (handle: string) => api.get<{ items: ItemDeCola[] }>(`/planificador/${encodeURIComponent(handle)}`),
  programar: (handle: string, body: EntradaDeItem) => api.post<ItemDeCola>(`/planificador/${encodeURIComponent(handle)}`, body),
  reprogramar: (handle: string, itemId: string, body: Partial<EntradaDeItem>) =>
    api.patch<ItemDeCola>(`/planificador/${encodeURIComponent(handle)}/${encodeURIComponent(itemId)}`, body),
  cancelar: (handle: string, itemId: string) =>
    api.delete<{ cancelado: boolean }>(`/planificador/${encodeURIComponent(handle)}/${encodeURIComponent(itemId)}`),

  automatizacion: (handle: string) => api.get<AutomatizacionStudio>(`/automatizacion/${encodeURIComponent(handle)}`),
  conectarAutomatizacion: (handle: string) =>
    api.post<{ conectada: true; url: string }>(`/automatizacion/${encodeURIComponent(handle)}`),
  desconectarAutomatizacion: (handle: string) =>
    api.delete<{ conectada: false }>(`/automatizacion/${encodeURIComponent(handle)}`),

  integraciones: (handle: string) => api.get<{ items: Integracion[] }>(`/integraciones/${encodeURIComponent(handle)}`),
  crearFuenteRss: (handle: string, url: string) =>
    api.post<Integracion>(`/integraciones/${encodeURIComponent(handle)}`, { tipo: 'rss', url }),
  crearWebhookSaliente: (handle: string, url: string, eventos: EventoWebhook[]) =>
    api.post<Integracion & { aviso?: string }>(`/integraciones/${encodeURIComponent(handle)}`, {
      tipo: 'webhook_saliente',
      url,
      eventos,
    }),
  activarIntegracion: (handle: string, integracionId: string, activa: boolean) =>
    api.patch<{ activa: boolean }>(`/integraciones/${encodeURIComponent(handle)}/${encodeURIComponent(integracionId)}`, { activa }),
  borrarIntegracion: (handle: string, integracionId: string) =>
    api.delete<{ retirada: boolean }>(`/integraciones/${encodeURIComponent(handle)}/${encodeURIComponent(integracionId)}`),

  auditoria: (handle: string, cursor?: string) => api.get<AuditoriaPagina>(`/auditoria/${encodeURIComponent(handle)}`, { cursor }),
};
