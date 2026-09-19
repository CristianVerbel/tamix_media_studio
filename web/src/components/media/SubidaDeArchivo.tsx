import * as React from 'react';
import { ImageUp, Loader2, Music, Video, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { medirArchivo, medirDuracionDeAudio, porQueNoCabeLaDuracion, porQueNoSePuedeSubir, subirArchivo } from '@/lib/subirArchivo';

type Familia = 'imagen' | 'audio' | 'video';

const ACEPTA: Record<Familia, string> = {
  imagen: 'image/jpeg,image/png,image/webp',
  audio: 'audio/mpeg,audio/mp4,audio/aac,audio/webm,audio/ogg',
  video: 'video/mp4,video/webm',
};

const ICONO: Record<Familia, React.ComponentType<{ className?: string }>> = {
  imagen: ImageUp,
  audio: Music,
  video: Video,
};

const TEXTO: Record<Familia, string> = {
  imagen: 'Arrastra una imagen, o haz clic para elegirla',
  audio: 'Arrastra un audio, o haz clic para elegirlo',
  video: 'Arrastra un vídeo, o haz clic para elegirlo',
};

/**
 * Un cuadro que sube un solo archivo — la portada, el audio o el vídeo de
 * una pieza — y guarda su dirección pública.
 *
 * No guarda el archivo, guarda la URL a la que quedó: es lo mismo que
 * espera `coverUrl`/`audioUrl`/`videoUrl` en `POST /posts`, así que en
 * cuanto termina de subir esto ya vale para publicar.
 */
export function SubidaDeArchivo({
  familia,
  label,
  valor,
  onChange,
  onMedido,
}: {
  familia: Familia;
  label: string;
  valor: string | null;
  onChange: (url: string | null) => void;
  /** Ancho, alto y duración del archivo, en cuanto se pueden leer. Sólo imagen y vídeo. */
  onMedido?: (medida: { ancho: number; alto: number; duracionSegundos?: number }) => void;
}) {
  const [subiendo, setSubiendo] = React.useState(false);
  const [avance, setAvance] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [arrastrando, setArrastrando] = React.useState(false);
  const [nombreLocal, setNombreLocal] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const Icono = ICONO[familia];

  async function subir(archivo: File) {
    const problema = porQueNoSePuedeSubir(archivo);
    if (problema) {
      setError(problema);
      return;
    }

    // La duración se revisa antes de subir, no después: gastar la subida
    // entera de un vídeo de cinco minutos para enterarse al final de que no
    // cabe es peor que decirlo de una vez, igual que hace la app.
    let medidaVideo: { ancho: number; alto: number; duracionSegundos?: number } | null = null;
    if (familia === 'video') {
      try {
        medidaVideo = await medirArchivo(archivo);
        const motivo = porQueNoCabeLaDuracion('video', medidaVideo.duracionSegundos);
        if (motivo) {
          setError(motivo);
          return;
        }
      } catch {
        // Si no se pudo medir, se deja pasar: el servidor es la autoridad final.
      }
    }
    if (familia === 'audio') {
      try {
        const duracion = await medirDuracionDeAudio(archivo);
        const motivo = porQueNoCabeLaDuracion('audio', duracion);
        if (motivo) {
          setError(motivo);
          return;
        }
      } catch {
        // Igual: sin medida, se deja pasar.
      }
    }

    setError(null);
    setNombreLocal(archivo.name);
    setSubiendo(true);
    setAvance(0);
    try {
      const [url] = await Promise.all([
        subirArchivo(archivo, setAvance),
        (async () => {
          if (!onMedido || familia === 'audio') return;
          if (medidaVideo) {
            onMedido(medidaVideo);
            return;
          }
          try {
            onMedido(await medirArchivo(archivo));
          } catch {
            // Sin medida no se puede componer el marco a su proporción, pero
            // la subida en sí no depende de esto: se sigue publicando.
          }
        })(),
      ]);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir el archivo.');
      setNombreLocal(null);
    } finally {
      setSubiendo(false);
    }
  }

  function alSoltar(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setArrastrando(false);
    const archivo = e.dataTransfer.files?.[0];
    if (archivo) void subir(archivo);
  }

  if (valor && !subiendo) {
    return (
      <div className="space-y-1.5">
        <p className="text-sm font-medium">{label}</p>
        <div className="relative overflow-hidden rounded-md border bg-muted">
          {familia === 'imagen' ? (
            <img src={valor} alt="" className="h-40 w-full object-cover" />
          ) : familia === 'video' ? (
            <video src={valor} controls className="h-40 w-full bg-black object-contain" />
          ) : (
            <div className="flex items-center gap-2 p-3">
              <Music className="size-5 text-muted-foreground" />
              <audio src={valor} controls className="h-9 flex-1" />
            </div>
          )}
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            className="absolute top-2 right-2 shadow"
            onClick={() => {
              onChange(null);
              setNombreLocal(null);
              setError(null);
            }}
            aria-label={`Quitar ${label.toLowerCase()}`}
          >
            <X />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{label}</p>
      <div
        role="button"
        tabIndex={0}
        onClick={() => !subiendo && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!subiendo && (e.key === 'Enter' || e.key === ' ')) inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!subiendo) setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={subiendo ? undefined : alSoltar}
        className={cn(
          'flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground transition-colors',
          arrastrando && 'border-primary bg-primary/5 text-primary',
          subiendo && 'cursor-default'
        )}
      >
        {subiendo ? (
          <div className="w-full max-w-56 space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              <span className="truncate">{nombreLocal ?? 'Subiendo…'}</span>
            </div>
            <Progress value={Math.round(avance * 100)} />
          </div>
        ) : (
          <>
            <Icono className="size-6" />
            <span>{TEXTO[familia]}</span>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACEPTA[familia]}
        className="sr-only"
        onChange={(e) => {
          const archivo = e.target.files?.[0];
          e.target.value = '';
          if (archivo) void subir(archivo);
        }}
      />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
