import { Inbox } from 'lucide-react';

import { PageHeader } from '@/components/PageHeader';
import { VacioBloque } from '@/components/StateViews';

export function ComunidadPage() {
  return (
    <div>
      <PageHeader eyebrow="Bandeja unificada" title="Comunidad" description="Comentarios, menciones y reportes en un solo lugar." />
      <VacioBloque
        icono={<Inbox className="size-5" />}
        titulo="La bandeja unificada está en el roadmap"
        descripcion="Tamix todavía no expone una lectura agregada de comentarios, menciones y reportes para quien administra una cuenta — hoy cada autor los ve pieza por pieza dentro de la app. En cuanto ese endpoint exista en Tamix, esta pantalla se conecta a datos reales; hasta entonces no muestra conversaciones simuladas."
      />
    </div>
  );
}
