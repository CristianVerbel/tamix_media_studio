import * as React from 'react';
import { CalendarClock, FileText, Plug, Plus, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

import { PageHeader } from '@/components/PageHeader';
import { CargandoBloque, ErrorBloque, VacioBloque } from '@/components/StateViews';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { useApiResource } from '@/hooks/useApiResource';
import { useGestion } from '@/hooks/useGestion';
import { formatFechaHora } from '@/lib/format';
import { alcanza, etiquetaRol } from '@/lib/roles';
import { studioApi } from '@/lib/studioApi';
import { tamixApi } from '@/lib/tamixApi';
import { ESTADO_LABEL, ESTADO_TONO } from '@/pages/planificador/estado';

export function ResumenPage() {
  const { handleActivo } = useAuth();
  const gestion = useGestion(handleActivo);
  const publicacion = useApiResource(() => {
    if (!handleActivo) return Promise.reject(new Error('Sin cuenta activa'));
    return tamixApi.publicacion(handleActivo);
  }, [handleActivo]);
  const planificador = useApiResource(() => {
    if (!handleActivo) return Promise.reject(new Error('Sin cuenta activa'));
    return studioApi.planificador(handleActivo);
  }, [handleActivo]);

  const puedeCrear = alcanza(gestion.data?.tuRol, 'redactor');
  const puedeProgramar = alcanza(gestion.data?.tuRol, 'editor');

  const proximos = React.useMemo(() => {
    const items = planificador.data?.items ?? [];
    return items
      .filter((i) => i.estado === 'programado')
      .sort((a, b) => a.publishAt.localeCompare(b.publishAt))
      .slice(0, 3);
  }, [planificador.data]);

  const recientes = React.useMemo(() => {
    if (!publicacion.data) return [];
    return [...publicacion.data.posts, ...publicacion.data.notes]
      .sort((a, b) => String(b.publishedAt ?? b.createdAt ?? '').localeCompare(String(a.publishedAt ?? a.createdAt ?? '')))
      .slice(0, 6);
  }, [publicacion.data]);

  return (
    <div>
      <PageHeader
        eyebrow="Centro de operaciones"
        title={gestion.data ? `Buenos días, ${gestion.data.nombre}` : 'Resumen'}
        description="Esto es lo que está pasando con tu contenido y tu planificador."
        actions={
          <>
            {puedeCrear && (
              <Button asChild>
                <Link to="/panel/contenido?crear=1">
                  <Plus /> Crear contenido
                </Link>
              </Button>
            )}
            {puedeProgramar && (
              <Button variant="outline" asChild>
                <Link to="/panel/planificador">
                  <CalendarClock /> Ir al planificador
                </Link>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link to="/panel/integraciones">
                <Plug /> Conectar integración
              </Link>
            </Button>
          </>
        }
      />

      {gestion.loading ? (
        <CargandoBloque filas={2} />
      ) : gestion.error ? (
        <ErrorBloque error={gestion.error} onRetry={gestion.reload} />
      ) : gestion.data ? (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Tu papel en esta cuenta</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">{etiquetaRol(gestion.data.tuRol)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Tipo de cuenta</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">
              {gestion.data.verificada ? 'Verificada' : 'Sin verificar'} · {gestion.data.tipoDeCuenta}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Publicación automática</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 text-xl font-semibold">
              <Zap className={gestion.data.automatizacion.activa ? 'size-5 text-primary' : 'size-5 text-muted-foreground'} />
              {gestion.data.automatizacion.activa ? 'Conectada' : 'No conectada'}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Próximo en el planificador</CardTitle>
            <Button variant="link" size="sm" asChild>
              <Link to="/panel/planificador">Ver todo →</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {planificador.loading ? (
              <CargandoBloque filas={3} />
            ) : planificador.error ? (
              <ErrorBloque error={planificador.error} onRetry={planificador.reload} />
            ) : proximos.length === 0 ? (
              <VacioBloque
                icono={<CalendarClock className="size-5" />}
                titulo="No hay nada programado"
                descripcion="Programa contenido desde el planificador para que aparezca aquí."
              />
            ) : (
              <ul className="space-y-3">
                {proximos.map((item) => (
                  <li key={item.itemId} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{formatFechaHora(item.publishAt)}</p>
                    </div>
                    <Badge variant="outline" className={ESTADO_TONO[item.estado]}>
                      {ESTADO_LABEL[item.estado]}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Contenido reciente</CardTitle>
            <Button variant="link" size="sm" asChild>
              <Link to="/panel/contenido">Ver todo →</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {publicacion.loading ? (
              <CargandoBloque filas={3} />
            ) : publicacion.error ? (
              <ErrorBloque error={publicacion.error} onRetry={publicacion.reload} />
            ) : recientes.length === 0 ? (
              <VacioBloque
                icono={<FileText className="size-5" />}
                titulo="Todavía no hay contenido"
                descripcion="Lo que publiques en esta cuenta va a aparecer aquí."
              />
            ) : (
              <ul className="space-y-3">
                {recientes.map((pieza) => (
                  <li key={pieza.id} className="rounded-lg border border-border p-3">
                    <p className="truncate font-medium">{pieza.title ?? pieza.body ?? 'Sin título'}</p>
                    <p className="text-sm text-muted-foreground">{formatFechaHora((pieza.publishedAt ?? pieza.createdAt) as string)}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
