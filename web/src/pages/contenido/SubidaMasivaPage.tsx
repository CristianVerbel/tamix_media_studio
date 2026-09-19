import * as React from 'react';
import { AlertTriangle, Download, FileUp, ImagePlus, Loader2, Plug, Plus, Send, Trash2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { PageHeader } from '@/components/PageHeader';
import { CargandoBloque, ErrorBloque } from '@/components/StateViews';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { useGestion } from '@/hooks/useGestion';
import { ApiError } from '@/lib/apiError';
import { toDatetimeLocalValue } from '@/lib/format';
import { alcanza, mensajeFaltaRol } from '@/lib/roles';
import { studioApi } from '@/lib/studioApi';
import { porQueNoSePuedeSubir, subirArchivo } from '@/lib/subirArchivo';
import {
  aCrearNotaEntrada,
  aCrearPostEntrada,
  aEntradaDeItem,
  calcularPublishAt,
  filaVacia,
  generarPlantillaCsv,
  parsearCsv,
  porQueElPlanNoSirve,
  porQueNoSePuedeEnviar,
  type FilaMasiva,
  type PlanDeProgramacion,
  type TipoDeFilaMasiva,
} from '@/lib/subidaMasiva';
import { tamixApi } from '@/lib/tamixApi';
import type { Access } from '@/types/tamix';

type EstadoDeFila = 'lista' | 'subiendo_foto' | 'enviando' | 'hecho' | 'error';

type FilaConEstado = FilaMasiva & { estado: EstadoDeFila; mensaje: string | null };

type Modo = 'ahora' | 'unica' | 'escalonada';

function nuevoId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function tituloDesdeArchivo(nombre: string): string {
  return nombre.replace(/\.[^./]+$/, '').replace(/[-_]+/g, ' ').trim();
}

function primeraHoraFutura(): string {
  return toDatetimeLocalValue(new Date(Date.now() + 60 * 60 * 1000));
}

const ESTADO_BADGE: Record<EstadoDeFila, { texto: string; variant: 'outline' | 'secondary' | 'default' | 'destructive' }> = {
  lista: { texto: 'Listo', variant: 'outline' },
  subiendo_foto: { texto: 'Subiendo foto…', variant: 'secondary' },
  enviando: { texto: 'Enviando…', variant: 'secondary' },
  hecho: { texto: 'Enviado', variant: 'default' },
  error: { texto: 'Con error', variant: 'destructive' },
};

export function SubidaMasivaPage() {
  const { handleActivo } = useAuth();
  const gestion = useGestion(handleActivo);

  const puedeCrear = alcanza(gestion.data?.tuRol, 'redactor');
  const puedeProgramar = alcanza(gestion.data?.tuRol, 'editor');
  const automatizacionActiva = Boolean(gestion.data?.automatizacion.activa);

  const [filas, setFilas] = React.useState<FilaConEstado[]>([]);
  const [modo, setModo] = React.useState<Modo>('ahora');
  const [publishAtUnica, setPublishAtUnica] = React.useState(primeraHoraFutura());
  const [desdeEscalonada, setDesdeEscalonada] = React.useState(primeraHoraFutura());
  const [separacionMinutos, setSeparacionMinutos] = React.useState(60);
  const [enviandoLote, setEnviandoLote] = React.useState(false);
  const [filaParaFoto, setFilaParaFoto] = React.useState<string | null>(null);

  const fotosInputRef = React.useRef<HTMLInputElement>(null);
  const csvInputRef = React.useRef<HTMLInputElement>(null);
  const fotoFilaInputRef = React.useRef<HTMLInputElement>(null);

  const plan: PlanDeProgramacion = React.useMemo(() => {
    if (modo === 'ahora') return { modo: 'ahora' };
    if (modo === 'unica') return { modo: 'unica', publishAt: publishAtUnica };
    return { modo: 'escalonada', desde: desdeEscalonada, separacionMinutos };
  }, [modo, publishAtUnica, desdeEscalonada, separacionMinutos]);

  const programando = modo !== 'ahora';
  const planError = programando ? porQueElPlanNoSirve(plan) : null;

  function actualizarFila(id: string, cambios: Partial<FilaConEstado>) {
    setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, ...cambios } : f)));
  }

  function quitarFila(id: string) {
    setFilas((prev) => prev.filter((f) => f.id !== id));
  }

  function agregarFilaEnBlanco() {
    setFilas((prev) => [...prev, { ...filaVacia(nuevoId()), estado: 'lista', mensaje: null }]);
  }

  async function agregarFotos(archivos: FileList) {
    for (const archivo of Array.from(archivos)) {
      const id = nuevoId();
      const problema = porQueNoSePuedeSubir(archivo);
      if (problema) {
        setFilas((prev) => [...prev, { ...filaVacia(id), title: tituloDesdeArchivo(archivo.name), estado: 'error', mensaje: problema }]);
        continue;
      }
      setFilas((prev) => [
        ...prev,
        { ...filaVacia(id, 'apunte'), title: tituloDesdeArchivo(archivo.name), estado: 'subiendo_foto', mensaje: null },
      ]);
      try {
        const url = await subirArchivo(archivo);
        actualizarFila(id, { fotos: [url], estado: 'lista' });
      } catch (err) {
        actualizarFila(id, { estado: 'error', mensaje: err instanceof Error ? err.message : 'No se pudo subir la foto.' });
      }
    }
  }

  async function importarCsv(archivo: File) {
    const texto = await archivo.text();
    const { filas: nuevas, errores } = parsearCsv(texto);
    if (errores.length > 0) {
      toast.error(`${errores.length} fila(s) del CSV no se pudieron leer — la primera: ${errores[0]}`);
    }
    if (nuevas.length > 0) {
      setFilas((prev) => [...prev, ...nuevas.map((n) => ({ id: nuevoId(), ...n, fotos: [], estado: 'lista' as const, mensaje: null }))]);
      toast.success(`${nuevas.length} fila(s) importadas del CSV`);
    }
  }

  function descargarPlantilla() {
    const blob = new Blob([generarPlantillaCsv()], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla-subida-masiva-tamix.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function abrirSelectorDeFotoParaFila(id: string) {
    setFilaParaFoto(id);
    fotoFilaInputRef.current?.click();
  }

  async function alElegirFotoParaFila(archivo: File | undefined) {
    const id = filaParaFoto;
    setFilaParaFoto(null);
    if (!archivo || !id) return;
    const problema = porQueNoSePuedeSubir(archivo);
    if (problema) {
      toast.error(problema);
      return;
    }
    actualizarFila(id, { estado: 'subiendo_foto' });
    try {
      const url = await subirArchivo(archivo);
      setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, fotos: [...f.fotos, url], estado: 'lista' } : f)));
    } catch (err) {
      actualizarFila(id, { estado: 'error', mensaje: err instanceof Error ? err.message : 'No se pudo subir la foto.' });
    }
  }

  function quitarFoto(id: string, indice: number) {
    setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, fotos: f.fotos.filter((_, i) => i !== indice) } : f)));
  }

  const bloqueoEnvio: string | null =
    filas.length === 0
      ? 'Agrega al menos un elemento'
      : programando && planError
        ? planError
        : programando && !automatizacionActiva
          ? 'Conecta la publicación automática en Integraciones antes de programar'
          : null;

  async function enviarLote() {
    if (!handleActivo || bloqueoEnvio) return;
    setEnviandoLote(true);
    let publicados = 0;
    let programados = 0;
    let fallidos = 0;

    for (let i = 0; i < filas.length; i++) {
      const filaActual = filas[i]!;
      if (filaActual.estado === 'hecho') continue;
      if (filaActual.estado === 'subiendo_foto') {
        actualizarFila(filaActual.id, { estado: 'error', mensaje: 'Espera a que termine de subir la foto.' });
        fallidos++;
        continue;
      }

      const motivo = porQueNoSePuedeEnviar(filaActual, programando);
      if (motivo) {
        actualizarFila(filaActual.id, { estado: 'error', mensaje: motivo });
        fallidos++;
        continue;
      }

      actualizarFila(filaActual.id, { estado: 'enviando', mensaje: null });
      const publishAt = calcularPublishAt(plan, i);

      try {
        if (publishAt === null) {
          if (filaActual.tipo === 'articulo') await tamixApi.crearPost(aCrearPostEntrada(filaActual));
          else await tamixApi.crearNota(aCrearNotaEntrada(filaActual));
          publicados++;
        } else {
          await studioApi.programar(handleActivo, aEntradaDeItem(filaActual, publishAt));
          programados++;
        }
        actualizarFila(filaActual.id, { estado: 'hecho', mensaje: null });
      } catch (err) {
        fallidos++;
        actualizarFila(filaActual.id, {
          estado: 'error',
          mensaje: err instanceof ApiError ? err.message : 'No se pudo enviar. Inténtalo de nuevo.',
        });
      }
    }

    setEnviandoLote(false);
    const partes = [publicados > 0 && `${publicados} publicado(s)`, programados > 0 && `${programados} programado(s)`].filter(Boolean);
    if (partes.length > 0) toast.success(partes.join(' · '));
    if (fallidos > 0) toast.error(`${fallidos} elemento(s) con error — revísalos abajo`);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Contenido"
        title="Subida masiva"
        description="Sube varias fotos y textos de una vez, publícalos ya o prográmalos en el planificador."
        actions={
          <Button variant="outline" asChild>
            <Link to="/panel/contenido">Volver a Contenido</Link>
          </Button>
        }
      />

      {gestion.loading ? (
        <CargandoBloque filas={4} />
      ) : gestion.error ? (
        <ErrorBloque error={gestion.error} onRetry={gestion.reload} />
      ) : !puedeCrear ? (
        <ErrorBloque error={new ApiError(403, mensajeFaltaRol('redactor'))} />
      ) : (
        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-3">
              <p className="text-sm font-medium">Añadir contenido</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => fotosInputRef.current?.click()}>
                  <ImagePlus /> Agregar fotos
                </Button>
                <Button type="button" variant="outline" onClick={agregarFilaEnBlanco}>
                  <Plus /> Fila en blanco
                </Button>
                <Button type="button" variant="outline" onClick={() => csvInputRef.current?.click()}>
                  <FileUp /> Importar CSV
                </Button>
                <Button type="button" variant="ghost" onClick={descargarPlantilla}>
                  <Download /> Descargar plantilla CSV
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Cada foto que agregues crea un apunte con esa foto — edita el texto abajo. El CSV trae título y texto; las fotos se
                añaden aparte, en cada fila.
              </p>
              <input
                ref={fotosInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={(e) => {
                  const archivos = e.target.files;
                  e.target.value = '';
                  if (archivos?.length) void agregarFotos(archivos);
                }}
              />
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => {
                  const archivo = e.target.files?.[0];
                  e.target.value = '';
                  if (archivo) void importarCsv(archivo);
                }}
              />
              <input
                ref={fotoFilaInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => {
                  const archivo = e.target.files?.[0];
                  e.target.value = '';
                  void alElegirFotoParaFila(archivo);
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3">
              <p className="text-sm font-medium">Cuándo publicar</p>
              <Tabs value={modo} onValueChange={(v) => setModo(v as Modo)}>
                <TabsList>
                  <TabsTrigger value="ahora">Ahora</TabsTrigger>
                  <TabsTrigger value="unica" disabled={!puedeProgramar}>
                    Misma hora
                  </TabsTrigger>
                  <TabsTrigger value="escalonada" disabled={!puedeProgramar}>
                    En serie
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {!puedeProgramar && (
                <p className="text-xs text-muted-foreground">{mensajeFaltaRol('editor')} para programar — puedes publicar de inmediato.</p>
              )}

              {modo === 'unica' && (
                <div className="space-y-1.5">
                  <Label htmlFor="publishAtUnica">Fecha y hora de publicación</Label>
                  <Input
                    id="publishAtUnica"
                    type="datetime-local"
                    value={publishAtUnica}
                    onChange={(e) => setPublishAtUnica(e.target.value)}
                    className="max-w-xs"
                  />
                </div>
              )}

              {modo === 'escalonada' && (
                <div className="grid max-w-md gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="desdeEscalonada">Empieza en</Label>
                    <Input
                      id="desdeEscalonada"
                      type="datetime-local"
                      value={desdeEscalonada}
                      onChange={(e) => setDesdeEscalonada(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="separacionMinutos">Separación (minutos)</Label>
                    <Input
                      id="separacionMinutos"
                      type="number"
                      min={1}
                      value={separacionMinutos}
                      onChange={(e) => setSeparacionMinutos(Number(e.target.value))}
                    />
                  </div>
                </div>
              )}

              {programando && planError && <p className="text-sm text-destructive">{planError}</p>}

              {programando && !automatizacionActiva && (
                <div className="flex flex-col items-start gap-2 rounded-md border border-[var(--tmx-warning)]/40 bg-[color-mix(in_srgb,var(--tmx-warning)_8%,transparent)] p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--tmx-warning)]" />
                    <p className="text-sm">Sin publicación automática conectada: hace falta antes de poder programar.</p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/panel/integraciones">
                      <Plug /> Ir a Integraciones
                    </Link>
                  </Button>
                </div>
              )}

              {programando && (
                <p className="text-xs text-muted-foreground">
                  Sólo los artículos se pueden programar — los apuntes se publican de inmediato aunque elijas esta pestaña.
                </p>
              )}
            </CardContent>
          </Card>

          {filas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-6 py-14 text-center text-sm text-muted-foreground">
              Todavía no hay nada en el lote. Agrega fotos, una fila en blanco o importa un CSV.
            </div>
          ) : (
            <div className="space-y-3">
              {filas.map((fila) => (
                <FilaMasivaCard
                  key={fila.id}
                  fila={fila}
                  programando={programando}
                  onCambiar={(cambios) => actualizarFila(fila.id, cambios)}
                  onQuitar={() => quitarFila(fila.id)}
                  onAgregarFoto={() => abrirSelectorDeFotoParaFila(fila.id)}
                  onQuitarFoto={(indice) => quitarFoto(fila.id, indice)}
                />
              ))}
            </div>
          )}

          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{bloqueoEnvio ?? `${filas.length} elemento(s) en el lote`}</p>
            <Button onClick={enviarLote} disabled={enviandoLote || Boolean(bloqueoEnvio)}>
              {enviandoLote ? <Loader2 className="animate-spin" /> : <Send />}
              Enviar {filas.length > 0 ? filas.length : ''}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilaMasivaCard({
  fila,
  programando,
  onCambiar,
  onQuitar,
  onAgregarFoto,
  onQuitarFoto,
}: {
  fila: FilaConEstado;
  programando: boolean;
  onCambiar: (cambios: Partial<FilaMasiva>) => void;
  onQuitar: () => void;
  onAgregarFoto: () => void;
  onQuitarFoto: (indice: number) => void;
}) {
  const ocupada = fila.estado === 'enviando' || fila.estado === 'subiendo_foto';
  const advertencia = fila.estado !== 'error' && fila.estado !== 'enviando' ? porQueNoSePuedeEnviar(fila, programando) : null;
  const badge = ESTADO_BADGE[fila.estado];

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={fila.tipo} onValueChange={(v) => onCambiar({ tipo: v as TipoDeFilaMasiva })}>
              <SelectTrigger size="sm" className="w-32" disabled={ocupada}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="apunte">Apunte</SelectItem>
                <SelectItem value="articulo">Artículo</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant={badge.variant}>
              {fila.estado === 'enviando' || fila.estado === 'subiendo_foto' ? <Loader2 className="size-3 animate-spin" /> : null}
              {badge.texto}
            </Badge>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="Quitar fila" onClick={onQuitar} disabled={fila.estado === 'enviando'}>
            <Trash2 className="size-4" />
          </Button>
        </div>

        {fila.tipo === 'articulo' && (
          <Input
            placeholder="Titular"
            value={fila.title}
            onChange={(e) => onCambiar({ title: e.target.value })}
            disabled={ocupada}
          />
        )}
        <Textarea
          placeholder={fila.tipo === 'articulo' ? 'Cuerpo del artículo' : 'Texto del apunte'}
          value={fila.texto}
          onChange={(e) => onCambiar({ texto: e.target.value })}
          className="min-h-20"
          disabled={ocupada}
        />

        <div className="flex flex-wrap gap-2">
          {fila.fotos.map((url, i) => (
            <div key={`${url}-${i}`} className="group relative size-16 shrink-0 overflow-hidden rounded-md border bg-muted">
              <img src={url} alt="" className="size-full object-cover" />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute top-0 right-0 text-white hover:bg-black/40 hover:text-white"
                onClick={() => onQuitarFoto(i)}
                aria-label={`Quitar foto ${i + 1}`}
              >
                <X className="size-3" />
              </Button>
            </div>
          ))}
          {fila.estado === 'subiendo_foto' ? (
            <div className="flex size-16 shrink-0 items-center justify-center rounded-md border border-dashed border-border">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            fila.fotos.length < 10 && (
              <button
                type="button"
                onClick={onAgregarFoto}
                disabled={ocupada}
                aria-label="Agregar foto"
                className="flex size-16 shrink-0 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-50"
              >
                <ImagePlus className="size-4" />
              </button>
            )
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Select value={fila.access} onValueChange={(v) => onCambiar({ access: v as Access })}>
            <SelectTrigger size="sm" className="w-full" disabled={ocupada}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="publico">Público</SelectItem>
              <SelectItem value="suscriptores">Sólo suscriptores</SelectItem>
              <SelectItem value="pago">De pago</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Temas (separados por coma)"
            value={fila.topics.join(', ')}
            onChange={(e) =>
              onCambiar({
                topics: e.target.value
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
            disabled={ocupada}
          />
        </div>

        {fila.estado === 'error' && fila.mensaje && (
          <p role="alert" className="text-sm text-destructive">
            {fila.mensaje}
          </p>
        )}
        {fila.estado !== 'error' && advertencia && <p className="text-sm text-[var(--tmx-warning)]">{advertencia}</p>}
      </CardContent>
    </Card>
  );
}
