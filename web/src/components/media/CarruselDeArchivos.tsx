import * as React from 'react';
import { GripVertical, ImagePlus, Loader2, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { medirArchivo, porQueNoSePuedeSubir, subirArchivo } from '@/lib/subirArchivo';
import type { MedioDelCarrusel } from '@/types/tamix';

/** Hasta diez piezas por apunte — igual que en la app, ver `TOPE_DE_PIEZAS`. */
const TOPE_DE_PIEZAS = 10;

const ACEPTA = 'image/jpeg,image/png,image/webp,video/mp4,video/webm';

type EnCurso = { id: string; nombre: string; avance: number; error: string | null };

/**
 * El carrusel de un apunte: hasta diez piezas, imagen y vídeo mezclados, en
 * el orden en que se publican. Cada archivo se sube en cuanto se suelta —no
 * hay un botón de «subir todo»— y el orden se cambia con las flechas.
 */
export function CarruselDeArchivos({
  medios,
  onChange,
}: {
  medios: MedioDelCarrusel[];
  onChange: (medios: MedioDelCarrusel[]) => void;
}) {
  const [enCurso, setEnCurso] = React.useState<EnCurso[]>([]);
  const [arrastrando, setArrastrando] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const sitio = TOPE_DE_PIEZAS - medios.length - enCurso.length;

  async function agregar(archivos: FileList | File[]) {
    const lista = Array.from(archivos).slice(0, Math.max(sitio, 0));
    for (const archivo of lista) {
      const problema = porQueNoSePuedeSubir(archivo);
      const id = `${Date.now()}-${Math.random()}`;
      if (problema) {
        setEnCurso((prev) => [...prev, { id, nombre: archivo.name, avance: 0, error: problema }]);
        continue;
      }
      setEnCurso((prev) => [...prev, { id, nombre: archivo.name, avance: 0, error: null }]);
      const tipo = archivo.type.startsWith('video/') ? 'video' : 'imagen';
      try {
        const [url, medida] = await Promise.all([
          subirArchivo(archivo, (fraccion) =>
            setEnCurso((prev) => prev.map((f) => (f.id === id ? { ...f, avance: fraccion } : f)))
          ),
          medirArchivo(archivo).catch(() => null),
        ]);
        onChange([
          ...medios,
          {
            tipo,
            url,
            ancho: medida?.ancho ?? null,
            alto: medida?.alto ?? null,
            duracionSegundos: medida?.duracionSegundos ?? null,
          },
        ]);
      } catch (err) {
        setEnCurso((prev) =>
          prev.map((f) => (f.id === id ? { ...f, error: err instanceof Error ? err.message : 'No se pudo subir.' } : f))
        );
        continue;
      }
      setEnCurso((prev) => prev.filter((f) => f.id !== id));
    }
  }

  function quitar(i: number) {
    onChange(medios.filter((_, j) => j !== i));
  }

  function mover(i: number, hacia: -1 | 1) {
    const j = i + hacia;
    if (j < 0 || j >= medios.length) return;
    const copia = [...medios];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    onChange(copia);
  }

  return (
    <div className="space-y-2">
      {medios.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {medios.map((medio, i) => (
            <li key={`${medio.url}-${i}`} className="group relative overflow-hidden rounded-md border bg-muted">
              {medio.tipo === 'imagen' ? (
                <img src={medio.url} alt="" className="aspect-square w-full object-cover" />
              ) : (
                <video src={medio.url} className="aspect-square w-full bg-black object-contain" muted />
              )}
              <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent p-1">
                <span className="rounded bg-black/50 px-1 text-[10px] text-white">{i + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-white hover:bg-white/20 hover:text-white"
                  onClick={() => quitar(i)}
                  aria-label={`Quitar pieza ${i + 1}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
              <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-gradient-to-t from-black/60 to-transparent p-1 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={i === 0}
                  className="text-white hover:bg-white/20 hover:text-white disabled:opacity-30"
                  onClick={() => mover(i, -1)}
                  aria-label={`Mover pieza ${i + 1} antes`}
                >
                  <GripVertical className="size-3.5 -rotate-90" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={i === medios.length - 1}
                  className="text-white hover:bg-white/20 hover:text-white disabled:opacity-30"
                  onClick={() => mover(i, 1)}
                  aria-label={`Mover pieza ${i + 1} después`}
                >
                  <GripVertical className="size-3.5 rotate-90" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {enCurso.length > 0 && (
        <ul className="space-y-1.5">
          {enCurso.map((f) => (
            <li key={f.id} className="rounded-md border p-2 text-sm">
              <div className="flex items-center gap-2">
                {f.error ? (
                  <span className="text-destructive">{f.error}</span>
                ) : (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span className="flex-1 truncate">{f.nombre}</span>
                  </>
                )}
              </div>
              {!f.error && <Progress value={Math.round(f.avance * 100)} className="mt-1 h-1" />}
            </li>
          ))}
        </ul>
      )}

      {sitio > 0 && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastrando(false);
            if (e.dataTransfer.files?.length) void agregar(e.dataTransfer.files);
          }}
          className={cn(
            'flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed p-3 text-center text-sm text-muted-foreground transition-colors',
            arrastrando && 'border-primary bg-primary/5 text-primary'
          )}
        >
          <ImagePlus className="size-5" />
          <span>
            Arrastra fotos o vídeos, o haz clic — caben {sitio} más de {TOPE_DE_PIEZAS}
          </span>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACEPTA}
        multiple
        className="sr-only"
        onChange={(e) => {
          const archivos = e.target.files;
          e.target.value = '';
          if (archivos?.length) void agregar(archivos);
        }}
      />
    </div>
  );
}
