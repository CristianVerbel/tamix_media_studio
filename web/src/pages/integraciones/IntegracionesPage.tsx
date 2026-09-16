import * as React from 'react';
import { Loader2, Plug, Plus, Rss, Trash2, Webhook } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/PageHeader';
import { CargandoBloque, ErrorBloque, VacioBloque } from '@/components/StateViews';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/context/AuthContext';
import { useApiResource } from '@/hooks/useApiResource';
import { useGestion } from '@/hooks/useGestion';
import { ApiError } from '@/lib/apiError';
import { formatFechaHora } from '@/lib/format';
import { alcanza } from '@/lib/roles';
import { studioApi } from '@/lib/studioApi';

import { AutomatizacionCard } from './AutomatizacionCard';
import { CrearIntegracionDialog } from './CrearIntegracionDialog';
import { SecretoDialog } from './SecretoDialog';

export function IntegracionesPage() {
  const { handleActivo } = useAuth();
  const gestion = useGestion(handleActivo);
  const integraciones = useApiResource(() => {
    if (!handleActivo) return Promise.reject(new Error('Sin cuenta activa'));
    return studioApi.integraciones(handleActivo);
  }, [handleActivo]);

  const [crearAbierto, setCrearAbierto] = React.useState(false);
  const [secretoAMostrar, setSecretoAMostrar] = React.useState<string | null>(null);
  const [ocupado, setOcupado] = React.useState<string | null>(null);

  const puedeGestionar = alcanza(gestion.data?.tuRol, 'editor');

  async function alternarActiva(integracionId: string, activa: boolean) {
    if (!handleActivo) return;
    setOcupado(integracionId);
    try {
      await studioApi.activarIntegracion(handleActivo, integracionId, activa);
      integraciones.reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo actualizar');
    } finally {
      setOcupado(null);
    }
  }

  async function borrar(integracionId: string) {
    if (!handleActivo) return;
    if (!window.confirm('¿Quitar esta integración?')) return;
    setOcupado(integracionId);
    try {
      await studioApi.borrarIntegracion(handleActivo, integracionId);
      toast.success('Integración retirada');
      integraciones.reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo quitar');
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Centro de integraciones"
        title="Integraciones"
        description="Conecta el stack editorial: publicación automática, fuentes RSS y webhooks salientes."
        actions={
          puedeGestionar && (
            <Button onClick={() => setCrearAbierto(true)}>
              <Plus /> Conectar
            </Button>
          )
        }
      />

      {handleActivo && (
        <div className="mb-6">
          <AutomatizacionCard handle={handleActivo} puedeGestionar={puedeGestionar} />
        </div>
      )}

      {integraciones.loading ? (
        <CargandoBloque filas={3} />
      ) : integraciones.error ? (
        <ErrorBloque error={integraciones.error} onRetry={integraciones.reload} />
      ) : (integraciones.data?.items.length ?? 0) === 0 ? (
        <VacioBloque
          icono={<Plug className="size-5" />}
          titulo="Sin fuentes ni webhooks todavía"
          descripcion="Conecta un RSS para proponer contenido o un webhook para avisar a un sistema externo."
          accion={
            puedeGestionar ? (
              <Button onClick={() => setCrearAbierto(true)}>
                <Plus /> Conectar la primera
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {integraciones.data?.items.map((item) => (
            <Card key={item.integracionId}>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    {item.tipo === 'rss' ? <Rss className="size-4" /> : <Webhook className="size-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{item.url}</p>
                      <Badge variant="outline">{item.tipo === 'rss' ? 'RSS' : 'Webhook saliente'}</Badge>
                    </div>
                    {item.tipo === 'rss' ? (
                      <p className="text-sm text-muted-foreground">
                        {item.ultimoError ? <span className="text-destructive">{item.ultimoError}</span> : item.ultimoSync ? `Última sincronización: ${formatFechaHora(item.ultimoSync)}` : 'Sin sincronizar todavía'}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">{item.eventos.length} evento(s) suscrito(s)</p>
                    )}
                  </div>
                </div>
                {puedeGestionar && (
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Switch checked={item.activa} onCheckedChange={(v) => alternarActiva(item.integracionId, v)} disabled={ocupado === item.integracionId} aria-label="Activa" />
                      <span className="text-sm text-muted-foreground">{item.activa ? 'Activa' : 'Pausada'}</span>
                    </div>
                    <Button variant="ghost" size="icon-sm" aria-label="Quitar" onClick={() => borrar(item.integracionId)} disabled={ocupado === item.integracionId}>
                      {ocupado === item.integracionId ? <Loader2 className="animate-spin" /> : <Trash2 />}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {handleActivo && (
        <CrearIntegracionDialog
          handle={handleActivo}
          open={crearAbierto}
          onOpenChange={setCrearAbierto}
          onCreated={(creada) => {
            integraciones.reload();
            if (creada.tipo === 'webhook_saliente' && creada.secreto) setSecretoAMostrar(creada.secreto);
          }}
        />
      )}
      <SecretoDialog secreto={secretoAMostrar} onOpenChange={(v) => !v && setSecretoAMostrar(null)} />
    </div>
  );
}
