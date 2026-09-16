import { BadgeCheck, ChevronsUpDown } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/context/AuthContext';
import { etiquetaRol } from '@/lib/roles';

function inicialesDe(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function AccountSwitcher() {
  const { cuentas, cuentaActiva, setHandleActivo } = useAuth();

  if (cuentas.length === 0) return null;

  const nombre = (cuentaActiva?.name as string | undefined) ?? cuentaActiva?.handle ?? 'Cuenta';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
        >
          <Avatar size="sm">
            <AvatarImage src={cuentaActiva?.avatarUrl as string | undefined} alt="" />
            <AvatarFallback>{inicialesDe(nombre)}</AvatarFallback>
          </Avatar>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="flex items-center gap-1 truncate font-semibold">
              {nombre}
              {cuentaActiva?.verified ? <BadgeCheck className="size-3.5 shrink-0 text-primary" aria-label="Verificado" /> : null}
            </span>
            <span className="truncate text-xs text-muted-foreground">{etiquetaRol(cuentaActiva?.rol)}</span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Cambiar de cuenta</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {cuentas.map((cuenta) => (
          <DropdownMenuItem key={cuenta.handle} onSelect={() => setHandleActivo(cuenta.handle)} className="gap-2">
            <Avatar size="sm">
              <AvatarImage src={cuenta.avatarUrl as string | undefined} alt="" />
              <AvatarFallback>{inicialesDe((cuenta.name as string | undefined) ?? cuenta.handle)}</AvatarFallback>
            </Avatar>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate">{(cuenta.name as string | undefined) ?? cuenta.handle}</span>
              <span className="truncate text-xs text-muted-foreground">
                @{cuenta.handle} · {etiquetaRol(cuenta.rol)}
              </span>
            </span>
            {cuenta.handle === cuentaActiva?.handle && <BadgeCheck className="size-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
