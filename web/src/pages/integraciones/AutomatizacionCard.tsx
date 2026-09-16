import * as React from 'react';
import { Loader2, Unplug, Zap } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useApiResource } from '@/hooks/useApiResource';
import { ApiError } from '@/lib/apiError';
import { formatFechaHora } from '@/lib/format';
import { studioApi } from '@/lib/studioApi';

export function AutomatizacionCard({ handle, puedeGestionar }: { handle: string; puedeGestionar: boolean }) {
  const auto = useApiResource(() => studioApi.automatizacion(handle), [handle]);
  const [ocupado, setOcupado] = React.useState(false);

  async function conectar() {
    setOcupado(true);
    try {
      await studioApi.conectarAutomatizacion(handle);
      toast.success('Publicación automática conectada');
      auto.reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo conectar');
    } finally {
      setOcupado(false);
    }
  }

  async function desconectar() {
    if (!window.confirm('¿Desconectar la publicación automática? El planificador no va a poder publicar hasta que se reconecte.')) return;
    setOcupado(true);
    try {
      await studioApi.desconectarAutomatizacion(handle);
      toast.success('Desconectada');
      auto.reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo desconectar');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="size-4 text-primary" /> Publicación automática
        </CardTitle>
      </CardHeader>
      <CardContent>
        {auto.loading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : auto.error ? (
          <p className="text-sm text-destructive">{auto.error.message}</p>
        ) : auto.data ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={auto.data.conectada ? 'default' : 'outline'}>{auto.data.conectada ? 'Conectada' : 'No conectada'}</Badge>
              {auto.data.conectadaEn && <span className="text-sm text-muted-foreground">desde {formatFechaHora(auto.data.conectadaEn)}</span>}
            </div>
            <p className="text-sm text-muted-foreground">
              Requisito para poder programar contenido en el planificador. La llave se guarda cifrada y no se vuelve a mostrar.
            </p>
            {puedeGestionar && (
              <div className="flex gap-2">
                <Button size="sm" onClick={conectar} disabled={ocupado}>
                  {ocupado ? <Loader2 className="animate-spin" /> : <Zap />}
                  {auto.data.conectada ? 'Rotar llave' : 'Conectar'}
                </Button>
                {auto.data.conectada && (
                  <Button size="sm" variant="outline" onClick={desconectar} disabled={ocupado}>
                    <Unplug /> Desconectar
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
