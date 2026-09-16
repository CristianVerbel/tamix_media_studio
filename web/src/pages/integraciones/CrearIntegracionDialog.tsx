import * as React from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApiError } from '@/lib/apiError';
import { studioApi } from '@/lib/studioApi';
import { EVENTOS_DISPONIBLES, type EventoWebhook, type Integracion, type TipoDeIntegracion } from '@/types/studio';

const ETIQUETA_EVENTO: Record<EventoWebhook, string> = {
  'planificador.programado': 'Se programó algo',
  'planificador.publicado': 'Se publicó algo',
  'planificador.fallido': 'Falló una publicación',
  'integracion.sync.completado': 'Una fuente terminó de sincronizar',
  'integracion.sync.fallido': 'Una fuente falló al sincronizar',
};

export function CrearIntegracionDialog({
  handle,
  open,
  onOpenChange,
  onCreated,
}: {
  handle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (integracion: Integracion) => void;
}) {
  const [tipo, setTipo] = React.useState<TipoDeIntegracion>('rss');
  const [url, setUrl] = React.useState('');
  const [eventos, setEventos] = React.useState<EventoWebhook[]>(['planificador.publicado', 'planificador.fallido']);
  const [enviando, setEnviando] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setUrl('');
      setError(null);
    }
  }, [open, tipo]);

  function alternarEvento(evento: EventoWebhook) {
    setEventos((prev) => (prev.includes(evento) ? prev.filter((e) => e !== evento) : [...prev, evento]));
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const creada = tipo === 'rss' ? await studioApi.crearFuenteRss(handle, url.trim()) : await studioApi.crearWebhookSaliente(handle, url.trim(), eventos);
      onOpenChange(false);
      onCreated(creada);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear. Inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (!enviando ? onOpenChange(v) : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Conectar una integración</DialogTitle>
          <DialogDescription>Fuentes RSS que Tamix Media Studio vigila, o webhooks salientes que avisan a un sistema externo.</DialogDescription>
        </DialogHeader>

        <Tabs value={tipo} onValueChange={(v) => setTipo(v as TipoDeIntegracion)}>
          <TabsList>
            <TabsTrigger value="rss">Fuente RSS</TabsTrigger>
            <TabsTrigger value="webhook_saliente">Webhook saliente</TabsTrigger>
          </TabsList>
        </Tabs>

        <form onSubmit={enviar} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="i-url">{tipo === 'rss' ? 'URL del feed RSS' : 'URL a la que avisar'}</Label>
            <Input id="i-url" type="url" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
            <p className="text-xs text-muted-foreground">Tiene que servirse por HTTPS.</p>
          </div>

          {tipo === 'webhook_saliente' && (
            <div className="space-y-1.5">
              <Label>Eventos a los que suscribirse</Label>
              <div className="space-y-2 rounded-lg border border-border p-3">
                {EVENTOS_DISPONIBLES.map((evento) => (
                  <label key={evento} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={eventos.includes(evento)} onChange={() => alternarEvento(evento)} className="size-4 accent-[var(--tmx-violet)]" />
                    {ETIQUETA_EVENTO[evento]}
                  </label>
                ))}
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
            <Button type="submit" disabled={enviando || !url.trim() || (tipo === 'webhook_saliente' && eventos.length === 0)}>
              {enviando && <Loader2 className="animate-spin" />}
              Conectar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
