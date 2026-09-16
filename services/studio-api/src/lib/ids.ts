import { randomUUID } from 'node:crypto';

/** Identificadores con prefijo legible, igual que en Tamix-social-media. */
export function id(prefix: 'prg' | 'itg' | 'ent' | 'evt' | 'aut'): string {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 22)}`;
}

/** `AAAAMMDDHHmmssSSS`: ordena igual como texto que como fecha. */
export function sortableTimestamp(iso: string): string {
  return iso.replace(/[-:.TZ]/g, '').padEnd(17, '0').slice(0, 17);
}
