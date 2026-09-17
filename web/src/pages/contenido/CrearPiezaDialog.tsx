import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { CarruselDeArchivos } from '@/components/media/CarruselDeArchivos';
import { SubidaDeArchivo } from '@/components/media/SubidaDeArchivo';
import { ApiError } from '@/lib/apiError';
import { tamixApi } from '@/lib/tamixApi';
import type { Access, MedioDelCarrusel, PostKind } from '@/types/tamix';

const TIPOS_DE_POST: { value: PostKind; label: string }[] = [
  { value: 'articulo', label: 'Artículo' },
  { value: 'audio', label: 'Audio' },
  { value: 'video', label: 'Video' },
  { value: 'envivo', label: 'En vivo' },
];

const ACCESOS: { value: Access; label: string }[] = [
  { value: 'publico', label: 'Público' },
  { value: 'suscriptores', label: 'Sólo suscriptores' },
  { value: 'pago', label: 'De pago' },
];

export function CrearPiezaDialog({
  open,
  onOpenChange,
  tipoInicial,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipoInicial: 'posts' | 'apuntes';
  onCreated: () => void;
}) {
  const [tipo, setTipo] = React.useState<'posts' | 'apuntes'>(tipoInicial);
  const [kind, setKind] = React.useState<PostKind>('articulo');
  const [title, setTitle] = React.useState('');
  const [subtitle, setSubtitle] = React.useState('');
  const [bodyHtml, setBodyHtml] = React.useState('');
  const [access, setAccess] = React.useState<Access>('publico');
  const [coverUrl, setCoverUrl] = React.useState<string | null>(null);
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);
  const [videoUrl, setVideoUrl] = React.useState<string | null>(null);
  const [videoMedida, setVideoMedida] = React.useState<{ ancho: number; alto: number; duracionSegundos?: number } | null>(null);
  const [topics, setTopics] = React.useState('');
  const [notaBody, setNotaBody] = React.useState('');
  const [medios, setMedios] = React.useState<MedioDelCarrusel[]>([]);
  const [enviando, setEnviando] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) setTipo(tipoInicial);
  }, [open, tipoInicial]);

  function limpiar() {
    setTitle('');
    setSubtitle('');
    setBodyHtml('');
    setAccess('publico');
    setCoverUrl(null);
    setAudioUrl(null);
    setVideoUrl(null);
    setVideoMedida(null);
    setTopics('');
    setNotaBody('');
    setMedios([]);
    setError(null);
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (tipo === 'posts' && kind === 'audio' && !audioUrl) {
      setError('Un audio sin archivo no se puede publicar.');
      return;
    }
    if (tipo === 'posts' && kind === 'video' && !videoUrl) {
      setError('Falta subir el vídeo.');
      return;
    }
    setEnviando(true);
    try {
      if (tipo === 'posts') {
        await tamixApi.crearPost({
          kind,
          title: title.trim(),
          bodyHtml,
          access,
          subtitle: subtitle.trim() || undefined,
          coverUrl: coverUrl ?? undefined,
          topics: topics
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          audioUrl: kind === 'audio' ? (audioUrl ?? undefined) : undefined,
          videoUrl: kind === 'video' ? (videoUrl ?? undefined) : undefined,
          videoAncho: kind === 'video' ? videoMedida?.ancho : undefined,
          videoAlto: kind === 'video' ? videoMedida?.alto : undefined,
          durationSeconds: kind === 'video' ? videoMedida?.duracionSegundos : undefined,
        });
      } else {
        await tamixApi.crearNota({ body: notaBody, medios: medios.length > 0 ? medios : undefined });
      }
      toast.success('Contenido publicado');
      limpiar();
      onOpenChange(false);
      onCreated();
    } catch (err) {
      const mensaje = err instanceof ApiError ? err.message : 'No se pudo publicar. Inténtalo de nuevo.';
      setError(mensaje);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (!enviando ? onOpenChange(v) : null)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Crear contenido</DialogTitle>
          <DialogDescription>Se publica de inmediato en tu cuenta de Tamix. Para publicarlo más tarde, usa el planificador.</DialogDescription>
        </DialogHeader>

        <Tabs value={tipo} onValueChange={(v) => setTipo(v as 'posts' | 'apuntes')}>
          <TabsList>
            <TabsTrigger value="posts">Artículo / pieza larga</TabsTrigger>
            <TabsTrigger value="apuntes">Apunte corto</TabsTrigger>
          </TabsList>
        </Tabs>

        <form onSubmit={enviar} className="space-y-4">
          {tipo === 'posts' ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="kind">Formato</Label>
                  <Select value={kind} onValueChange={(v) => setKind(v as PostKind)}>
                    <SelectTrigger id="kind" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_DE_POST.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="access">Acceso</Label>
                  <Select value={access} onValueChange={(v) => setAccess(v as Access)}>
                    <SelectTrigger id="access" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCESOS.map((a) => (
                        <SelectItem key={a.value} value={a.value}>
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="title">Titular</Label>
                <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Un titular claro" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="subtitle">Subtítulo (opcional)</Label>
                <Input id="subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bodyHtml">Cuerpo</Label>
                <Textarea id="bodyHtml" required value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)} className="min-h-40" />
              </div>

              {kind === 'video' && (
                <SubidaDeArchivo
                  familia="video"
                  label="Vídeo"
                  valor={videoUrl}
                  onChange={setVideoUrl}
                  onMedido={setVideoMedida}
                />
              )}
              {kind === 'audio' && <SubidaDeArchivo familia="audio" label="Audio" valor={audioUrl} onChange={setAudioUrl} />}

              <SubidaDeArchivo familia="imagen" label="Portada (opcional)" valor={coverUrl} onChange={setCoverUrl} />

              <div className="space-y-1.5">
                <Label htmlFor="topics">Temas (separados por coma)</Label>
                <Input id="topics" value={topics} onChange={(e) => setTopics(e.target.value)} placeholder="política, economía" />
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="notaBody">Apunte</Label>
                <Textarea id="notaBody" required value={notaBody} onChange={(e) => setNotaBody(e.target.value)} className="min-h-32" placeholder="Comparte una idea corta…" />
              </div>
              <div className="space-y-1.5">
                <Label>Fotos o vídeos (opcional)</Label>
                <CarruselDeArchivos medios={medios} onChange={setMedios} />
              </div>
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
              Publicar ahora
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
