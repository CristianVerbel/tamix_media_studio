# Backlog de implementación

Cada punto dice si está **construido** (código real, con pruebas donde hay
regla que probar, `typecheck`/`test`/`build` en verde) o **backlog**. No
hay un estado intermedio de «pantalla sin conectar»: eso no cuenta como
avance, ni aquí ni en Tamix.

## P0 — Fundamentos — construido

1. Infraestructura independiente: `studio-infra/` (SST, tabla propia,
   dominio propio, sin tocar el stack `acento-social`).
2. Sesión reutilizada de Tamix (`POST /auth/start` / `/verify` / `/refresh`),
   sin Cognito propio.
3. Autorización en vivo contra `/publicaciones/:handle/gestion`, con la
   escala de papeles real de Tamix.
4. `services/studio-api`: `lib/ddb.ts`, `lib/keys.ts`, `lib/auth.ts`,
   `lib/tamix.ts` — el cliente hacia la red, con pruebas de dominio.

Salida conseguida: un usuario entra con su cuenta de Tamix y el Studio sabe
qué cuentas gestiona y con qué papel, sin tabla propia de usuarios.

## P0 — Contenido y planificador — construido lo que es nuevo; el resto se reutiliza

1. Crear, editar, archivar, corregir y borrar contenido: **no se reconstruyó**
   — son llamadas directas a los endpoints ya existentes de Tamix.
2. Cola de programación durable (`services/studio-api/src/routes/planificador.ts`
   + `domain/planificador.ts`, con pruebas), con EventBridge Scheduler de un
   solo tiro por elemento — no un cron, no un `setTimeout`.
3. Publicación automática cacheada (`routes/automatizacion.ts`) para que el
   trabajador del planificador pueda publicar sin que nadie tenga sesión
   abierta.
4. Trabajador del planificador (`workers/publicar-programado.ts`), con
   reintentos escalonados y auditoría de cada intento.

Backlog dentro de este épico:

- Vistas de calendario día/semana/mes en `web/` más allá de la lista simple
  con la que se entrega este corte.
- Versionado de contenido con motivo de cambio explícito (Tamix ya marca
  `editadoEn`, pero no guarda el histórico de versiones completo).
- Flujo de aprobación editorial (`draft → in_review → approved`) como estado
  intermedio: hoy Tamix sólo distingue borrador de publicado. Añadirlo
  exigiría una decisión conjunta con Tamix sobre dónde vive ese estado —no
  se inventó una tabla de «revisiones» propia del Studio para no crear una
  fuente de verdad paralela sobre el mismo contenido.

## P0 — Integraciones — construido lo mínimo; ingestión automática en backlog

1. Construido: API keys/llaves — reutilizada la de Tamix, no una nueva.
2. Construido: webhooks salientes firmados, con reparto de verdad
   (`lib/despacho.ts`) en los tres eventos del planificador —
   `planificador.programado`, `.publicado`, `.fallido` — cada intento
   firmado y registrado en `ENTREGAS#<integracionId>`, con pruebas de la
   firma. Backlog: la escalera de reintentos (`REINTENTOS_MINUTOS` existe
   en `domain/planificador.ts` y ya la usa el planificador para sus propios
   reintentos, pero un webhook que falla hoy se registra `fallido` y no se
   reintenta solo todavía) y los dos eventos de `integracion.sync.*`, que
   dependen del worker de RSS del punto siguiente.
3. Construido: alta de una fuente RSS (`POST /integraciones/:handle` con
   `tipo: 'rss'`), validada.
4. Backlog: el **worker que de verdad lee el RSS** en un horario y propone
   contenido (o lo publica a través del webhook de automatización). Hoy la
   fuente se guarda y se puede activar/desactivar, pero no hay todavía un
   `sst.aws.Cron` que la recorra — es el siguiente paso natural de
   `studio-infra/sst.config.ts`.
5. Backlog: adapter de WordPress.
6. Backlog: verificación de dominio propio del Studio — Tamix ya verifica
   dominios de aliados por su cuenta (`/publicaciones/:handle/dominios`); no
   se duplicó esa función.

## P1 — Comunidad — backlog completo

Tamix no expone hoy una lectura agregada de comentarios/menciones/reportes
para quien administra una cuenta — cada autor los ve pieza por pieza dentro
de la app. Antes de construir la bandeja del Studio hace falta ese endpoint
en `services/social-api`, que es trabajo del otro repositorio. La pantalla
del Studio existe como fachada honesta, sin datos simulados.

## P1 — Métricas — parcial

Construido: desempeño por pieza (`GET /piezas/:tipo/:id/como-va`, ya
existía en Tamix) enlazado desde Contenido; contadores agregados de la
cuenta (seguidores, piezas) desde `GET /publications/:handle`.

Backlog: alcance, impresiones, inicio y finalización de lectura, atención
activa, comparaciones por periodo, exportación CSV — toda la taxonomía de
`docs/PRODUCT_SPEC.md` §6 depende de un pipeline de eventos que Tamix no
tiene todavía. Es el mayor hueco real de este primer corte y está señalado
así a propósito, no disimulado con una gráfica bonita y números inventados.

## P2 — Monetización — construido lo que ya existía; ledger propio, descartado

`caja`, `cobros` y `precio` son lecturas y escrituras directas contra Tamix,
construidas. No hay ledger, statements ni payouts propios del Studio — el
dinero no pasa por su infraestructura, así que llevar su propia contabilidad
sería, otra vez, una segunda fuente de verdad sobre el mismo dato.

## P2 — Equipo y operación — construido lo esencial

Invitar, cambiar de papel y retirar: construido, contra Tamix. Backlog:
2FA (es de la cuenta de Tamix, no del Studio, y hoy Tamix no lo ofrece al
usuario final fuera de la consola de administración), sesiones activas
listadas, centro de salud de conexiones más allá del estado simple de
automatización e integraciones.

## P3 — Escala — backlog

Rate limits por cuenta/llave, caché de dashboards, observabilidad y SLOs
propios, retención configurable. Ninguno bloquea el primer despliegue; se
anotan para cuando el volumen real lo pida.

## Regla de ejecución

Tomar un punto de este backlog, no una pantalla suelta. Si un módulo no
tiene de dónde sacar el dato real todavía, se construye su fachada honesta
—vacío, con la razón dicha— y se anota aquí como backlog, nunca como hecho.
