import * as React from 'react';
import { Check, Copy, ShieldAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function SecretoDialog({ secreto, onOpenChange }: { secreto: string | null; onOpenChange: (open: boolean) => void }) {
  const [copiado, setCopiado] = React.useState(false);

  React.useEffect(() => {
    if (secreto) setCopiado(false);
  }, [secreto]);

  async function copiar() {
    if (!secreto) return;
    try {
      await navigator.clipboard.writeText(secreto);
      setCopiado(true);
    } catch {
      // Portapapeles no disponible: la persona puede seleccionar el texto a mano.
    }
  }

  return (
    <Dialog open={secreto !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-[var(--tmx-warning)]" /> Guarda este secreto ahora
          </DialogTitle>
          <DialogDescription>No se vuelve a mostrar. Úsalo para verificar la firma de cada entrega del webhook.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3 font-mono text-sm break-all">{secreto}</div>
        <DialogFooter>
          <Button variant="outline" onClick={copiar}>
            {copiado ? <Check /> : <Copy />}
            {copiado ? 'Copiado' : 'Copiar'}
          </Button>
          <Button onClick={() => onOpenChange(false)}>Ya lo guardé</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
