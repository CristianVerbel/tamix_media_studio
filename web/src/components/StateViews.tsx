import { AlertTriangle, Inbox, Lock, RefreshCw } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/apiError';

export function CargandoBloque({ filas = 3 }: { filas?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      {Array.from({ length: filas }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

export function ErrorBloque({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  const esPermiso = error instanceof ApiError && error.esPermisoDenegado;

  return (
    <Alert variant={esPermiso ? 'default' : 'destructive'} role="alert">
      {esPermiso ? <Lock /> : <AlertTriangle />}
      <AlertTitle>{esPermiso ? 'Sin permiso' : 'Algo falló'}</AlertTitle>
      <AlertDescription>
        <p>{error.message}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
            <RefreshCw /> Reintentar
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

export function VacioBloque({
  titulo,
  descripcion,
  accion,
  icono,
}: {
  titulo: string;
  descripcion: string;
  accion?: React.ReactNode;
  icono?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-6 py-14 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icono ?? <Inbox className="size-5" />}
      </div>
      <div className="space-y-1">
        <p className="font-semibold">{titulo}</p>
        <p className="max-w-md text-sm text-muted-foreground">{descripcion}</p>
      </div>
      {accion}
    </div>
  );
}
