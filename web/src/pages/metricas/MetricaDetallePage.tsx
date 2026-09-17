import { AlertTriangle, ArrowLeft, Heart, MessageCircle, Repeat2, Reply } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { PageHeader } from '@/components/PageHeader';
import { CargandoBloque, ErrorBloque } from '@/components/StateViews';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useApiResource } from '@/hooks/useApiResource';
import { formatNumero } from '@/lib/format';
import { tamixApi } from '@/lib/tamixApi';

export function MetricaDetallePage() {
  const { tipo, id } = useParams<{ tipo: 'post' | 'nota'; id: string }>();
  const comoVa = useApiResource(() => {
    if (!tipo || !id) return Promise.reject(new Error('Falta identificar la pieza'));
    return tamixApi.comoVa(tipo, id, 30);
  }, [tipo, id]);

  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="mb-3 -ml-2">
        <Link to="/panel/metricas">
          <ArrowLeft /> Métricas
        </Link>
      </Button>

      <PageHeader eyebrow="Desempeño por pieza" title={(comoVa.data?.pieza?.titulo as string | undefined) ?? 'Pieza'} description={`Últimos ${comoVa.data?.dias ?? 30} días.`} />

      {comoVa.loading ? (
        <CargandoBloque filas={3} />
      ) : comoVa.error ? (
        <ErrorBloque error={comoVa.error} onRetry={comoVa.reload} />
      ) : comoVa.data ? (
        <div className="space-y-6">
          {comoVa.data.sinMedir && (
            <div className="flex items-start gap-3 rounded-lg border border-[var(--tmx-warning)]/40 bg-[color-mix(in_srgb,var(--tmx-warning)_8%,transparent)] p-3 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--tmx-warning)]" />
              <p>Tamix todavía no tiene mediciones para esta pieza en el período elegido.</p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Heart className="size-4" /> Me gusta
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">{formatNumero(comoVa.data.totales.meGusta)}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MessageCircle className="size-4" /> Comentarios
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">{formatNumero(comoVa.data.totales.comentarios)}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Repeat2 className="size-4" /> Republicaciones
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">{formatNumero(comoVa.data.totales.republicaciones)}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Reply className="size-4" /> Respuestas
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">{formatNumero(comoVa.data.totales.respuestas)}</CardContent>
            </Card>
          </div>

          {comoVa.data.tasaDeLectura !== null && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Tasa de lectura completa</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">{(comoVa.data.tasaDeLectura * 100).toFixed(1)}%</CardContent>
            </Card>
          )}
        </div>
      ) : null}
    </div>
  );
}
