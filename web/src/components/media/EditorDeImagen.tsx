import * as React from 'react';
import { FlipHorizontal, Loader2, RotateCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { aplicarEdicion, PROPORCIONES, type AjusteDeImagen, type Proporcion } from '@/lib/imagenEdicion';

/**
 * El editor de imagen del carrusel: girar, voltear y recortar a una
 * proporción fija — igual que `EditorDeImagen.tsx` de la app. Sin lienzo de
 * arrastre libre: cuatro chips de proporción, nada más, y la vista previa
 * se arma con CSS (rotar/voltear con `transform`, recortar con
 * `object-fit: cover` dentro de una caja con la proporción elegida) — el
 * recorte real, a píxeles, sólo se calcula al tocar «Listo».
 */
export function EditorDeImagen({
  archivo,
  open,
  onOpenChange,
  onListo,
}: {
  archivo: File | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onListo: (archivoEditado: File) => void;
}) {
  const [url, setUrl] = React.useState<string | null>(null);
  const [rotacion, setRotacion] = React.useState<AjusteDeImagen['rotacion']>(0);
  const [espejo, setEspejo] = React.useState(false);
  const [proporcion, setProporcion] = React.useState<Proporcion>('original');
  const [procesando, setProcesando] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open || !archivo) return;
    setRotacion(0);
    setEspejo(false);
    setProporcion('original');
    setError(null);
    const objUrl = URL.createObjectURL(archivo);
    setUrl(objUrl);
    return () => URL.revokeObjectURL(objUrl);
  }, [open, archivo]);

  async function confirmar() {
    if (!archivo) return;
    setProcesando(true);
    setError(null);
    try {
      const editado = await aplicarEdicion(archivo, { rotacion, espejo, proporcion });
      onListo(editado);
      onOpenChange(false);
    } catch {
      setError('No pudimos editar esta imagen.');
    } finally {
      setProcesando(false);
    }
  }

  const proporcionElegida = PROPORCIONES.find((p) => p.clave === proporcion) ?? PROPORCIONES[0]!;
  const cajaProporcion = proporcionElegida.relacion ? `${proporcionElegida.relacion} / 1` : undefined;

  return (
    <Dialog open={open} onOpenChange={(v) => (!procesando ? onOpenChange(v) : null)}>
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader className="flex-row items-center justify-between space-y-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={procesando}>
            Cancelar
          </Button>
          <DialogTitle>Editar foto</DialogTitle>
          <Button type="button" onClick={confirmar} disabled={procesando || !url}>
            {procesando && <Loader2 className="animate-spin" />}
            Listo
          </Button>
        </DialogHeader>

        {url && (
          <div className="flex items-center justify-center overflow-hidden rounded-md border bg-muted">
            <div className="w-full overflow-hidden" style={{ aspectRatio: cajaProporcion ?? '1 / 1', maxHeight: 360 }}>
              <img
                src={url}
                alt=""
                className="size-full object-cover"
                style={{ transform: `rotate(${rotacion}deg) scaleX(${espejo ? -1 : 1})` }}
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setRotacion((r) => ((r + 90) % 360) as AjusteDeImagen['rotacion'])}>
            <RotateCw /> Girar
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setEspejo((e) => !e)}>
            <FlipHorizontal /> Voltear
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {PROPORCIONES.map((p) => (
            <button
              key={p.clave}
              type="button"
              onClick={() => setProporcion(p.clave)}
              className={cn(
                'rounded-full border px-3 py-1 text-sm transition-colors',
                p.clave === proporcion ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:text-foreground'
              )}
            >
              {p.etiqueta}
            </button>
          ))}
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
