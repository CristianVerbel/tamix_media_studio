import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ApiError } from '@/lib/apiError';
import { etiquetaRol, type Rol } from '@/lib/roles';
import { tamixApi } from '@/lib/tamixApi';

const ROLES_INVITABLES: Rol[] = ['analista', 'redactor', 'editor', 'propietario'];

export function InvitarDialog({
  handle,
  open,
  onOpenChange,
  onInvited,
}: {
  handle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvited: () => void;
}) {
  const [alias, setAlias] = React.useState('');
  const [rol, setRol] = React.useState<Rol>('redactor');
  const [enviando, setEnviando] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await tamixApi.invitar(handle, alias.replace(/^@/, '').trim(), rol);
      toast.success('Invitación enviada');
      setAlias('');
      setRol('redactor');
      onOpenChange(false);
      onInvited();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo invitar. Inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (!enviando ? onOpenChange(v) : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invitar al equipo</DialogTitle>
          <DialogDescription>Invita por el @handle de Tamix de la persona, no por correo.</DialogDescription>
        </DialogHeader>
        <form onSubmit={enviar} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="alias">@handle en Tamix</Label>
            <Input id="alias" required value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="@usuario" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rol">Papel</Label>
            <Select value={rol} onValueChange={(v) => setRol(v as Rol)}>
              <SelectTrigger id="rol" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES_INVITABLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {etiquetaRol(r)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Button type="submit" disabled={enviando || !alias.trim()}>
              {enviando && <Loader2 className="animate-spin" />}
              Invitar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
