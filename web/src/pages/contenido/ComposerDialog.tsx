import * as React from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CarruselDeArchivos } from '@/components/media/CarruselDeArchivos';
import { SubidaDeArchivo } from '@/components/media/SubidaDeArchivo';
import { ApiError } from '@/lib/apiError';
import {
  ALCANCE,
  CIRCULOS,
  FORMATOS,
  MINIMO_OPCIONES_ENCUESTA,
  TOPE_OPCIONES_ENCUESTA,
  TOPE_PARTES_HILO,
  cuentaComoApunte,
  esApunte,
  esHilo,
  permiteAlcance,
  permiteCarrusel,
  permiteCirculo,
  pideArchivoUnico,
  pideEntradilla,
  pideTitular,
  placeholderDeCuerpo,
  placeholderDeTitular,
  porQueNoSePuedePublicar,
  quedanDeApunte,
  trozosDelHilo,
  type Formato,
} from '@/lib/composer';
import { formatCop } from '@/lib/format';
import { cn } from '@/lib/utils';
import { tamixApi } from '@/lib/tamixApi';
import type { Access, Circulo, MedioDelCarrusel, Pieza } from '@/types/tamix';

type VideoMedida = { ancho: number; alto: number; duracionSegundos?: number };

/**
 * El composer: una sola pantalla continua para crear y para corregir,
 * igual que `app/componer.tsx` de la app real — no dos formularios que se
 * puedan desalinear. Se abre en modo apunte por defecto (lo que casi
 * siempre se quiere hacer), y el formato es un selector más, no un paso
 * previo obligatorio.
 *
 * Corregir reusa esta misma pantalla, con el formato fijo: no se puede
 * pasar de apunte a hilo, ni cambiar las opciones ya votadas de una
 * encuesta, ni el archivo ya publicado de un audio o un vídeo — igual que
 * en la app.
 */
export function ComposerDialog({
  open,
  onOpenChange,
  pieza,
  tipo,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` = crear. Una pieza existente = corregir. */
  pieza: Pieza | null;
  /** De qué lista viene `pieza` — hace falta porque `Pieza` no dice si es post o nota. */
  tipo: 'posts' | 'apuntes';
  onSaved: () => void;
}) {
  const editando = pieza !== null;

  const [formato, setFormato] = React.useState<Formato>('nota');
  const [titular, setTitular] = React.useState('');
  const [entradilla, setEntradilla] = React.useState('');
  const [cuerpo, setCuerpo] = React.useState('');
  const [access, setAccess] = React.useState<Access>('publico');
  const [precio, setPrecio] = React.useState('');
  const [circulo, setCirculo] = React.useState<Circulo | null>(null);
  const [coverUrl, setCoverUrl] = React.useState<string | null>(null);
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);
  const [videoUrl, setVideoUrl] = React.useState<string | null>(null);
  const [videoMedida, setVideoMedida] = React.useState<VideoMedida | null>(null);
  const [enlaceDelDirecto, setEnlaceDelDirecto] = React.useState('');
  const [medios, setMedios] = React.useState<MedioDelCarrusel[]>([]);
  const [partes, setPartes] = React.useState<string[]>([]);
  const [opciones, setOpciones] = React.useState<string[]>(['', '']);
  const [enviando, setEnviando] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    if (pieza) {
      const formatoDePieza: Formato = tipo === 'apuntes' ? 'nota' : ((pieza.kind as Formato | undefined) ?? 'articulo');
      setFormato(formatoDePieza);
      setTitular((pieza.title as string | undefined) ?? '');
      setEntradilla((pieza.subtitle as string | undefined) ?? '');
      setCuerpo(tipo === 'apuntes' ? ((pieza.body as string | undefined) ?? '') : ((pieza.bodyHtml as string | undefined) ?? ''));
      setAccess((pieza.access as Access | undefined) ?? 'publico');
      setPrecio('');
      setCirculo(null);
      setCoverUrl((pieza.coverUrl as string | undefined) ?? null);
      setAudioUrl((pieza.audioUrl as string | undefined) ?? null);
      setVideoUrl((pieza.videoUrl as string | undefined) ?? null);
      setVideoMedida(null);
      setEnlaceDelDirecto('');
      // Corregir una nota sólo cambia el texto: no se reabre su carrusel
      // (ni el de un hilo, que tampoco se corrige como conjunto), igual que
      // en la app.
      setMedios([]);
      setPartes([]);
      setOpciones(['', '']);
    } else {
      setFormato('nota');
      setTitular('');
      setEntradilla('');
      setCuerpo('');
      setAccess('publico');
      setPrecio('');
      setCirculo(null);
      setCoverUrl(null);
      setAudioUrl(null);
      setVideoUrl(null);
      setVideoMedida(null);
      setEnlaceDelDirecto('');
      setMedios([]);
      setPartes([]);
      setOpciones(['', '']);
    }
  }, [open, pieza, tipo]);

  /** Cambiar de formato suelta el archivo si ya no aplica — igual que `cambiarFormato` en la app. */
  function cambiarFormato(nuevo: Formato) {
    if (editando) return;
    const archivoDeAntes = pideArchivoUnico(formato);
    const archivoDeAhora = pideArchivoUnico(nuevo);
    if (archivoDeAntes !== archivoDeAhora) {
      setAudioUrl(null);
      setVideoUrl(null);
      setVideoMedida(null);
    }
    setFormato(nuevo);
  }

  function agregarParte() {
    if (partes.length >= TOPE_PARTES_HILO - 1) return;
    if (formato !== 'hilo') setFormato('hilo');
    setPartes((prev) => [...prev, '']);
  }

  function quitarParte(i: number) {
    const parte = partes[i] ?? '';
    if (parte.trim() && !window.confirm('¿Quitar este apunte? Lo que escribiste en él se pierde.')) return;
    const restante = partes.filter((_, j) => j !== i);
    setPartes(restante);
    if (restante.length === 0) setFormato('nota');
  }

  function agregarOpcion() {
    if (opciones.length >= TOPE_OPCIONES_ENCUESTA) return;
    setOpciones((prev) => [...prev, '']);
  }

  const archivoUnico = pideArchivoUnico(formato);
  const mostrarTitular = pideTitular(formato);
  const mostrarEntradilla = pideEntradilla(formato);
  const mostrarCarrusel = permiteCarrusel(formato) && !editando;
  const mostrarAlcance = permiteAlcance(formato);
  const mostrarCirculo = permiteCirculo(formato) && !editando;
  const mostrarContador = cuentaComoApunte(formato);
  const puedeEncadenar = mostrarContador && !editando && partes.length < TOPE_PARTES_HILO - 1;

  const corto = FORMATOS.find((f) => f.clave === formato)?.corto ?? formato;
  const tituloDialogo = editando ? `Editar ${corto.toLowerCase()}` : `Crear ${corto.toLowerCase()}`;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Al editar una encuesta las opciones se quedan como están: se valida
    // con un par de opciones de relleno para no bloquear el guardado por
    // algo que esta pantalla no toca.
    const opcionesParaValidar = editando && formato === 'encuesta' ? ['_', '_'] : opciones;
    const motivo = porQueNoSePuedePublicar({
      formato,
      titular,
      cuerpo,
      partes,
      opciones: opcionesParaValidar,
      piezas: medios.length,
      tieneArchivo: archivoUnico === 'audio' ? Boolean(audioUrl) : archivoUnico === 'video' ? Boolean(videoUrl) : false,
      tieneCaratula: Boolean(coverUrl),
      enlaceDelDirecto,
    });
    if (motivo) {
      setError(motivo);
      return;
    }

    const priceCop = access === 'pago' && precio.trim() ? Number(precio) : undefined;

    setEnviando(true);
    try {
      if (editando && pieza) {
        if (tipo === 'apuntes') {
          await tamixApi.editarNota(pieza.id, { body: cuerpo });
        } else {
          await tamixApi.editarPost(pieza.id, {
            title: titular.trim(),
            subtitle: mostrarEntradilla ? entradilla.trim() || undefined : undefined,
            bodyHtml: cuerpo,
            access,
            priceCop,
            coverUrl: coverUrl ?? undefined,
            audioUrl: archivoUnico === 'audio' ? (audioUrl ?? undefined) : undefined,
            videoUrl: archivoUnico === 'video' ? (videoUrl ?? undefined) : undefined,
            youtubeUrl: formato === 'envivo' ? enlaceDelDirecto.trim() || undefined : undefined,
          });
        }
        toast.success('Cambios guardados');
      } else if (esApunte(formato)) {
        await tamixApi.crearNota({ body: cuerpo, medios: medios.length > 0 ? medios : undefined, circulo: circulo ?? undefined });
        toast.success('Publicado');
      } else if (esHilo(formato)) {
        const raiz = await tamixApi.crearNota({ body: cuerpo, medios: medios.length > 0 ? medios : undefined, circulo: circulo ?? undefined });
        let anteriorId = raiz.id;
        for (const parte of trozosDelHilo(partes)) {
          const siguiente = await tamixApi.crearNota({ body: parte, parentId: anteriorId });
          anteriorId = siguiente.id;
        }
        toast.success('Hilo publicado');
      } else if (formato === 'encuesta') {
        await tamixApi.crearPost({
          kind: 'encuesta',
          title: titular.trim(),
          bodyHtml: cuerpo,
          access,
          priceCop,
          pollOptions: opciones.map((o) => o.trim()).filter(Boolean),
        });
        toast.success('Publicado');
      } else if (formato === 'envivo') {
        await tamixApi.crearPost({ kind: 'envivo', title: titular.trim(), bodyHtml: cuerpo, access, priceCop, youtubeUrl: enlaceDelDirecto.trim() });
        toast.success('Publicado');
      } else if (formato === 'audio') {
        await tamixApi.crearPost({
          kind: 'audio',
          title: titular.trim(),
          bodyHtml: cuerpo,
          access,
          priceCop,
          coverUrl: coverUrl ?? undefined,
          audioUrl: audioUrl ?? undefined,
        });
        toast.success('Publicado');
      } else if (formato === 'video') {
        await tamixApi.crearPost({
          kind: 'video',
          title: titular.trim(),
          bodyHtml: cuerpo,
          access,
          priceCop,
          coverUrl: coverUrl ?? undefined,
          videoUrl: videoUrl ?? undefined,
          videoAncho: videoMedida?.ancho,
          videoAlto: videoMedida?.alto,
          durationSeconds: videoMedida?.duracionSegundos,
        });
        toast.success('Publicado');
      } else {
        // articulo, pregunta
        await tamixApi.crearPost({
          kind: formato,
          title: titular.trim(),
          subtitle: mostrarEntradilla ? entradilla.trim() || undefined : undefined,
          bodyHtml: cuerpo,
          access,
          priceCop,
          coverUrl: coverUrl ?? undefined,
        });
        toast.success('Publicado');
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo publicar. Inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (!enviando ? onOpenChange(v) : null)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{tituloDialogo}</DialogTitle>
          <DialogDescription>
            {editando ? 'Los cambios se guardan directo en Tamix.' : 'Se publica directo en tu cuenta de Tamix.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={enviar} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="formato">Formato</Label>
            <Select value={formato} onValueChange={(v) => cambiarFormato(v as Formato)} disabled={editando}>
              <SelectTrigger id="formato" className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORMATOS.map((f) => (
                  <SelectItem key={f.clave} value={f.clave}>
                    {f.corto}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{FORMATOS.find((f) => f.clave === formato)?.detalle}</p>
          </div>

          {mostrarTitular && (
            <div className="space-y-1.5">
              <Label htmlFor="titular">{formato === 'encuesta' ? 'Pregunta' : formato === 'pregunta' ? 'Pregunta' : 'Titular'}</Label>
              <Input id="titular" required value={titular} onChange={(e) => setTitular(e.target.value)} placeholder={placeholderDeTitular(formato)} />
            </div>
          )}

          {mostrarEntradilla && (
            <div className="space-y-1.5">
              <Label htmlFor="entradilla">Entradilla (opcional)</Label>
              <Input id="entradilla" value={entradilla} onChange={(e) => setEntradilla(e.target.value)} />
            </div>
          )}

          {formato === 'envivo' && (
            <div className="space-y-1.5">
              <Label htmlFor="enlaceDelDirecto">Pega el enlace de tu transmisión</Label>
              <Input
                id="enlaceDelDirecto"
                type="url"
                required
                value={enlaceDelDirecto}
                onChange={(e) => setEnlaceDelDirecto(e.target.value)}
                placeholder="https://youtube.com/watch?v=…"
              />
              <p className="text-xs text-muted-foreground">Vale el de la barra del navegador, el de «compartir» o el corto.</p>
            </div>
          )}

          {editando && (formato === 'audio' || formato === 'video') && (
            <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
              El archivo publicado se queda como está. Aquí corriges el titular, el texto y la carátula.
            </p>
          )}
          {editando && formato === 'encuesta' && (
            <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
              Las opciones ya votadas se quedan como están. Aquí corriges la pregunta y el texto.
            </p>
          )}

          {archivoUnico === 'audio' && !editando && <SubidaDeArchivo familia="audio" label="Audio" valor={audioUrl} onChange={setAudioUrl} />}
          {archivoUnico === 'video' && !editando && (
            <SubidaDeArchivo familia="video" label="Video" valor={videoUrl} onChange={setVideoUrl} onMedido={setVideoMedida} />
          )}
          {archivoUnico === 'audio' && (
            <div className="space-y-1">
              <SubidaDeArchivo familia="imagen" label="Portada" valor={coverUrl} onChange={setCoverUrl} />
              <p className="text-xs text-muted-foreground">Sin una foto, tu audio sale en el muro como una fila gris.</p>
            </div>
          )}
          {archivoUnico === 'video' && <SubidaDeArchivo familia="imagen" label="Portada (opcional)" valor={coverUrl} onChange={setCoverUrl} />}
          {formato === 'articulo' || formato === 'pregunta' ? (
            <SubidaDeArchivo familia="imagen" label="Portada (opcional)" valor={coverUrl} onChange={setCoverUrl} />
          ) : null}

          {mostrarCirculo && (
            <div className="space-y-1.5">
              <Label htmlFor="circulo">¿Quién puede responder?</Label>
              <Select value={circulo ?? 'todos'} onValueChange={(v) => setCirculo(v as Circulo)}>
                <SelectTrigger id="circulo" className="w-full sm:w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CIRCULOS.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{CIRCULOS.find((c) => c.id === (circulo ?? 'todos'))?.ayuda}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="cuerpo">{mostrarContador ? (formato === 'hilo' ? 'Empieza el hilo' : 'Apunte') : 'Cuerpo'}</Label>
            <Textarea
              id="cuerpo"
              required
              value={cuerpo}
              onChange={(e) => setCuerpo(e.target.value)}
              className={mostrarContador ? 'min-h-28' : 'min-h-40'}
              placeholder={placeholderDeCuerpo(formato)}
            />
            {mostrarContador && quedanDeApunte(cuerpo) <= 50 && (
              <p className={cn('text-right text-xs', quedanDeApunte(cuerpo) < 0 ? 'text-destructive' : 'text-muted-foreground')}>
                {quedanDeApunte(cuerpo)}
              </p>
            )}
          </div>

          {mostrarCarrusel && (
            <div className="space-y-1.5">
              <Label>Fotos o vídeos (opcional)</Label>
              <CarruselDeArchivos medios={medios} onChange={setMedios} />
            </div>
          )}

          {formato === 'hilo' && !editando && (
            <div className="space-y-3">
              {partes.map((parte, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-start gap-2">
                    <Textarea
                      value={parte}
                      onChange={(e) => setPartes((prev) => prev.map((p, j) => (j === i ? e.target.value : p)))}
                      className="min-h-20 flex-1"
                      placeholder="Sigue por aquí…"
                    />
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => quitarParte(i)} aria-label={`Quitar parte ${i + 2}`}>
                      <X className="size-4" />
                    </Button>
                  </div>
                  {quedanDeApunte(parte) <= 50 && (
                    <p className={cn('text-right text-xs', quedanDeApunte(parte) < 0 ? 'text-destructive' : 'text-muted-foreground')}>
                      {quedanDeApunte(parte)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {puedeEncadenar && (
            <Button type="button" variant="outline" size="sm" onClick={agregarParte}>
              <Plus /> Agregar otro apunte
            </Button>
          )}

          {formato === 'encuesta' && !editando && (
            <div className="space-y-2">
              <Label>Opciones</Label>
              {opciones.map((opcion, i) => (
                <Input
                  key={i}
                  value={opcion}
                  onChange={(e) => setOpciones((prev) => prev.map((o, j) => (j === i ? e.target.value : o)))}
                  placeholder={`Opción ${i + 1}`}
                />
              ))}
              {opciones.length < TOPE_OPCIONES_ENCUESTA && (
                <Button type="button" variant="outline" size="sm" onClick={agregarOpcion}>
                  <Plus /> Añadir opción
                </Button>
              )}
              <p className="text-xs text-muted-foreground">Hacen falta al menos {MINIMO_OPCIONES_ENCUESTA}.</p>
            </div>
          )}

          {mostrarAlcance && (
            <div className="space-y-1.5">
              <Label htmlFor="access">¿Quién puede verlo?</Label>
              <Select value={access} onValueChange={(v) => setAccess(v as Access)}>
                <SelectTrigger id="access" className="w-full sm:w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALCANCE.map((a) => (
                    <SelectItem key={a.clave} value={a.clave}>
                      {a.etiqueta}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{ALCANCE.find((a) => a.clave === access)?.detalle}</p>
            </div>
          )}

          {mostrarAlcance && access === 'pago' && (
            <div className="space-y-1.5">
              <Label htmlFor="precio">Precio suelto en pesos. Ej: 9900</Label>
              <Input id="precio" type="number" min={0} value={precio} onChange={(e) => setPrecio(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                {precio.trim() ? `Se llevarán tu pieza por ${formatCop(Number(precio))}` : 'Déjalo vacío y sólo la abrirán tus suscriptores'}
              </p>
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>
              Cancelar
            </Button>
            <Button type="submit" disabled={enviando}>
              {enviando && <Loader2 className="animate-spin" />}
              {enviando ? (editando ? 'Guardando…' : 'Publicando…') : editando ? 'Guardar' : 'Publicar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
