import {
  ArrowRight,
  AudioLines,
  BarChart3,
  CalendarClock,
  History,
  Plug,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';

const CAPACIDADES = [
  {
    icon: CalendarClock,
    titulo: 'Planificador',
    texto:
      'Programa artículos, audio, video, directos y apuntes a la hora exacta. Un EventBridge de un solo tiro dispara la publicación aunque nadie tenga la sesión abierta.',
  },
  {
    icon: Users,
    titulo: 'Equipo',
    texto:
      'Invita, cambia de papel y retira gente con la misma escala de Tamix: analista, redactor, editor, propietario. No hay una segunda tabla de permisos que mantener.',
  },
  {
    icon: Wallet,
    titulo: 'Ingresos',
    texto:
      'Cobrado, pendiente, suscripciones activas y el alta de cobro por Stripe Connect — todo leído en vivo de tu caja en Tamix. El dinero nunca pasa por nuestra infraestructura.',
  },
  {
    icon: Plug,
    titulo: 'Integraciones',
    texto:
      'Conecta una fuente RSS para proponer contenido y webhooks salientes firmados que avisan cuando algo se programó, se publicó o falló.',
  },
  {
    icon: BarChart3,
    titulo: 'Métricas por pieza',
    texto:
      'Me gusta, comentarios, republicaciones y tasa de lectura de cada pieza, con aviso explícito de lo que ese formato todavía no puede medir.',
  },
  {
    icon: History,
    titulo: 'Auditoría',
    texto:
      'Cada acción del equipo y cada intento de publicación automática, registrado — para saber qué pasó y quién lo hizo, no para adivinarlo.',
  },
];

const PASOS = [
  {
    numero: '1',
    titulo: 'Tu cuenta ya existe en Tamix',
    texto:
      'El Studio no da de alta medios: eso lo hace la redacción de Tamix. Si tu publicación ya está verificada allí, no hay nada que crear de nuevo aquí.',
  },
  {
    numero: '2',
    titulo: 'Entra con el mismo correo',
    texto:
      'Un código de 6 dígitos al correo de tu cuenta Tamix — la misma sesión que usa la app y la web. Sin contraseña nueva, sin usuario nuevo que recordar.',
  },
  {
    numero: '3',
    titulo: 'Elige la cuenta que gestionas',
    texto:
      'Si administras más de una publicación, el Studio te muestra todas las que ya tienes asignadas en Tamix y te deja moverte entre ellas.',
  },
  {
    numero: '4',
    titulo: 'Tu papel decide qué puedes tocar',
    texto:
      'Analista, redactor, editor o propietario: el mismo papel que ya tienes en Tamix, comprobado en cada llamada — nunca un botón oculto haciendo esa función solo.',
  },
];

export function LandingPage() {
  const { autenticado } = useAuth();
  const ctaHref = autenticado ? '/panel' : '/entrar';
  const ctaTexto = autenticado ? 'Ir a tu panel' : 'Entrar con tu cuenta Tamix';

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
        <Button asChild variant="ghost" size="sm" className="shrink-0">
          <Link to={ctaHref}>{autenticado ? 'Tu panel' : 'Entrar'}</Link>
        </Button>
      </header>

      <main>
        <section className="px-4 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div className="tmx-shell flex flex-col items-center gap-6 text-center">
            <span className="tmx-article__eyebrow">Para medios, autores institucionales y marcas aliadas</span>
            <h1 className="max-w-3xl font-[var(--tmx-font-editorial)] text-[clamp(2.25rem,6vw,4rem)] leading-[1.08] font-semibold tracking-tight">
              La redacción tiene un panel. <span className="tmx-brand-text">Tamix</span> sigue siendo la fuente.
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Programa, publica, gestiona el equipo, cobra y mide — todo contra los datos reales de tu cuenta en Tamix,
              en vivo, nunca una copia. Si Tamix no responde, el Studio lo dice; no inventa un número.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to={ctaHref}>
                  {ctaTexto}
                  <ArrowRight />
                </Link>
              </Button>
              <a href="#capacidades" className="text-sm font-medium text-muted-foreground underline-offset-4 hover:underline">
                Ver qué incluye
              </a>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5 text-[var(--tmx-violet)]" aria-hidden="true" />
              Misma cuenta, mismo inicio de sesión con código al correo — sin contraseña nueva.
            </p>
          </div>
        </section>

        <section id="capacidades" className="border-t border-border px-4 py-16 sm:py-24">
          <div className="tmx-shell">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Todo lo que ya haces, en un solo panel</h2>
              <p className="mt-3 text-muted-foreground">
                No es una copia de Tamix con otro nombre. Es la operación de una redacción — pensada para un equipo, no
                para una persona sola con el móvil.
              </p>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {CAPACIDADES.map(({ icon: Icon, titulo, texto }) => (
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
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border px-4 py-16 sm:py-24">
          <div className="tmx-shell">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Cómo entra tu medio</h2>
              <p className="mt-3 text-muted-foreground">Cuatro pasos, y ninguno es crear una cuenta nueva.</p>
            </div>
            <ol className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
              {PASOS.map(({ numero, titulo, texto }) => (
                <li key={numero} className="flex gap-4 rounded-[var(--tmx-radius-lg)] border border-border bg-card p-5">
                  <span
                    aria-hidden="true"
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ background: 'var(--tmx-brand-gradient)' }}
                  >
                    {numero}
                  </span>
                  <div>
                    <h3 className="font-semibold">{titulo}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{texto}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-border px-4 py-16 sm:py-24">
          <div className="tmx-shell">
            <div className="tmx-card tmx-card--dark mx-auto max-w-3xl p-8 sm:p-12">
              <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-[var(--tmx-coral)] uppercase">
                <Sparkles className="size-3.5" aria-hidden="true" />
                Lo que no hacemos
              </span>
              <p className="mt-4 font-[var(--tmx-font-editorial)] text-2xl leading-snug sm:text-3xl">
                No duplicamos tu identidad, tu contenido ni tu dinero. No inventamos una métrica que Tamix todavía no
                calcula. Y nuestra infraestructura es propia, aparte, para que un pico de tráfico en el panel no le
                cueste rendimiento a la red social.
              </p>
              <p className="mt-6 flex items-center gap-2 text-sm text-white/70">
                <AudioLines className="size-4" aria-hidden="true" />
                Artículo, audio, video, directo o apunte — el mismo contenido que ya publicas, con más control sobre
                cuándo sale.
              </p>
            </div>
          </div>
        </section>

        <section className="border-t border-border px-4 py-16 sm:py-24">
          <div className="tmx-shell flex flex-col items-center gap-5 text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Tu redacción ya tiene todo para empezar</h2>
            <p className="max-w-md text-muted-foreground">
              Si tu publicación ya tiene cuenta verificada en Tamix, no hay espera ni formulario: entra con ese mismo
              correo.
            </p>
            <Button asChild size="lg">
              <Link to={ctaHref}>
                {ctaTexto}
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-4 py-8">
        <div className="tmx-shell flex flex-col items-center gap-2 text-center text-xs text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
          <span>Tamix Media Studio — un panel independiente sobre los datos en vivo de Tamix.</span>
          <Link to="/entrar" className="underline-offset-4 hover:underline">
            Entrar
          </Link>
        </div>
      </footer>
    </div>
  );
}
