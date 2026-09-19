# Tamix Media Studio — instrucciones maestras

## Qué es esto

El centro de operaciones para medios, autores institucionales y marcas
aliadas de Tamix: programar contenido, gestionar equipo, ver ingresos y
conectar integraciones desde un panel pensado para una redacción, no para
una persona sola con el móvil.

**No es una copia de Tamix.** Es una aplicación **independiente** —su propia
infraestructura en AWS, su propia tabla, su propio dominio— que **lee y
escribe en vivo contra `services/social-api` del repositorio
`Tamix-social-media`**. Todo lo que un medio hace o ve aquí —su contenido, su
equipo, sus métricas, sus ingresos— sale de ahí, nunca de una copia local.
Lo único que vive en la tabla propia del Studio es lo que la red no tiene:
la cola de programación, las integraciones, la automatización cacheada y la
auditoría del Studio.

Esta separación no es una preferencia de arquitectura: es el encargo. La red
social no puede perder rendimiento ni escalabilidad porque exista un panel
encima, así que el panel tiene sus propios servidores y su propia base de
datos, y nunca toca la tabla de la red directamente.

## Orden de lectura

1. `CLAUDE.md` (este archivo)
2. `README.md`
3. `docs/PRODUCT_SPEC.md`
4. `docs/DATA_MODEL.md`
5. `docs/API_CONTRACT.md`
6. `docs/IMPLEMENTATION_BACKLOG.md`
7. `docs/ACCEPTANCE_TESTS.md`

Y, antes de tocar nada que hable con Tamix, el repositorio hermano
`Tamix-social-media` — en concreto `services/social-api/src/lib/auth.ts`
(autenticación), `src/domain/permisos.ts` y `src/domain/roles.ts` (papeles de
equipo) y `src/routes/hooks.ts` (publicación automática, que es lo que
permite programar). El Studio no reimplementa nada de eso: lo usa.

## Qué había antes de esto

Este repositorio llegó con un paquete subido —`Tamix_Media_Studio_Claude_Code.zip`—
que traía un prototipo navegable (Next.js sobre un starter de Cloudflare/vinext,
pensado para Supabase/Postgres) y una especificación de producto completa.
El prototipo visual y el kit de componentes (`components/ui/`, shadcn
«new-york») eran reutilizables y se aprovecharon en `web/`. **La arquitectura
que traía no**: asumía integrarse bajo `/panel` dentro de la propia app de
Tamix, con Supabase como base de datos. Eso contradice el encargo real —
servidores y bases de datos independientes, para no arriesgar el rendimiento
de la red— así que se sustituyó por la de aquí: AWS/SST/DynamoDB/Hono, igual
que el resto de Tamix, en un stack separado. Los documentos de producto
originales están adaptados en `docs/`, no borrados.

## Fuente visual y de marca

- La hoja de estilo real de Tamix: `marca/producto-ui.css` en
  `Tamix-social-media` — Inter para interfaz, Newsreader para lectura, el
  degradado ultravioleta (`#5533ff`) → magenta (`#d72bd7`) → coral
  (`#ff4d67`), radios de 12/18/24 px, claro `#f7f7f8` / oscuro `#0d0e11`.
  **No se inventan colores nuevos**: todo color en `web/` traza a un token
  `--tmx-*` de esa hoja.
- El logotipo y el isotipo, en `marca/` de `Tamix-social-media`. No se
  deforma ni se sustituye por texto genérico.
- Tamaño táctil mínimo 44×44 px. `prefers-reduced-motion` se respeta.

## Rutas

El panel vive bajo su propio dominio (`studio.tamix.app`), no bajo
`/panel` de la app de Tamix — ver «Por qué `studio.` y no `/panel`» en el
README. Dentro del panel: `/entrar` (código al correo, contra la sesión de
Tamix), `/resumen`, `/contenido`, `/planificador`, `/equipo`, `/ingresos`,
`/integraciones`, `/auditoria`, `/metricas`, `/comunidad` (a la espera, ver
backlog), `/canal` (los canales —comunidades con miembros— que administras;
no confundir con `/comunidad`, que es la bandeja de comentarios/menciones de
una cuenta), `/configuracion`.

## Reglas de ingeniería

- Stack: `studio-infra/` es una app de SST (AWS) independiente de
  `acento-social`. `services/studio-api/` es Hono sobre Lambda + DynamoDB,
  con el mismo estilo que `services/social-api/` en Tamix-social-media
  (mismos nombres de función en `lib/ddb.ts`, mismo patrón de `KEY`/`SK_PREFIX`,
  mismas pruebas con `node --test` sin mocks de DynamoDB — sólo funciones de
  dominio puras). `web/` es Vite + React + TypeScript, sin Next.js.
- **No hay tabla de usuarios, ni de publicaciones, ni de equipo en el
  Studio.** Todo eso se pide en vivo a Tamix con el token de quien tiene la
  sesión abierta. Si Tamix no responde, el Studio tampoco inventa un número.
- **La sesión es la misma.** El Studio no tiene su propio inicio de sesión:
  llama a `POST /auth/start` y `POST /auth/verify` en `services/social-api`
  de Tamix, que ya resuelven el reto CUSTOM_AUTH de Cognito con el mismo
  user pool que usan la app y la web. Nunca se crea un pool ni un cliente de
  Cognito nuevos para el Studio.
- **La autorización la decide siempre Tamix.** `GET /publicaciones/:handle/gestion`
  dice el papel de quien pregunta; el Studio lo usa para ocultar botones, pero
  el servidor de Tamix es la autoridad de verdad — un 403 de Tamix manda
  siempre, ocultar un botón en el Studio nunca sustituye esa comprobación.
- **La programación no depende de que nadie tenga la sesión abierta.**
  `POST /publicaciones/:handle/automatizacion` en Tamix entrega una llave de
  publicación automática (HMAC, la misma que usaría el CMS de cualquier
  medio aliado); el Studio la guarda cifrada en su propia tabla y el
  trabajador del planificador (`services/studio-api/src/workers/publicar-programado.ts`)
  la usa para llamar a `POST /hooks/:publicationId/publicar` en Tamix a la
  hora exacta, disparado por un EventBridge Scheduler de un solo tiro —
  nunca un `setTimeout` ni un cron que haya que filtrar.
- Multi-cuenta, no multi-tenant con base de datos propia: cada llamada del
  Studio a Tamix va con el `handle` de la cuenta activa y el token de quien
  la gestiona; Tamix decide qué puede ver y hacer.
- Webhooks salientes del Studio (`services/studio-api/src/domain/integraciones.ts`)
  firmados con HMAC-SHA256, igual que hace Tamix en `hooks.ts`, comparados en
  tiempo constante.
- No se guardan claves ni secretos en el navegador más que el token de
  sesión de quien está usando el panel (igual que hace la propia app de
  Tamix). El secreto de un webhook saliente y la llave de automatización
  sólo se enseñan una vez, al crearse.
- Ninguna mutación se implementa sin sus cuatro estados: cargando, éxito,
  error y sin permiso.

## Definición de terminado

Una historia no está terminada hasta que:

1. Lee o escribe contra el endpoint real de Tamix o del Studio — nunca datos
   de muestra.
2. Respeta el papel que devuelve `/publicaciones/:handle/gestion`.
3. Incluye los cuatro estados: vacío/cargando, éxito, error, sin permiso.
4. Es usable con teclado, en móvil y con 200% de zoom.
5. Si añade una regla nueva (no un simple `fetch`), tiene una prueba de
   dominio pura, sin red ni base de datos, siguiendo el estilo de
   `services/social-api/test/` en Tamix-social-media.
6. No rompe ninguna ruta de Tamix ni renombra un endpoint ya usado.
7. Pasa `npm run typecheck`, `npm test` y `npm run build` en cada paquete que
   tocó.

## Secuencia de implementación

Ejecutar los épicos de `docs/IMPLEMENTATION_BACKLOG.md` en orden. Ese
documento distingue lo que ya está construido de lo que sigue en el
backlog — no repetir trabajo ya hecho, y no marcar como avance una pantalla
que no habla con ningún backend real.

## Comandos

```bash
# Backend del Studio
cd services/studio-api && npm ci && npm run typecheck && npm test && npm run build

# Infraestructura (AWS, cuenta compartida con Tamix, stack propio)
cd studio-infra && npx sst install && npm test

# Panel
cd web && npm ci && npm run typecheck && npm run build
```

Antes de añadir una dependencia, comprobar si la capacidad ya existe en
Tamix y se puede pedir por HTTP en vez de reimplementarla aquí.
