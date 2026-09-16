import type { EstadoDeItem } from '@/types/studio';

export const ESTADO_LABEL: Record<EstadoDeItem, string> = {
  programado: 'Programado',
  publicando: 'Publicando',
  publicado: 'Publicado',
  fallido: 'Fallido',
  cancelado: 'Cancelado',
};

/** Clases de color por estado, siempre trazando a los tokens de marca (éxito/aviso/peligro/silencio). */
export const ESTADO_TONO: Record<EstadoDeItem, string> = {
  programado: 'border-[var(--tmx-line-strong)] text-[var(--tmx-ink)]',
  publicando: 'border-transparent bg-[color-mix(in_srgb,var(--tmx-warning)_16%,transparent)] text-[var(--tmx-warning)]',
  publicado: 'border-transparent bg-[color-mix(in_srgb,var(--tmx-success)_16%,transparent)] text-[var(--tmx-success)]',
  fallido: 'border-transparent bg-[color-mix(in_srgb,var(--tmx-danger)_16%,transparent)] text-[var(--tmx-danger)]',
  cancelado: 'border-transparent bg-muted text-muted-foreground',
};
