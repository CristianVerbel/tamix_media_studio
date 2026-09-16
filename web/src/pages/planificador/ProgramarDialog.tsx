import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/apiError';
import { toDatetimeLocalValue } from '@/lib/format';
import { studioApi } from '@/lib/studioApi';
import type { Access, PostKind } from '@/types/tamix';
import type { EntradaDeItem, ItemDeCola } from '@/types/studio';

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

function primeraHoraFutura(): string {
  const en1h = new Date(Date.now() + 60 * 60 * 1000);
  return toDatetimeLocalValue(en1h);
}

export function ProgramarDialog({
  handle,
  open,
  onOpenChange,
  item,
  onSaved,
}: {
  handle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = crear; un item = editar */
  item: ItemDeCola | null;
  onSaved: () => void;
}) {
  const editando = item !== null;

  const [kind, setKind] = React.useState<PostKind>('articulo');
  const [title, setTitle] = React.useState('');
  const [subtitle, setSubtitle] = React.useState('');
  const [bodyHtml, setBodyHtml] = React.useState('');
  const [coverUrl, setCoverUrl] = React.useState('');
  const [access, setAccess] = React.useState<Access>('publico');
  const [topics, setTopics] = React.useState('');
  const [enlaceExterno, setEnlaceExterno] = React.useState('');
  const [publishAt, setPublishAt] = React.useState(primeraHoraFutura());
  const [enviando, setEnviando] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    if (item) {
      setKind(item.kind);
      setTitle(item.title);
      setSubtitle(item.subtitle ?? '');
      setBodyHtml(item.bodyHtml);
      setCoverUrl(item.coverUrl ?? '');
      setAccess(item.access);
      setTopics((item.topics ?? []).join(', '));
      setEnlaceExterno(item.enlaceExterno ?? '');
      setPublishAt(toDatetimeLocalValue(new Date(item.publishAt)));
    } else {
      setKind('articulo');
      setTitle('');
      setSubtitle('');
      setBodyHtml('');
      setCoverUrl('');
      setAccess('publico');
      setTopics('');
      setEnlaceExterno('');
      setPublishAt(primeraHoraFutura());
    }
    setError(null);
  }, [open, item]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const publishAtIso = new Date(publishAt).toISOString();
    const entrada: EntradaDeItem = {
      kind,
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      bodyHtml,
      coverUrl: coverUrl.trim() || undefined,
      access,
      topics: topics
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      enlaceExterno: enlaceExterno.trim() || undefined,
      publishAt: publishAtIso,
    };

    setEnviando(true);
    try {
      if (editando && item) {
        await studioApi.reprogramar(handle, item.itemId, entrada);
        toast.success('Reprogramado');
      } else {
        await studioApi.programar(handle, entrada);
        toast.success('Programado');
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar. Inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (!enviando ? onOpenChange(v) : null)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editando ? 'Reprogramar' : 'Programar contenido'}</DialogTitle>
          <DialogDescription>Se publica solo en la fecha elegida, usando tu automatización conectada.</DialogDescription>
        </DialogHeader>

        <form onSubmit={enviar} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="p-kind">Formato</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as PostKind)}>
                <SelectTrigger id="p-kind" className="w-full">
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
              <Label htmlFor="p-access">Acceso</Label>
              <Select value={access} onValueChange={(v) => setAccess(v as Access)}>
                <SelectTrigger id="p-access" className="w-full">
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
            <Label htmlFor="p-title">Titular</Label>
            <Input id="p-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-subtitle">Subtítulo (opcional)</Label>
            <Input id="p-subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-body">Cuerpo</Label>
            <Textarea id="p-body" required value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)} className="min-h-32" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="p-cover">Portada (URL)</Label>
              <Input id="p-cover" type="url" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-topics">Temas (coma)</Label>
              <Input id="p-topics" value={topics} onChange={(e) => setTopics(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-enlace">Enlace externo (opcional)</Label>
            <Input id="p-enlace" type="url" value={enlaceExterno} onChange={(e) => setEnlaceExterno(e.target.value)} placeholder="https://…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-publishAt">Fecha y hora de publicación</Label>
            <Input id="p-publishAt" type="datetime-local" required value={publishAt} onChange={(e) => setPublishAt(e.target.value)} />
            <p className="text-xs text-muted-foreground">Hora local de tu navegador.</p>
          </div>

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
              {editando ? 'Guardar cambios' : 'Programar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
