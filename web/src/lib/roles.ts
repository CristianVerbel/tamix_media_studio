/**
 * Escala de papeles del equipo, en el mismo orden que usa el servidor
 * (`services/studio-api/src/lib/tamix.ts` y el `gestion` de Tamix):
 * analista < redactor < editor < propietario.
 *
 * El servidor es la autoridad real — cualquier gate de aquí es sólo cortesía
 * de UI para no llevar a alguien a un botón que de todos modos va a dar 403.
 */
export type Rol = 'analista' | 'redactor' | 'editor' | 'propietario';

const ESCALA: Rol[] = ['analista', 'redactor', 'editor', 'propietario'];

export function alcanza(rol: Rol | null | undefined, minimo: Rol): boolean {
  if (!rol) return false;
  return ESCALA.indexOf(rol) >= ESCALA.indexOf(minimo);
}

export const ETIQUETA_ROL: Record<Rol, string> = {
  analista: 'Analista',
  redactor: 'Redactor',
  editor: 'Editor',
  propietario: 'Propietario',
};

export function etiquetaRol(rol: Rol | null | undefined): string {
  if (!rol) return 'Sin papel';
  return ETIQUETA_ROL[rol];
}

/** Mensaje homogéneo para un 403 de rol, igual en todas las páginas. */
export function mensajeFaltaRol(minimo: Rol): string {
  return `Te falta el papel de ${ETIQUETA_ROL[minimo].toLowerCase()} en esta cuenta`;
}
