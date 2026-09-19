# Especificación funcional

Adaptado del paquete de producto original subido al repositorio, con una
diferencia de fondo: donde el original describía un backend propio
(Supabase/Postgres, integrado bajo `/panel` de la app de Tamix), aquí cada
módulo dice explícitamente **de dónde sale el dato** — de Tamix en vivo, o
de la tabla propia del Studio. Ningún módulo tiene permiso de inventar un
número que no pueda explicar su procedencia.

## 1. Cuenta activa (no «alta de medios»)

El Studio no da de alta medios: eso ya lo hace Tamix
(`services/social-api/src/routes/medios.ts`, sólo desde la redacción, y
`/publicaciones/:handle/equipo` para que el propio equipo se organice). El
Studio, al entrar, pide `GET /me/cuentas` y ofrece un selector con todas las
cuentas que la persona gestiona. Sin ninguna cuenta verificada que
gestionar, el panel lo dice y no simula un espacio de trabajo vacío con
datos de muestra.

## 2. Resumen

KPIs **de los que Tamix ya sabe responder hoy**: contenido reciente y su
estado, seguidores, próximos elementos del planificador, salud de la
automatización. No hay alcance, impresiones ni atención activa todavía —
Tamix no calcula eso hoy (ver `docs/IMPLEMENTATION_BACKLOG.md`, épico de
Métricas) y el Resumen no los inventa mientras tanto.

## 3. Contenido

Los tipos y las acciones son las de Tamix: artículo, audio, video, directo,
apunte (post corto). Crear, editar, archivar, corregir y borrar son
llamadas directas a `POST/PATCH/DELETE /posts` y `/notes` en Tamix — el
Studio no tiene su propia tabla de contenido. Programar (`draft` con fecha
futura) es lo único nuevo, y vive en el planificador del Studio: ver el
punto siguiente.

## 4. Planificador

Una capacidad propia del Studio, no un espejo de algo que ya exista en la
app. Tamix sí programa contenido —`POST /canales/:handle/programadas`—,
pero sólo dentro de un canal, con topes propios (2 minutos a 1 año vista,
50 piezas en cola) y lo que sale de esa cola siempre es una nota, nunca un
artículo; el cliente oficial ni siquiera manda fotos ahí, aunque el
servidor las acepte. No hay, en cambio, forma de programar un artículo o un
apunte suelto fuera de un canal — y eso es justamente lo que resuelve el
planificador del Studio.

El planificador guarda el elemento en la tabla del Studio con su fecha, y un
EventBridge Scheduler de un solo tiro lo dispara exactamente a esa hora
llamando al webhook de publicación automática de la cuenta en Tamix — el
mismo mecanismo que usaría el CMS de cualquier medio aliado. Reprogramar o
cancelar sólo es posible mientras el elemento siga en `programado` o
`fallido`; en cuanto entra en `publicando` ya salió hacia Tamix y no hay
vuelta atrás server-side, sólo la que ya ofrece Tamix para corregir o
retirar una pieza publicada.

## 5. Comunidad

**Sin construir todavía.** Tamix no expone hoy una bandeja de comentarios,
menciones o reportes para quien administra una cuenta — sólo el propio
autor ve y modera lo suyo pieza por pieza dentro de la app. Añadir esa
lectura agregada es trabajo nuevo en `services/social-api`, fuera del
alcance de este primer corte, y está anotado en el backlog. La pantalla
existe, en blanco, con lo que hace falta para no fingir que está terminada.

## 6. Métricas e insights

Lo real hoy: seguidores y piezas totales de la cuenta (`GET /publications/:handle`),
y el desempeño de una pieza concreta —me gusta, comentarios, republicaciones,
tasa de lectura, un aviso explícito de lo que ese tipo de pieza no puede
medir— vía `GET /piezas/:tipo/:id/como-va`. Alcance, impresiones y atención
activa por rangos y comparaciones son el épico P1 del backlog: piden una
taxonomía de eventos que Tamix todavía no tiene, y el Studio no la va a
simular con números de relleno mientras tanto.

## 7. Ingresos

Real, completo, contra Tamix: `GET /publications/:handle/caja` (cobrado,
pendiente, suscripciones activas, si la pasarela está conectada), el flujo
de alta de cobro por Stripe Connect (`/cobros`), y el precio de suscripción
(`PATCH /precio`). No hay ledger ni liquidaciones propias del Studio: el
dinero nunca pasa por su infraestructura, así que tampoco tiene por qué
llevar su contabilidad.

## 8. Integraciones

Dos cosas nuevas del Studio — fuente RSS (para proponer contenido; la
ingesta automática todavía no corre en un worker programado, ver backlog) y
webhook saliente firmado (avisa de lo que el Studio hizo: programó, publicó,
falló) — más la **automatización**, que no es del Studio: es la llave de
publicación de Tamix (`POST /publicaciones/:handle/automatizacion`),
cacheada aquí porque el planificador la necesita para publicar sin que nadie
tenga la sesión abierta.

## 9. Equipo

En vivo contra `/publicaciones/:handle/equipo` de Tamix: invitar por alias,
cambiar el papel, retirar a alguien. El Studio no tiene su propia tabla de
membresías ni su propia escala de papeles — usa exactamente la de Tamix
(`analista < redactor < editor < propietario`) y dejaría de tener sentido si
inventara una distinta.

## 10. Requisitos no funcionales

- Toda lectura contra Tamix respeta lo que Tamix ya decide: si Tamix cachea,
  pagina o limita algo, el Studio no lo repite por su cuenta.
- La programación tiene una desviación objetivo menor a 60 s (EventBridge
  Scheduler dispara al segundo; el margen real depende de cuánto tarde el
  propio API de Tamix en responder al webhook).
- Webhooks salientes del Studio: entrega at-least-once, con la misma
  escalera de reintentos que documenta Tamix (inmediato, 1 min, 5 min,
  30 min, 2 h, 12 h, 24 h) antes de darlos por perdidos.
- Cifrado en tránsito en todo; en reposo, la llave de automatización y los
  secretos de webhook se guardan en la tabla del Studio, que usa cifrado del
  lado del servidor de DynamoDB por omisión.
