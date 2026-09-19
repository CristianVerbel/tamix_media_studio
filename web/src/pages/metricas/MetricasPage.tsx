import { BarChart3, Clock, ExternalLink, FileText, Globe, MapPin, Smartphone, Video } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router-dom';

import { PageHeader } from '@/components/PageHeader';
import { CargandoBloque, ErrorBloque, VacioBloque } from '@/components/StateViews';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { useApiResource } from '@/hooks/useApiResource';
import { formatFechaHora, formatNumero } from '@/lib/format';
import { tamixApi } from '@/lib/tamixApi';

import { DesgloseCard } from './DesgloseCard';

const ETIQUETA_EDAD: Record<string, string> = {
  '13a17': '13-17',
  '18a24': '18-24',
  '25a34': '25-34',
  '35a44': '35-44',
  '45a54': '45-54',
  '55a64': '55-64',
  '65Mas': '65+',
  SinDato: 'Sin dato',
};
const ETIQUETA_GENERO: Record<string, string> = { M: 'Masculino', F: 'Femenino', X: 'No binario', SinDato: 'Sin dato' };
const ETIQUETA_DISPOSITIVO: Record<string, string> = { IOS: 'iOS', Android: 'Android', Web: 'Web', Otro: 'Otro' };

/**
 * Estadísticas: resumen, audiencia y vídeo.
 *
 * ## Lo que cambió
 *
 * Era sólo «Resumen» — seguidores, piezas, y el aviso de que alcance e
 * impresiones estaban en el backlog. Ese backlog ya tiene una primera
 * entrega real: `domain/demografia.ts` y `domain/video-analitica.ts` en
 * Tamix, servidos aquí por `GET /publicaciones/:handle/quien-mira` y
 * `GET /publicaciones/:handle/videos` — con el papel de equipo que ya
 * resuelve `permisoSobre`, no la sesión del dueño de la cuenta.
 *
 * ## Lo que sigue sin estar
 *
 * El feed de Tamix todavía no avisa una impresión al desplazarse — sólo lo
 * hace el reproductor de vídeo al abrir uno desde el lector—, así que
 * «Audiencia» de una cuenta que no publica vídeo puede seguir vacía. No es
 * un fallo de esta pantalla: es lo que de verdad se mide hoy, dicho como tal
 * en vez de disimulado con una gráfica bonita y números de relleno.
 */
export function MetricasPage() {
  const { handleActivo } = useAuth();
  const [tab, setTab] = React.useState('resumen');

  const publicacion = useApiResource(() => {
    if (!handleActivo) return Promise.reject(new Error('Sin cuenta activa'));
    return tamixApi.publicacion(handleActivo);
  }, [handleActivo]);

  const quienMira = useApiResource(() => {
    if (!handleActivo) return Promise.reject(new Error('Sin cuenta activa'));
    return tamixApi.quienMira(handleActivo, 30);
  }, [handleActivo]);

  const videos = useApiResource(() => {
    if (!handleActivo) return Promise.reject(new Error('Sin cuenta activa'));
    return tamixApi.videos(handleActivo, 30);
  }, [handleActivo]);

  const piezasRecientes = publicacion.data ? [...publicacion.data.posts, ...publicacion.data.notes].slice(0, 10) : [];

  return (
    <div>
      <PageHeader eyebrow="Tráfico y atención" title="Métricas" description="Lo que Tamix mide hoy, sin inventar lo que todavía no mide." />

      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="audiencia">Audiencia</TabsTrigger>
          <TabsTrigger value="video">Vídeo</TabsTrigger>
        </TabsList>

        {/* ------------------------------- Resumen ------------------------------- */}
        <TabsContent value="resumen">
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
                    <p className="font-medium text-foreground">El alcance y las impresiones agregadas de la cuenta siguen en el backlog</p>
                    <p className="mt-1">
                      La pestaña «Audiencia» ya es real —ver{' '}
                      <code className="rounded bg-background px-1 py-0.5">docs/IMPLEMENTATION_BACKLOG.md</code>—, pero el feed todavía no avisa
                      cuándo una pieza aparece delante de alguien: hoy sólo el reproductor de vídeo lo hace. Lo que sí es real es el desempeño por
                      pieza de abajo.
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
        </TabsContent>

        {/* ------------------------------ Audiencia ------------------------------ */}
        <TabsContent value="audiencia">
          {quienMira.loading ? (
            <CargandoBloque filas={4} />
          ) : quienMira.error ? (
            <ErrorBloque error={quienMira.error} onRetry={quienMira.reload} />
          ) : quienMira.data ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <DesgloseCard
                titulo="País"
                desglose={quienMira.data.pais}
                etiquetaDe={(c) => (c === 'ND' ? 'Sin dato' : c)}
                icono={<Globe className="size-4" />}
              />
              <DesgloseCard
                titulo="Ciudad"
                desglose={quienMira.data.ciudad}
                etiquetaDe={(c) => (c === 'sinDato' ? 'Sin dato' : c)}
                icono={<MapPin className="size-4" />}
              />
              <DesgloseCard
                titulo="Aparato"
                desglose={quienMira.data.dispositivo}
                etiquetaDe={(c) => ETIQUETA_DISPOSITIVO[c] ?? c}
                icono={<Smartphone className="size-4" />}
              />
              <DesgloseCard titulo="Edad" desglose={quienMira.data.edad} etiquetaDe={(c) => ETIQUETA_EDAD[c] ?? c} />
              <DesgloseCard titulo="Género" desglose={quienMira.data.genero} etiquetaDe={(c) => ETIQUETA_GENERO[c] ?? c} />
              <DesgloseCard
                titulo="Horas de actividad (UTC)"
                desglose={quienMira.data.horasDeActividad}
                etiquetaDe={(c) => {
                  const [dia, hora] = c.split('#');
                  return `${dia} ${hora}:00`;
                }}
                icono={<Clock className="size-4" />}
              />
            </div>
          ) : null}
        </TabsContent>

        {/* -------------------------------- Vídeo --------------------------------- */}
        <TabsContent value="video">
          {videos.loading ? (
            <CargandoBloque filas={3} />
          ) : videos.error ? (
            <ErrorBloque error={videos.error} onRetry={videos.reload} />
          ) : (videos.data?.length ?? 0) === 0 ? (
            <VacioBloque icono={<Video className="size-5" />} titulo="Sin vídeos todavía" descripcion="Los vídeos publicados por esta cuenta van a aparecer aquí, con su embudo de reproducción." />
          ) : (
            <div className="space-y-2">
              {videos.data?.map((v) => (
                <Link
                  key={v.id}
                  to={`/panel/metricas/video/${v.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {v.portadaUrl ? (
                      <img src={v.portadaUrl} alt="" className="size-12 shrink-0 rounded-md object-cover" />
                    ) : (
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <Video className="size-4" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-medium">{v.titulo ?? 'Sin título'}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatNumero(v.reproducciones)} reproducciones
                        {v.tasaDeFinalizacion !== null ? ` · ${Math.round(v.tasaDeFinalizacion * 100)}% lo terminan` : ''}
                      </p>
                    </div>
                  </div>
                  <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
