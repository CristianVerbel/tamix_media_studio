import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { PageHeader } from '@/components/PageHeader';
import { CargandoBloque, ErrorBloque } from '@/components/StateViews';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useApiResource } from '@/hooks/useApiResource';
import { formatNumero } from '@/lib/format';
import { tamixApi } from '@/lib/tamixApi';

const ETIQUETA_ETAPA: Record<string, string> = {
  inicio: 'Arrancó',
  q25: '25%',
  q50: '50%',
  q75: '75%',
  completo: 'Entero',
};

/**
 * El embudo de un vídeo: cuánta gente arranca y dónde se va cayendo el
 * resto.
 *
 * Mismo dato que `app/video/[id]/estadisticas.tsx` en la app — el mismo
 * `GET /piezas/post/:id/video`, ya con permiso de equipo por el token de
 * quien gestiona la cuenta desde el Studio.
 */
export function VideoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const video = useApiResource(() => {
    if (!id) return Promise.reject(new Error('Falta identificar el vídeo'));
    return tamixApi.videoStats(id, 30);
  }, [id]);

  const maximoDelFunnel = Math.max(1, ...(video.data?.funnel.map((f) => f.valor) ?? [1]));

  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="mb-3 -ml-2">
        <Link to="/panel/metricas">
          <ArrowLeft /> Métricas
        </Link>
      </Button>

      <PageHeader eyebrow="Vídeo" title={video.data?.pieza.titulo || 'Vídeo'} description={`Últimos ${video.data?.dias ?? 30} días.`} />

      {video.loading ? (
        <CargandoBloque filas={3} />
      ) : video.error ? (
        <ErrorBloque error={video.error} onRetry={video.reload} />
      ) : video.data ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Reproducciones</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">{formatNumero(video.data.resumen.inicio)}</CardContent>
            </Card>
            {video.data.tasaDeFinalizacion !== null && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Lo terminan</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{Math.round(video.data.tasaDeFinalizacion * 100)}%</CardContent>
              </Card>
            )}
            {video.data.tiempoPromedio !== null && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Tiempo promedio</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{Math.round(video.data.tiempoPromedio)} s</CardContent>
              </Card>
            )}
          </div>

          {video.data.tasaDeFinalizacion === null && (
            <p className="text-sm text-muted-foreground">
              Con tan pocas reproducciones, un porcentaje de finalización no significaría nada todavía.
            </p>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Dónde se cae la gente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {video.data.funnel.map((etapa) => (
                <div key={etapa.etapa} className="flex items-center gap-3 text-sm">
                  <span className="w-16 shrink-0">{ETIQUETA_ETAPA[etapa.etapa]}</span>
                  <Progress value={Math.round((etapa.valor / maximoDelFunnel) * 100)} className="h-2" />
                  <span className="w-12 shrink-0 text-right tabular-nums text-muted-foreground">{formatNumero(etapa.valor)}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">
            Quién vio qué no se guarda en ninguna parte. Los hitos se suman por día y no llevan nombres dentro.
          </p>
        </div>
      ) : null}
    </div>
  );
}
