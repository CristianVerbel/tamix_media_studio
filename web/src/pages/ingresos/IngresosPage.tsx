import * as React from 'react';
import { CreditCard, ExternalLink, Loader2, Lock, Save } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/PageHeader';
import { CargandoBloque, ErrorBloque, VacioBloque } from '@/components/StateViews';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { useApiResource } from '@/hooks/useApiResource';
import { useGestion } from '@/hooks/useGestion';
import { ApiError } from '@/lib/apiError';
import { formatCop, formatFecha } from '@/lib/format';
import { alcanza, mensajeFaltaRol } from '@/lib/roles';
import { tamixApi } from '@/lib/tamixApi';

export function IngresosPage() {
  const { handleActivo } = useAuth();
  const gestion = useGestion(handleActivo);
  const esPropietario = alcanza(gestion.data?.tuRol, 'propietario');

  const caja = useApiResource(() => {
    if (!handleActivo || !esPropietario) return Promise.reject(new Error('Sin acceso'));
    return tamixApi.caja(handleActivo);
  }, [handleActivo, esPropietario]);

  const cobros = useApiResource(() => {
    if (!handleActivo || !esPropietario) return Promise.reject(new Error('Sin acceso'));
    return tamixApi.cobros(handleActivo);
  }, [handleActivo, esPropietario]);

  const [precio, setPrecio] = React.useState('');
  const [guardandoPrecio, setGuardandoPrecio] = React.useState(false);
  const [conectando, setConectando] = React.useState(false);

  React.useEffect(() => {
    if (caja.data) setPrecio(caja.data.monthlyPriceCop != null ? String(caja.data.monthlyPriceCop) : '');
  }, [caja.data]);

  async function guardarPrecio(e: React.FormEvent) {
    e.preventDefault();
    if (!handleActivo) return;
    setGuardandoPrecio(true);
    try {
      const valor = precio.trim() === '' ? null : Number(precio);
      await tamixApi.fijarPrecio(handleActivo, valor);
      toast.success('Precio actualizado');
      caja.reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo guardar el precio');
    } finally {
      setGuardandoPrecio(false);
    }
  }

  async function conectarPasarela() {
    if (!handleActivo) return;
    setConectando(true);
    try {
      const { url } = await tamixApi.conectarCobros(handleActivo);
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo iniciar la conexión');
      setConectando(false);
    }
  }

  if (gestion.loading) {
    return (
      <div>
        <PageHeader eyebrow="Caja" title="Ingresos" />
        <CargandoBloque filas={3} />
      </div>
    );
  }

  if (!esPropietario) {
    return (
      <div>
        <PageHeader eyebrow="Caja" title="Ingresos" />
        <VacioBloque icono={<Lock className="size-5" />} titulo="Sólo para el propietario" descripcion={mensajeFaltaRol('propietario')} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader eyebrow="Caja" title="Ingresos" description="Lo cobrado, lo pendiente y el precio de suscripción de esta cuenta." />

      {caja.loading ? (
        <CargandoBloque filas={3} />
      ) : caja.error ? (
        <ErrorBloque error={caja.error} onRetry={caja.reload} />
      ) : caja.data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Cobrado este período</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{formatCop(caja.data.cobrado.total)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Tu parte</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{formatCop(caja.data.cobrado.creador)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Pendiente</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{formatCop(caja.data.pendiente.total)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Suscripciones activas</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{caja.data.suscripcionesActivas}</CardContent>
          </Card>
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pasarela de pago</CardTitle>
          </CardHeader>
          <CardContent>
            {cobros.loading ? (
              <CargandoBloque filas={2} />
            ) : cobros.error ? (
              <ErrorBloque error={cobros.error} onRetry={cobros.reload} />
            ) : cobros.data ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant={cobros.data.conectada ? 'default' : 'outline'}>{cobros.data.conectada ? 'Conectada' : 'No conectada'}</Badge>
                  {cobros.data.cobraYa && <Badge variant="secondary">Cobrando</Badge>}
                </div>
                {cobros.data.pendiente.length > 0 && (
                  <div className="rounded-lg border border-[var(--tmx-warning)]/40 bg-[color-mix(in_srgb,var(--tmx-warning)_8%,transparent)] p-3 text-sm">
                    <p className="font-medium">Pasos pendientes</p>
                    <ul className="mt-1 list-inside list-disc text-muted-foreground">
                      {cobros.data.pendiente.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <Button onClick={conectarPasarela} disabled={conectando}>
                  {conectando ? <Loader2 className="animate-spin" /> : <CreditCard />}
                  {cobros.data.conectada ? 'Revisar en Stripe' : 'Conectar pasarela'}
                  <ExternalLink className="size-3.5" />
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Precio de suscripción mensual</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={guardarPrecio} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="precio">Precio (COP), vacío para desactivar</Label>
                <Input id="precio" type="number" min={0} step={1000} value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="Ej. 25000" />
              </div>
              <Button type="submit" disabled={guardandoPrecio}>
                {guardandoPrecio ? <Loader2 className="animate-spin" /> : <Save />}
                Guardar precio
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {caja.data && (
        <p className="mt-6 text-xs text-muted-foreground">Último corte pendiente calculado a hoy, {formatFecha(new Date().toISOString())}.</p>
      )}
    </div>
  );
}
