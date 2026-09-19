import * as React from 'react';
import { AlertTriangle, CalendarClock, Loader2, Pencil, Plug, Plus, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { PageHeader } from '@/components/PageHeader';
import { CargandoBloque, ErrorBloque, VacioBloque } from '@/components/StateViews';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { useGestion } from '@/hooks/useGestion';
import { ApiError } from '@/lib/apiError';
import { formatFechaHora } from '@/lib/format';
import { alcanza } from '@/lib/roles';
import { studioApi } from '@/lib/studioApi';
import { useApiResource } from '@/hooks/useApiResource';
import type { ItemDeCola } from '@/types/studio';

import { ESTADO_LABEL, ESTADO_TONO } from './estado';
import { ProgramarDialog } from './ProgramarDialog';

function agruparPorFecha(items: ItemDeCola[]): [string, ItemDeCola[]][] {
  const grupos = new Map<string, ItemDeCola[]>();
  for (const item of [...items].sort((a, b) => a.publishAt.localeCompare(b.publishAt))) {
    const clave = new Date(item.publishAt).toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    const lista = grupos.get(clave) ?? [];
    lista.push(item);
    grupos.set(clave, lista);
  }
  return Array.from(grupos.entries());
}

export function PlanificadorPage() {
  const { handleActivo } = useAuth();
  const gestion = useGestion(handleActivo);
  const cola = useApiResource(() => {
    if (!handleActivo) return Promise.reject(new Error('Sin cuenta activa'));
    return studioApi.planificador(handleActivo);
  }, [handleActivo]);

  const [dialogoAbierto, setDialogoAbierto] = React.useState(false);
  const [editando, setEditando] = React.useState<ItemDeCola | null>(null);
  const [cancelando, setCancelando] = React.useState<string | null>(null);

  const puedeProgramar = alcanza(gestion.data?.tuRol, 'editor');
  const automatizacionActiva = Boolean(gestion.data?.automatizacion.activa);

  async function cancelar(item: ItemDeCola) {
    if (!handleActivo) return;
    if (!window.confirm(`¿Cancelar "${item.title}"?`)) return;
    setCancelando(item.itemId);
    try {
      await studioApi.cancelar(handleActivo, item.itemId);
      toast.success('Cancelado');
      cola.reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo cancelar');
    } finally {
      setCancelando(null);
    }
  }

  const grupos = React.useMemo(() => agruparPorFecha(cola.data?.items ?? []), [cola.data]);

  return (
    <div>
      <PageHeader
        eyebrow="Calendario editorial"
        title="Planificador"
        description="Programa contenido y sigue su estado hasta que se publica solo. Es una función propia del Studio: en la app, programar sólo existe dentro de un canal, no para piezas sueltas — aquí se puede programar cualquier artículo, con su misma automatización."
        actions={
          puedeProgramar && (
            <Button
              onClick={() => {
                setEditando(null);
                setDialogoAbierto(true);
              }}
            >
              <Plus /> Programar
            </Button>
          )
        }
      />

      {!gestion.loading && gestion.data && !automatizacionActiva && (
        <Card className="mb-6 border-[var(--tmx-warning)]/40 bg-[color-mix(in_srgb,var(--tmx-warning)_8%,transparent)]">
          <CardContent className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[var(--tmx-warning)]" />
              <div>
                <p className="font-medium">Sin publicación automática conectada</p>
                <p className="text-sm text-muted-foreground">Hace falta conectarla en Integraciones antes de poder programar algo.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/panel/integraciones">
                <Plug /> Ir a Integraciones
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {cola.loading ? (
        <CargandoBloque filas={4} />
      ) : cola.error ? (
        <ErrorBloque error={cola.error} onRetry={cola.reload} />
      ) : (cola.data?.items.length ?? 0) === 0 ? (
        <VacioBloque
          icono={<CalendarClock className="size-5" />}
          titulo="No hay nada programado"
          descripcion="Lo que programes va a aparecer aquí, agrupado por fecha."
          accion={
            puedeProgramar ? (
              <Button onClick={() => setDialogoAbierto(true)}>
                <Plus /> Programar el primero
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-6">
          {grupos.map(([fecha, items]) => (
            <div key={fecha}>
              <h2 className="mb-2 text-sm font-semibold text-muted-foreground capitalize">{fecha}</h2>
              <div className="space-y-2">
                {items.map((item) => {
                  const editable = item.estado === 'programado' || item.estado === 'fallido';
                  return (
                    <Card key={item.itemId}>
                      <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium">{item.title}</p>
                            <Badge variant="outline" className={ESTADO_TONO[item.estado]}>
                              {ESTADO_LABEL[item.estado]}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{formatFechaHora(item.publishAt)}</p>
                          {item.estado === 'fallido' && item.ultimoError && (
                            <p className="mt-1 text-sm text-destructive">{item.ultimoError}</p>
                          )}
                        </div>
                        {puedeProgramar && editable && (
                          <div className="flex shrink-0 gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditando(item);
                                setDialogoAbierto(true);
                              }}
                            >
                              <Pencil /> Editar
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => cancelar(item)} disabled={cancelando === item.itemId}>
                              {cancelando === item.itemId ? <Loader2 className="animate-spin" /> : <X />}
                              Cancelar
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {handleActivo && (
        <ProgramarDialog
          handle={handleActivo}
          open={dialogoAbierto}
          onOpenChange={setDialogoAbierto}
          item={editando}
          onSaved={cola.reload}
        />
      )}
    </div>
  );
}
