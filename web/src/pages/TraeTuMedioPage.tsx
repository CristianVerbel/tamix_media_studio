import { ArrowRight, Rss, ShieldCheck, Webhook } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';

/**
 * A dónde manda «Entrar y conectar mi contenido».
 *
 * `/panel/integraciones?conectar=1` es la misma pantalla de Integraciones
 * de siempre, con el diálogo de «Conectar» ya abierto — ver el `useEffect`
 * al principio de `IntegracionesPage`. No hay una segunda implementación
 * del alta ni de la conexión de RSS: esta página sólo es la puerta.
 */
const DESTINO = '/panel/integraciones?conectar=1';

/**
 * Los dos caminos reales para traer contenido, tal como los describe
 * `docs/aliados.md` de Tamix-social-media: uno se monta en minutos sin
 * tocar código, el otro llega al instante porque el CMS avisa al publicar.
 * No hay un tercero que copie suscriptores ni migre el archivo entero de
 * otra plataforma — eso no existe todavía, y esta página no lo promete.
 */
const CAMINOS = [
  {
    icon: Rss,
    titulo: 'Fuente RSS',
    texto:
      'Pega la dirección de tu canal RSS o Atom. Cada pieza nueva entra sola, bajo tu firma, con titular, resumen, imagen y el enlace de vuelta a tu sitio.',
    tiempo: 'Minutos, sin tocar código',
  },
  {
    icon: Webhook,
    titulo: 'Empuje firmado',
    texto:
      'Tu CMS avisa a Tamix al publicar y la pieza entera está aquí en segundos, no cuando el RSS vuelva a leerse.',
    tiempo: 'Instantáneo, con una llave desde el CMS',
  },
];

const PASOS = [
  { numero: '1', texto: 'Entra con el correo de tu cuenta Tamix — el mismo código de siempre.' },
  { numero: '2', texto: 'Ve a Integraciones y pulsa «Conectar».' },
  { numero: '3', texto: 'Pega tu RSS o activa el empuje firmado desde tu CMS.' },
  { numero: '4', texto: 'Tus piezas entran solas. El cuerpo se sigue leyendo en tu sitio; aquí sólo llega la ficha y el enlace.' },
];

export function TraeTuMedioPage() {
  const { autenticado } = useAuth();
  const navigate = useNavigate();

  function empezar() {
    if (autenticado) {
      navigate(DESTINO);
      return;
    }
    navigate('/entrar', { state: { desde: DESTINO } });
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky inset-x-0 top-0 z-50 flex h-[var(--tmx-header-h)] items-center justify-between gap-3 border-b border-[var(--tmx-line)] bg-[color-mix(in_srgb,var(--tmx-surface)_92%,transparent)] px-4 backdrop-blur-lg sm:px-8">
        <Link to="/" className="tmx-brand min-w-0">
          <span
            aria-hidden="true"
            className="tmx-brand__mark shrink-0 rounded-2xl"
            style={{ background: 'var(--tmx-brand-gradient)' }}
          />
          <span className="tmx-brand__word truncate whitespace-nowrap">
            Tamix <span className="tmx-brand-text">Media Studio</span>
          </span>
        </Link>
        <Button onClick={empezar} size="sm">
          {autenticado ? 'Ir a Integraciones' : 'Entrar'}
        </Button>
      </header>

      <main>
        <section className="relative overflow-hidden px-4 pt-16 pb-16 sm:pt-24 sm:pb-20">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-[-12rem] -z-10 mx-auto h-[30rem] w-[60rem] max-w-none rounded-full opacity-[0.16] blur-3xl"
            style={{ background: 'var(--tmx-brand-gradient)' }}
          />
          <div className="tmx-shell flex flex-col items-center gap-6 text-center">
            <span className="tmx-article__eyebrow">Trae tu medio</span>
            <h1 className="max-w-3xl font-[var(--tmx-font-editorial)] text-[clamp(2.1rem,5.5vw,3.5rem)] leading-[1.1] font-semibold tracking-tight">
              Sigues publicando donde publicas.
              <br />
              Tus piezas entran <span className="tmx-brand-text">solas</span>.
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              No copiamos tu sitio ni te pedimos que publiques dos veces. Conectas tu RSS o tu CMS
              una vez, y a partir de ahí cada pieza llega a Tamix bajo tu firma, con el enlace de
              vuelta a tu casa.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <Button size="lg" onClick={empezar}>
                {autenticado ? 'Ir a conectar mi contenido' : 'Entrar y conectar mi contenido'}
                <ArrowRight />
              </Button>
            </div>
          </div>
        </section>

        <section className="border-t border-border px-4 py-16 sm:py-20">
          <div className="tmx-shell">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Dos caminos, y no compiten</h2>
              <p className="mt-3 text-muted-foreground">
                Uno se monta en minutos; el otro llega al instante. Muchos medios empiezan por el
                primero y suman el segundo cuando ven que les compensa.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {CAMINOS.map(({ icon: Icon, titulo, texto, tiempo }) => (
                <Card key={titulo} className="border-border">
                  <CardContent className="flex flex-col gap-3">
                    <span
                      aria-hidden="true"
                      className="inline-flex size-10 items-center justify-center rounded-xl"
                      style={{ background: 'var(--tmx-brand-gradient)' }}
                    >
                      <Icon className="size-5 text-white" />
                    </span>
                    <h3 className="font-semibold">{titulo}</h3>
                    <p className="text-sm text-muted-foreground">{texto}</p>
                    <p className="text-xs font-medium text-[var(--tmx-violet)]">{tiempo}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border px-4 py-16 sm:py-20">
          <div className="tmx-shell">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Cómo se conecta</h2>
            </div>
            <ol className="mx-auto mt-10 grid max-w-3xl gap-6 sm:grid-cols-2">
              {PASOS.map(({ numero, texto }) => (
                <li key={numero} className="flex gap-4 rounded-[var(--tmx-radius-lg)] border border-border bg-card p-5">
                  <span
                    aria-hidden="true"
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ background: 'var(--tmx-brand-gradient)' }}
                  >
                    {numero}
                  </span>
                  <p className="text-sm text-muted-foreground">{texto}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/*
         * Sin esto, esta página promete lo que `Shell.tsx` —«Todavía no
         * gestionas ningún medio en Tamix»— desmiente en cuanto alguien
         * entra. Es la misma verdad que ya dice la portada del Studio; aquí
         * sólo se repite donde toca decidir si vale la pena entrar.
         */}
        <section className="border-t border-border px-4 py-16 sm:py-20">
          <div className="tmx-shell flex flex-col items-center gap-4 text-center">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5 text-[var(--tmx-violet)]" aria-hidden="true" />
              Hace falta una cuenta verificada en Tamix
            </p>
            <p className="max-w-lg text-sm text-muted-foreground">
              Si tu publicación ya tiene cuenta verificada, conectar tu contenido toma minutos. Si
              todavía no, un administrador de Tamix tiene que darte de alta como propietario o
              invitarte a un equipo primero — entra igual con tu correo y te lo dice esta misma
              pantalla.
            </p>
            <Button size="lg" onClick={empezar}>
              {autenticado ? 'Ir a conectar mi contenido' : 'Entrar y conectar mi contenido'}
              <ArrowRight />
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-4 py-10">
        <div className="tmx-shell flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            ← Volver a Tamix Media Studio
          </Link>
          <a href="https://tamix.app" className="hover:text-foreground">
            tamix.app
          </a>
        </div>
      </footer>
    </div>
  );
}
