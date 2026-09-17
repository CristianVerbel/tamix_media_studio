import * as React from 'react';
import { Loader2, LogOut, Plus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/PageHeader';
import { CargandoBloque, ErrorBloque, VacioBloque } from '@/components/StateViews';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/context/AuthContext';
import { useApiResource } from '@/hooks/useApiResource';
import { useGestion } from '@/hooks/useGestion';
import { ApiError } from '@/lib/apiError';
import { formatFecha } from '@/lib/format';
import { alcanza, etiquetaRol, type Rol } from '@/lib/roles';
import { tamixApi } from '@/lib/tamixApi';

import { InvitarDialog } from './InvitarDialog';

export function EquipoPage() {
  const { handleActivo, viewer } = useAuth();
  const gestion = useGestion(handleActivo);
  const equipo = useApiResource(() => {
    if (!handleActivo) return Promise.reject(new Error('Sin cuenta activa'));
    return tamixApi.equipo(handleActivo);
  }, [handleActivo]);

  const [invitarAbierto, setInvitarAbierto] = React.useState(false);
  const [ocupado, setOcupado] = React.useState<string | null>(null);

  const esPropietario = alcanza(gestion.data?.tuRol, 'propietario');
  // Tamix exige la cuenta verificada para invitar (no para cambiar de papel
  // ni retirar a alguien): sin este segundo chequeo el botón se ve activo y
  // el POST responde 403.
  const puedeInvitar = esPropietario && Boolean(gestion.data?.verificada);
  const miUserId = viewer?.id as string | undefined;

  async function cambiarRol(userId: string, rol: Rol) {
    if (!handleActivo) return;
    setOcupado(userId);
    try {
      await tamixApi.cambiarRol(handleActivo, userId, rol);
      toast.success('Papel actualizado');
      equipo.reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo cambiar el papel');
    } finally {
      setOcupado(null);
    }
  }

  async function quitar(userId: string, esUnoMismo: boolean) {
    if (!handleActivo) return;
    if (!window.confirm(esUnoMismo ? '¿Salir de este equipo?' : '¿Quitar a esta persona del equipo?')) return;
    setOcupado(userId);
    try {
      await tamixApi.quitarDelEquipo(handleActivo, userId);
      toast.success(esUnoMismo ? 'Saliste del equipo' : 'Persona retirada');
      equipo.reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo completar la acción');
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Permisos"
        title="Equipo"
        description="Quién gestiona esta cuenta y con qué papel."
        actions={
          puedeInvitar && (
            <Button onClick={() => setInvitarAbierto(true)}>
              <Plus /> Invitar
            </Button>
          )
        }
      />

      {equipo.loading ? (
        <CargandoBloque filas={4} />
      ) : equipo.error ? (
        <ErrorBloque error={equipo.error} onRetry={equipo.reload} />
      ) : (equipo.data?.equipo.length ?? 0) === 0 ? (
        <VacioBloque icono={<Users className="size-5" />} titulo="Sin equipo todavía" descripcion="Invita a alguien para que te ayude a gestionar esta cuenta." />
      ) : (
        <div className="rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Persona</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Desde</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipo.data?.equipo.map((miembro) => {
                const esUnoMismo = miembro.userId === miUserId;
                return (
                  <TableRow key={miembro.userId}>
                    <TableCell className="flex items-center gap-2">
                      <Avatar size="sm">
                        <AvatarFallback>{miembro.userId.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="truncate">{miembro.userId}</span>
                      {esUnoMismo && <Badge variant="outline">Tú</Badge>}
                      {miembro.esDueno && <Badge>Dueño</Badge>}
                    </TableCell>
                    <TableCell>
                      {esPropietario && !miembro.esDueno ? (
                        <Select value={miembro.rol} onValueChange={(v) => cambiarRol(miembro.userId, v as Rol)}>
                          <SelectTrigger className="w-40" disabled={ocupado === miembro.userId}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(equipo.data?.roles ?? []).map((r) => (
                              <SelectItem key={r} value={r}>
                                {etiquetaRol(r)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        etiquetaRol(miembro.rol)
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatFecha(miembro.desde)}</TableCell>
                    <TableCell>
                      {(esPropietario || esUnoMismo) && !miembro.esDueno && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={esUnoMismo ? 'Salir del equipo' : 'Quitar del equipo'}
                          onClick={() => quitar(miembro.userId, esUnoMismo)}
                          disabled={ocupado === miembro.userId}
                        >
                          {ocupado === miembro.userId ? <Loader2 className="animate-spin" /> : esUnoMismo ? <LogOut /> : <Trash2 />}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {handleActivo && <InvitarDialog handle={handleActivo} open={invitarAbierto} onOpenChange={setInvitarAbierto} onInvited={equipo.reload} />}
    </div>
  );
}
