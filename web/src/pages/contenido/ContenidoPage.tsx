import * as React from 'react';
import { Archive, ArchiveRestore, BarChart3, FileText, Loader2, MoreHorizontal, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { PageHeader } from '@/components/PageHeader';
import { CargandoBloque, ErrorBloque, VacioBloque } from '@/components/StateViews';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { useApiResource } from '@/hooks/useApiResource';
import { useGestion } from '@/hooks/useGestion';
import { ApiError } from '@/lib/apiError';
import { formatFechaHora } from '@/lib/format';
import { alcanza } from '@/lib/roles';
import { tamixApi } from '@/lib/tamixApi';
import type { Pieza } from '@/types/tamix';

import { ComposerDialog } from './ComposerDialog';

type Tipo = 'posts' | 'apuntes';

export function ContenidoPage() {
  const { handleActivo } = useAuth();
  const gestion = useGestion(handleActivo);
  const [params, setParams] = useSearchParams();
  const tipo: Tipo = params.get('tipo') === 'apuntes' ? 'apuntes' : 'posts';

  const [items, setItems] = React.useState<Pieza[]>([]);
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [cargandoMas, setCargandoMas] = React.useState(false);
  const [crearAbierto, setCrearAbierto] = React.useState(params.get('crear') === '1');
  const [editando, setEditando] = React.useState<Pieza | null>(null);
  const [ocupado, setOcupado] = React.useState<string | null>(null);

  const pagina = useApiResource(() => {
    if (!handleActivo) return Promise.reject(new Error('Sin cuenta activa'));
    return tamixApi.piezas(handleActivo, { tipo });
  }, [handleActivo, tipo]);

  React.useEffect(() => {
    if (pagina.data) {
      setItems(pagina.data.items);
      setCursor(pagina.data.nextCursor);
    }
  }, [pagina.data]);

  function cambiarTipo(nuevo: Tipo) {
    setParams((p) => {
      const next = new URLSearchParams(p);
      next.set('tipo', nuevo);
      next.delete('crear');
      return next;
    });
  }

  async function cargarMas() {
    if (!handleActivo || !cursor) return;
    setCargandoMas(true);
    try {
      const res = await tamixApi.piezas(handleActivo, { tipo, cursor });
      setItems((prev) => [...prev, ...res.items]);
      setCursor(res.nextCursor);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo cargar más contenido');
    } finally {
      setCargandoMas(false);
    }
  }

  async function archivar(pieza: Pieza, archivado: boolean) {
    setOcupado(pieza.id);
    try {
      if (tipo === 'posts') await tamixApi.archivarPost(pieza.id, archivado);
      else await tamixApi.archivarNota(pieza.id, archivado);
      setItems((prev) => prev.map((p) => (p.id === pieza.id ? { ...p, archivado } : p)));
      toast.success(archivado ? 'Archivado' : 'Restaurado');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo actualizar');
    } finally {
      setOcupado(null);
    }
  }

  async function eliminar(pieza: Pieza) {
    if (!window.confirm('¿Eliminar esto para siempre? No se puede deshacer.')) return;
    setOcupado(pieza.id);
    try {
      if (tipo === 'posts') await tamixApi.borrarPost(pieza.id);
      else await tamixApi.borrarNota(pieza.id);
      setItems((prev) => prev.filter((p) => p.id !== pieza.id));
      toast.success('Eliminado');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo eliminar');
    } finally {
      setOcupado(null);
    }
  }

  const puedeCrear = alcanza(gestion.data?.tuRol, 'redactor');
  const puedeEditar = alcanza(gestion.data?.tuRol, 'redactor');
  const puedeEliminar = alcanza(gestion.data?.tuRol, 'editor');
  const piezaTipoDetalle = tipo === 'posts' ? 'post' : 'nota';

  return (
    <div>
      <PageHeader
        eyebrow="Biblioteca"
        title="Contenido"
        description="Crea, edita, archiva y revisa el desempeño de cada pieza."
        actions={
          puedeCrear ? (
            <>
              <Button variant="outline" asChild>
                <Link to="/panel/contenido/masiva">
                  <Upload /> Subida masiva
                </Link>
              </Button>
              <Button onClick={() => setCrearAbierto(true)}>
                <Plus /> Crear
              </Button>
            </>
          ) : undefined
        }
      />

      <Tabs value={tipo} onValueChange={(v) => cambiarTipo(v as Tipo)} className="mb-4">
        <TabsList>
          <TabsTrigger value="posts">Piezas largas</TabsTrigger>
          <TabsTrigger value="apuntes">Apuntes</TabsTrigger>
        </TabsList>
      </Tabs>

      {pagina.loading ? (
        <CargandoBloque filas={5} />
      ) : pagina.error ? (
        <ErrorBloque error={pagina.error} onRetry={pagina.reload} />
      ) : items.length === 0 ? (
        <VacioBloque
          icono={<FileText className="size-5" />}
          titulo={tipo === 'posts' ? 'Todavía no hay piezas' : 'Todavía no hay apuntes'}
          descripcion="Lo que publiques va a aparecer en esta lista."
          accion={
            puedeCrear ? (
              <Button onClick={() => setCrearAbierto(true)}>
                <Plus /> Crear el primero
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tipo === 'posts' ? 'Titular' : 'Apunte'}</TableHead>
                <TableHead>Acceso</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Publicado</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((pieza) => (
                <TableRow key={pieza.id}>
                  <TableCell className="max-w-xs truncate font-medium">{pieza.title ?? pieza.body ?? 'Sin título'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{pieza.access ?? '—'}</Badge>
                  </TableCell>
                  <TableCell>
                    {pieza.archivado ? <Badge variant="secondary">Archivado</Badge> : <Badge>Activo</Badge>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatFechaHora((pieza.publishedAt ?? pieza.createdAt) as string)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" disabled={ocupado === pieza.id} aria-label="Más acciones">
                          {ocupado === pieza.id ? <Loader2 className="animate-spin" /> : <MoreHorizontal />}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/panel/metricas/${piezaTipoDetalle}/${pieza.id}`}>
                            <BarChart3 /> Ver métricas
                          </Link>
                        </DropdownMenuItem>
                        {puedeEditar && (
                          <DropdownMenuItem onSelect={() => setEditando(pieza)}>
                            <Pencil /> Editar
                          </DropdownMenuItem>
                        )}
                        {puedeEditar && (
                          <DropdownMenuItem onSelect={() => archivar(pieza, !pieza.archivado)}>
                            {pieza.archivado ? <ArchiveRestore /> : <Archive />}
                            {pieza.archivado ? 'Restaurar' : 'Archivar'}
                          </DropdownMenuItem>
                        )}
                        {puedeEliminar && (
                          <DropdownMenuItem variant="destructive" onSelect={() => eliminar(pieza)}>
                            <Trash2 /> Eliminar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {cursor && (
            <div className="flex justify-center border-t border-border p-3">
              <Button variant="outline" size="sm" onClick={cargarMas} disabled={cargandoMas}>
                {cargandoMas && <Loader2 className="animate-spin" />}
                Cargar más
              </Button>
            </div>
          )}
        </div>
      )}

      <ComposerDialog
        open={crearAbierto || editando !== null}
        onOpenChange={(v) => {
          if (v) return;
          setCrearAbierto(false);
          setEditando(null);
          setParams((p) => {
            const next = new URLSearchParams(p);
            next.delete('crear');
            return next;
          });
        }}
        pieza={editando}
        tipo={tipo}
        onSaved={pagina.reload}
      />
    </div>
  );
}
