import { BarChart3, ExternalLink, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

import { PageHeader } from '@/components/PageHeader';
import { CargandoBloque, ErrorBloque } from '@/components/StateViews';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { useApiResource } from '@/hooks/useApiResource';
import { formatFechaHora, formatNumero } from '@/lib/format';
import { tamixApi } from '@/lib/tamixApi';

export function MetricasPage() {
  const { handleActivo } = useAuth();
  const publicacion = useApiResource(() => {
    if (!handleActivo) return Promise.reject(new Error('Sin cuenta activa'));
    return tamixApi.publicacion(handleActivo);
  }, [handleActivo]);

  const piezasRecientes = publicacion.data ? [...publicacion.data.posts, ...publicacion.data.notes].slice(0, 10) : [];

  return (
    <div>
      <PageHeader eyebrow="Tráfico y atención" title="Métricas" description="Lo que Tamix mide hoy, sin inventar lo que todavía no mide." />

      {publicacion.loading ? (
        <CargandoBloque filas={3} />
      ) : publicacion.error ? (
        <ErrorBloque error={publicacion.error} onRetry={publicacion.reload} />
      ) : publicacion.data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Seguidores</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-bold">{formatNumero(publicacion.data.publication.followerCount)}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Piezas publicadas</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-bold">{formatNumero(publicacion.data.publication.postCount)}</CardContent>
            </Card>
          </div>

          <Card className="mt-6 border-[var(--tmx-line-strong)] bg-muted/30">
            <CardContent className="flex items-start gap-3 py-4">
              <BarChart3 className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Alcance, impresiones y tiempo de atención: próximamente</p>
                <p className="mt-1">
                  Esa taxonomía completa depende de un pipeline de eventos que Tamix todavía no tiene (ver{' '}
                  <code className="rounded bg-background px-1 py-0.5">docs/IMPLEMENTATION_BACKLOG.md</code>, sección «Métricas — parcial»). Lo que sí es real
                  hoy es el desempeño por pieza de abajo.
                </p>
              </div>
            </CardContent>
          </Card>

          <h2 className="mt-8 mb-3 text-sm font-semibold text-muted-foreground">Desempeño por pieza</h2>
          {piezasRecientes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay piezas para medir.</p>
          ) : (
            <div className="space-y-2">
              {piezasRecientes.map((pieza) => {
                const esNota = !pieza.title;
                return (
                  <Link
                    key={pieza.id}
                    to={`/panel/metricas/${esNota ? 'nota' : 'post'}/${pieza.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{pieza.title ?? pieza.body ?? 'Sin título'}</p>
                        <p className="text-sm text-muted-foreground">{formatFechaHora((pieza.publishedAt ?? pieza.createdAt) as string)}</p>
                      </div>
                    </div>
                    <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                );
              })}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
