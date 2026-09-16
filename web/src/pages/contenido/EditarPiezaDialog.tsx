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
import { tamixApi } from '@/lib/tamixApi';
import type { Access, Pieza } from '@/types/tamix';

const ACCESOS: { value: Access; label: string }[] = [
  { value: 'publico', label: 'Público' },
  { value: 'suscriptores', label: 'Sólo suscriptores' },
  { value: 'pago', label: 'De pago' },
];

export function EditarPiezaDialog({
  pieza,
  tipo,
  onOpenChange,
  onSaved,
}: {
  pieza: Pieza | null;
  tipo: 'posts' | 'apuntes';
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const esPost = tipo === 'posts';
  const [title, setTitle] = React.useState('');
  const [subtitle, setSubtitle] = React.useState('');
  const [bodyHtml, setBodyHtml] = React.useState('');
  const [access, setAccess] = React.useState<Access>('publico');
  const [coverUrl, setCoverUrl] = React.useState('');
  const [notaBody, setNotaBody] = React.useState('');
  const [enviando, setEnviando] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!pieza) return;
    setTitle((pieza.title as string | undefined) ?? '');
    setSubtitle((pieza.subtitle as string | undefined) ?? '');
    setBodyHtml((pieza.bodyHtml as string | undefined) ?? '');
    setAccess((pieza.access as Access | undefined) ?? 'publico');
    setCoverUrl((pieza.coverUrl as string | undefined) ?? '');
    setNotaBody((pieza.body as string | undefined) ?? '');
    setError(null);
  }, [pieza]);

  async function enviar(e: React.FormEvent) {
    if (!pieza) return;
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      if (esPost) {
        await tamixApi.editarPost(pieza.id, {
          title: title.trim(),
          subtitle: subtitle.trim() || undefined,
          bodyHtml,
          access,
          coverUrl: coverUrl.trim() || undefined,
        });
      } else {
        await tamixApi.editarNota(pieza.id, { body: notaBody });
      }
      toast.success('Cambios guardados');
      onOpenChange(false);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar. Inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={pieza !== null} onOpenChange={(v) => (!enviando ? onOpenChange(v) : null)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar {esPost ? 'pieza' : 'apunte'}</DialogTitle>
          <DialogDescription>Los cambios se guardan directo en Tamix.</DialogDescription>
        </DialogHeader>

        <form onSubmit={enviar} className="space-y-4">
          {esPost ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="e-title">Titular</Label>
                <Input id="e-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-subtitle">Subtítulo</Label>
                <Input id="e-subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-body">Cuerpo</Label>
                <Textarea id="e-body" required value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)} className="min-h-40" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="e-cover">Portada (URL)</Label>
                  <Input id="e-cover" type="url" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="e-access">Acceso</Label>
                  <Select value={access} onValueChange={(v) => setAccess(v as Access)}>
                    <SelectTrigger id="e-access" className="w-full">
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
            </>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="e-notaBody">Apunte</Label>
              <Textarea id="e-notaBody" required value={notaBody} onChange={(e) => setNotaBody(e.target.value)} className="min-h-32" />
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
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
