import * as React from 'react';
import { Loader2, ScrollText } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/PageHeader';
import { CargandoBloque, ErrorBloque, VacioBloque } from '@/components/StateViews';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { useApiResource } from '@/hooks/useApiResource';
import { ApiError } from '@/lib/apiError';
import { formatFechaHora } from '@/lib/format';
import { studioApi } from '@/lib/studioApi';
import type { EventoDeAuditoria } from '@/types/studio';

import { etiquetaAccion } from './etiquetas';

export function AuditoriaPage() {
  const { handleActivo } = useAuth();
  const [items, setItems] = React.useState<EventoDeAuditoria[]>([]);
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [cargandoMas, setCargandoMas] = React.useState(false);

  const pagina = useApiResource(() => {
    if (!handleActivo) return Promise.reject(new Error('Sin cuenta activa'));
    return studioApi.auditoria(handleActivo);
  }, [handleActivo]);

  React.useEffect(() => {
    if (pagina.data) {
      setItems(pagina.data.items);
      setCursor(pagina.data.nextCursor);
    }
  }, [pagina.data]);

  async function cargarMas() {
    if (!handleActivo || !cursor) return;
    setCargandoMas(true);
    try {
      const res = await studioApi.auditoria(handleActivo, cursor);
      setItems((prev) => [...prev, ...res.items]);
      setCursor(res.nextCursor);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo cargar más');
    } finally {
      setCargandoMas(false);
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Trazabilidad" title="Auditoría" description="Lo que el Studio hizo por esta cuenta: programaciones, integraciones y automatización." />

      {pagina.loading ? (
        <CargandoBloque filas={5} />
      ) : pagina.error ? (
        <ErrorBloque error={pagina.error} onRetry={pagina.reload} />
      ) : items.length === 0 ? (
        <VacioBloque icono={<ScrollText className="size-5" />} titulo="Sin actividad todavía" descripcion="Cada acción del Studio sobre esta cuenta va a quedar registrada aquí." />
      ) : (
        <div className="space-y-2">
          {items.map((evento) => (
            <Card key={evento.eventoId}>
              <CardContent className="flex items-start justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">{etiquetaAccion(evento.accion)}</p>
                  <p className="text-sm text-muted-foreground">{evento.actorEmail}</p>
                </div>
                <p className="shrink-0 text-sm text-muted-foreground">{formatFechaHora(evento.createdAt)}</p>
              </CardContent>
            </Card>
          ))}
          {cursor && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" size="sm" onClick={cargarMas} disabled={cargandoMas}>
                {cargandoMas && <Loader2 className="animate-spin" />}
                Cargar más
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
