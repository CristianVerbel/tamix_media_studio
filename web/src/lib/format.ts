const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const numero = new Intl.NumberFormat('es-CO');

export function formatCop(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return '—';
  return cop.format(valor);
}

export function formatNumero(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return '—';
  return numero.format(valor);
}

/** Fecha/hora en la zona horaria local del navegador — Tamix no expone una zona de la organización. */
export function formatFechaHora(iso: string | null | undefined): string {
  if (!iso) return '—';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '—';
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(fecha);
}

export function formatFecha(iso: string | null | undefined): string {
  if (!iso) return '—';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '—';
  return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }).format(fecha);
}

/** Convierte un Date a un valor usable en <input type="datetime-local"> en hora local. */
export function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
