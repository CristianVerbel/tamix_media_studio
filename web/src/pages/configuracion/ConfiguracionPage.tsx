import { ExternalLink } from 'lucide-react';

import { PageHeader } from '@/components/PageHeader';
import { CargandoBloque, ErrorBloque } from '@/components/StateViews';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { useGestion } from '@/hooks/useGestion';
import { etiquetaRol } from '@/lib/roles';

export function ConfiguracionPage() {
  const { handleActivo } = useAuth();
  const gestion = useGestion(handleActivo);

  return (
    <div>
      <PageHeader eyebrow="Cuenta" title="Configuración" description="Lo básico de esta cuenta. El nombre, el handle y la bio se editan en Tamix." />

      {gestion.loading ? (
        <CargandoBloque filas={2} />
      ) : gestion.error ? (
        <ErrorBloque error={gestion.error} onRetry={gestion.reload} />
      ) : gestion.data ? (
        <Card>
          <CardHeader>
            <CardTitle>{gestion.data.nombre}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant={gestion.data.verificada ? 'default' : 'outline'}>{gestion.data.verificada ? 'Verificada' : 'Sin verificar'}</Badge>
              <Badge variant="outline">{gestion.data.tipoDeCuenta}</Badge>
              <Badge variant="outline">Tu papel: {etiquetaRol(gestion.data.tuRol)}</Badge>
              {gestion.data.eresDueno && <Badge>Eres el dueño</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">
              Precio, equipo y el resto de la operación editorial de esta cuenta se gestionan desde sus propias páginas en el Studio (Ingresos, Equipo). El
              nombre, el @handle, la biografía y la foto de perfil se editan en Tamix.
            </p>
            <Button variant="outline" asChild>
              <a href={`https://tamix.app/ajustes`} target="_blank" rel="noreferrer">
                <ExternalLink /> Abrir ajustes en Tamix
              </a>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
