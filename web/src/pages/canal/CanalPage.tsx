import * as React from 'react';
import { Check, Loader2, Radio, Users, Volume2, VolumeX, X } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/PageHeader';
import { CargandoBloque, ErrorBloque, VacioBloque } from '@/components/StateViews';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { useApiResource } from '@/hooks/useApiResource';
import { ApiError } from '@/lib/apiError';
import { formatFecha, formatFechaHora } from '@/lib/format';
import { tamixApi } from '@/lib/tamixApi';
import type { MiembroDeCanal } from '@/types/tamix';

/**
 * Gestionar un canal — la comunidad con miembros, no una cuenta con equipo.
 *
 * Es otra cosa que «Comunidad» en la barra de al lado: aquella es la bandeja
 * unificada de comentarios y menciones de una cuenta, y sigue en el roadmap.
 * Esto es un canal de Tamix —como «Corre» en la app—, con su gente dentro,
 * y ya tiene endpoint real: `GET /canales/mios`, `GET /canales/:handle`,
 * `GET /canales/:handle/miembros` y las tres acciones de moderación.
 *
 * No hay `Gestion` ni `RolDeEquipo` aquí. Un canal no cuelga de una cuenta
 * con equipo: cuelga de quien está dentro, y `soyAdmin` en cada fila de
 * `/canales/mios` es la autoridad completa — la misma que ya usa la app.
 */
export function CanalPage() {
  const { viewer } = useAuth();
  const miUserId = viewer?.id as string | undefined;

  const misCanales = useApiResource(() => tamixApi.misCanales(), []);
  const administrados = React.useMemo(
    () => (misCanales.data?.grupos ?? []).filter((g) => g.soyAdmin),
    [misCanales.data]
  );

  const [handle, setHandle] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (handle && administrados.some((c) => c.handle === handle)) return;
    setHandle(administrados[0]?.handle ?? null);
  }, [administrados, handle]);

  const canalActivo = administrados.find((c) => c.handle === handle) ?? null;

  return (
    <div>
      <PageHeader
        eyebrow="Comunidades con miembros"
        title="Canal"
        description="Los canales que administras en Tamix: quién está dentro, y lo que se ha publicado."
      />

      {misCanales.loading ? (
        <CargandoBloque filas={3} />
      ) : misCanales.error ? (
        <ErrorBloque error={misCanales.error} onRetry={misCanales.reload} />
      ) : administrados.length === 0 ? (
        <VacioBloque
          icono={<Radio className="size-5" />}
          titulo="No administras ningún canal"
          descripcion="Un canal es una comunidad con miembros propia — no una cuenta con equipo. Se crea desde la app de Tamix; en cuanto administres uno, aparece aquí."
        />
      ) : (
        <div className="space-y-4">
          {administrados.length > 1 && (
            <Select value={handle ?? undefined} onValueChange={setHandle}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Elige un canal" />
              </SelectTrigger>
              <SelectContent>
                {administrados.map((c) => (
                  <SelectItem key={c.handle} value={c.handle}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {canalActivo && handle && (
            <CanalActivo key={handle} handle={handle} canal={canalActivo} miUserId={miUserId} />
          )}
        </div>
      )}
    </div>
  );
}

function CanalActivo({
  handle,
  canal,
  miUserId,
}: {
  handle: string;
  canal: { name: string; acceso: 'abierto' | 'aprobacion'; miembros: number; piezas: number };
  miUserId: string | undefined;
}) {
  const miembros = useApiResource(() => tamixApi.miembrosDeCanal(handle), [handle]);
  const piezas = useApiResource(() => tamixApi.piezasDeCanal(handle, 'nuevo'), [handle]);
  const [ocupado, setOcupado] = React.useState<string | null>(null);

  const resumen = `${canal.miembros === 1 ? '1 miembro' : `${canal.miembros} miembros`} · ${
    canal.piezas === 1 ? '1 pieza' : `${canal.piezas} piezas`
  } · ${canal.acceso === 'aprobacion' ? 'con aprobación' : 'abierto'}`;

  async function aprobar(userId: string) {
    setOcupado(userId);
    try {
      await tamixApi.aprobarEnCanal(handle, userId);
      toast.success('Persona aprobada');
      miembros.reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo aprobar');
    } finally {
      setOcupado(null);
    }
  }

  async function expulsar(userId: string, esUnoMismo: boolean) {
    if (!window.confirm(esUnoMismo ? '¿Salir de este canal?' : '¿Sacar a esta persona del canal?')) return;
    setOcupado(userId);
    try {
      await tamixApi.expulsarDeCanal(handle, userId);
      toast.success('Persona fuera del canal');
      miembros.reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo completar la acción');
    } finally {
      setOcupado(null);
    }
  }

  async function darVoz(userId: string, puedeHablar: boolean) {
    setOcupado(userId);
    try {
      await tamixApi.darVozEnCanal(handle, userId, puedeHablar);
      toast.success(puedeHablar ? 'Voz devuelta' : 'Persona silenciada');
      miembros.reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo cambiar');
    } finally {
      setOcupado(null);
    }
  }

  const pendientes = (miembros.data?.miembros ?? []).filter((m) => m.rol === 'pendiente');
  const dentro = (miembros.data?.miembros ?? []).filter((m) => m.rol !== 'pendiente');

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{canal.name}</h2>
        <p className="text-sm text-muted-foreground">{resumen}</p>
      </div>

      <Tabs defaultValue="miembros">
      <TabsList>
        <TabsTrigger value="miembros">Miembros</TabsTrigger>
        <TabsTrigger value="piezas">Piezas</TabsTrigger>
      </TabsList>

      <TabsContent value="miembros" className="space-y-4">
        {pendientes.length > 0 && (
          <div className="rounded-xl border border-border">
            <div className="border-b border-border px-4 py-2 text-xs font-bold tracking-widest text-muted-foreground uppercase">
              Esperando aprobación · {pendientes.length}
            </div>
            <Table>
              <TableBody>
                {pendientes.map((m) => (
                  <FilaDeMiembro
                    key={m.userId}
                    miembro={m}
                    esUnoMismo={m.userId === miUserId}
                    ocupado={ocupado === m.userId}
                    accionesExtra={
                      <Button
                        size="icon-sm"
                        variant="outline"
                        aria-label="Aprobar"
                        disabled={ocupado === m.userId}
                        onClick={() => aprobar(m.userId)}
                      >
                        <Check />
                      </Button>
                    }
                    onExpulsar={() => expulsar(m.userId, false)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {miembros.loading ? (
          <CargandoBloque filas={4} />
        ) : miembros.error ? (
          <ErrorBloque error={miembros.error} onRetry={miembros.reload} />
        ) : dentro.length === 0 ? (
          <VacioBloque icono={<Users className="size-5" />} titulo="Nadie dentro todavía" descripcion="En cuanto alguien se una a este canal, aparece aquí." />
        ) : (
          <div className="rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Persona</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {dentro.map((m) => {
                  const esUnoMismo = m.userId === miUserId;
                  // Las mismas reglas que Tamix aplica de verdad —nunca a otro
                  // administrador, nunca al fundador—: ocultar el botón no
                  // sustituye esa comprobación, pero evita un 403 previsible.
                  const sePuedeModerar = !m.esFundador && m.rol !== 'admin' && !esUnoMismo;
                  return (
                    <FilaDeMiembro
                      key={m.userId}
                      miembro={m}
                      esUnoMismo={esUnoMismo}
                      ocupado={ocupado === m.userId}
                      accionesExtra={
                        sePuedeModerar ? (
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={m.silenciado ? 'Devolver la voz' : 'Silenciar'}
                            disabled={ocupado === m.userId}
                            onClick={() => darVoz(m.userId, Boolean(m.silenciado))}
                          >
                            {m.silenciado ? <Volume2 /> : <VolumeX />}
                          </Button>
                        ) : null
                      }
                      onExpulsar={sePuedeModerar ? () => expulsar(m.userId, false) : undefined}
                    />
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>

      <TabsContent value="piezas">
        {piezas.loading ? (
          <CargandoBloque filas={4} />
        ) : piezas.error ? (
          <ErrorBloque error={piezas.error} onRetry={piezas.reload} />
        ) : (piezas.data?.items.length ?? 0) === 0 ? (
          <VacioBloque icono={<Radio className="size-5" />} titulo="Sin piezas todavía" descripcion="Lo que publique la gente de este canal aparece aquí." />
        ) : (
          <div className="space-y-3">
            {piezas.data?.items.map((pieza) => (
              <div key={pieza.id} className="rounded-xl border border-border p-4">
                <div className="mb-2 flex items-center justify-between gap-2 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{pieza.author?.name ?? pieza.author?.handle ?? 'Alguien del canal'}</span>
                  <span>{formatFechaHora(pieza.createdAt)}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap text-foreground">{pieza.body}</p>
              </div>
            ))}
          </div>
        )}
      </TabsContent>
      </Tabs>
    </div>
  );
}

function FilaDeMiembro({
  miembro,
  esUnoMismo,
  ocupado,
  accionesExtra,
  onExpulsar,
}: {
  miembro: MiembroDeCanal;
  esUnoMismo: boolean;
  ocupado: boolean;
  accionesExtra?: React.ReactNode;
  onExpulsar?: () => void;
}) {
  return (
    <TableRow>
      <TableCell className="flex items-center gap-2">
        <Avatar size="sm">
          {miembro.avatarUrl && <AvatarImage src={miembro.avatarUrl} alt="" />}
          <AvatarFallback>{miembro.name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="truncate">{miembro.name}</span>
        {esUnoMismo && <Badge variant="outline">Tú</Badge>}
        {miembro.esFundador && <Badge>Fundador</Badge>}
        {miembro.silenciado && <Badge variant="secondary">Sin voz</Badge>}
      </TableCell>
      <TableCell>{ETIQUETA_ROL[miembro.rol]}</TableCell>
      <TableCell className="text-muted-foreground">{formatFecha(miembro.desde)}</TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          {accionesExtra}
          {onExpulsar && (
            <Button size="icon-sm" variant="ghost" aria-label="Sacar del canal" disabled={ocupado} onClick={onExpulsar}>
              {ocupado ? <Loader2 className="animate-spin" /> : <X />}
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

const ETIQUETA_ROL: Record<MiembroDeCanal['rol'], string> = {
  admin: 'Administra',
  miembro: 'Miembro',
  pendiente: 'Pendiente',
};
