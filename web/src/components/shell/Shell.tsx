import * as React from 'react';
import { ExternalLink, LogOut, Menu, Moon, Sun, Users } from 'lucide-react';
import { Outlet, useNavigate } from 'react-router-dom';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Toaster } from '@/components/ui/sonner';
import { CargandoBloque, VacioBloque } from '@/components/StateViews';
import { useAuth } from '@/context/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTheme } from '@/hooks/useTheme';

import { AccountSwitcher } from './AccountSwitcher';
import { BrandMark } from './BrandMark';
import { SidebarNav } from './SidebarNav';

function SinMedioGestionado({ onLogout }: { onLogout: () => void }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-4">
        <VacioBloque
          icono={<Users className="size-5" />}
          titulo="Todavía no gestionas ningún medio en Tamix"
          descripcion="Un administrador de Tamix tiene que darte de alta como propietario o invitarte a un equipo primero."
        />
        <div className="flex justify-center">
          <Button variant="outline" onClick={onLogout}>
            <LogOut /> Cerrar sesión
          </Button>
        </div>
      </div>
    </main>
  );
}

export function Shell() {
  const { viewer, cerrarSesion, cuentas, cargandoCuentas, errorCuentas } = useAuth();
  const [theme, toggleTheme] = useTheme();
  const isMobile = useIsMobile();
  const [sheetAbierto, setSheetAbierto] = React.useState(false);
  const navigate = useNavigate();

  const nombreViewer = (viewer?.name as string | undefined) ?? (viewer?.handle as string | undefined) ?? 'Tu cuenta';

  function salir() {
    cerrarSesion();
    navigate('/entrar', { replace: true });
  }

  if (cargandoCuentas) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <div className="w-full max-w-md">
          <CargandoBloque filas={4} />
        </div>
      </div>
    );
  }

  if (errorCuentas) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <div className="w-full max-w-md space-y-4 text-center">
          <p className="text-sm text-destructive">{errorCuentas.message}</p>
          <Button variant="outline" onClick={salir}>
            <LogOut /> Cerrar sesión
          </Button>
        </div>
      </div>
    );
  }

  const noManejaMedio = cuentas.length === 0 || cuentas.every((c) => c.esPropia);
  if (noManejaMedio) return <SinMedioGestionado onLogout={salir} />;

  const contenidoSidebar = (
    <>
      <div className="px-1 pb-2">
        <BrandMark />
      </div>
      <AccountSwitcher />
      <SidebarNav onNavigate={() => setSheetAbierto(false)} />
    </>
  );

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      {!isMobile && (
        <aside className="sticky top-0 flex h-dvh w-64 shrink-0 flex-col gap-3 border-r border-border bg-card p-4">
          {contenidoSidebar}
        </aside>
      )}

      {isMobile && (
        <Sheet open={sheetAbierto} onOpenChange={setSheetAbierto}>
          <SheetContent side="left" className="w-72 p-4">
            <SheetHeader className="sr-only">
              <SheetTitle>Navegación</SheetTitle>
            </SheetHeader>
            <div className="flex h-full flex-col gap-3">{contenidoSidebar}</div>
          </SheetContent>
        </Sheet>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur">
          {isMobile && (
            <Button variant="ghost" size="icon" aria-label="Abrir navegación" onClick={() => setSheetAbierto(true)}>
              <Menu />
            </Button>
          )}
          {isMobile && <BrandMark compact />}
          <div className="flex-1" />
          <Button variant="ghost" size="icon" aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'} onClick={toggleTheme}>
            {theme === 'dark' ? <Sun /> : <Moon />}
          </Button>
          <a
            href="https://tamix.app"
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:flex"
          >
            <ExternalLink className="size-4" /> Ir a Tamix
          </a>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="Menú de la cuenta" className="rounded-full">
                <Avatar>
                  <AvatarImage src={viewer?.avatarUrl as string | undefined} alt="" />
                  <AvatarFallback>{nombreViewer.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="px-2 py-1.5 text-sm">
                <p className="font-semibold">{nombreViewer}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={salir} variant="destructive">
                <LogOut /> Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
      <Toaster position="top-right" />
    </div>
  );
}
