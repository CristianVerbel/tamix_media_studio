import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { Desglose } from '@/types/tamix';

/**
 * Un desglose de audiencia —país, aparato, edad, género, hora— en barras.
 *
 * `suficiente` en `false` no esconde la tarjeta: la enseña con un aviso al
 * pie. Es el mismo criterio que ya usa `tasaDeLectura` en
 * `MetricaDetallePage`: un porcentaje con poca gente detrás es ruido, no un
 * hallazgo, y esconderlo se lee como un fallo del panel en vez de decir la
 * verdad.
 */
export function DesgloseCard({
  titulo,
  desglose,
  etiquetaDe,
  icono,
}: {
  titulo: string;
  desglose: Desglose | undefined;
  etiquetaDe: (clave: string) => string;
  icono?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
          {icono} {titulo}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!desglose || desglose.total === 0 ? (
          <p className="text-sm text-muted-foreground">Sin datos todavía.</p>
        ) : (
          <div className="space-y-2.5">
            {desglose.valores.slice(0, 6).map((v) => (
              <div key={v.clave} className="flex items-center gap-3 text-sm">
                <span className="w-24 shrink-0 truncate">{etiquetaDe(v.clave)}</span>
                <Progress value={Math.round(v.porcentaje * 100)} className="h-1.5" />
                <span className="w-10 shrink-0 text-right tabular-nums text-muted-foreground">
                  {Math.round(v.porcentaje * 100)}%
                </span>
              </div>
            ))}
            {!desglose.suficiente && (
              <p className="pt-1 text-xs text-muted-foreground">
                Aún no hay suficientes datos — van {desglose.total.toLocaleString('es-CO')}.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
