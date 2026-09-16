# Contrato de API

Dos APIs, dos autoridades distintas. `web/` habla con las dos directamente
con el mismo token de sesión — no hay un tercer «API del panel» que las
unifique de más.

## Tamix (`services/social-api`, fuente de verdad)

Base `TAMIX_API_URL`. Formato de error `{ "error": "mensaje" }`; sin sobre
`{data, meta, error}` porque Tamix no lo usa y el Studio no le impone uno.
Sesión: `Authorization: Bearer <accessToken o idToken>`, el mismo que
devuelve `POST /auth/verify`.

Endpoints que el Studio consume, ya existentes y sin cambios:

| Método y ruta | Para qué lo usa el Studio |
| --- | --- |
| `POST /auth/start`, `POST /auth/verify`, `POST /auth/refresh` | Toda la sesión: el Studio no tiene su propio login |
| `GET /me`, `GET /me/cuentas` | Identidad y selector de cuenta activa |
| `GET /publicaciones/:handle/gestion` | Papel de quien pregunta, para autorizar en el cliente (Tamix autoriza siempre en servidor además) |
| `GET/POST/PATCH/DELETE /publicaciones/:handle/equipo[/:userId]` | Equipo |
| `POST/DELETE /publicaciones/:handle/automatizacion` | La llave que el planificador del Studio cachea para publicar sin sesión abierta |
| `GET /publications/:handle`, `GET /publications/:handle/piezas` | Perfil y biblioteca de contenido |
| `POST /posts`, `POST /notes`, `PATCH/DELETE /posts/:id`, `PATCH/DELETE /notes/:id`, `POST /posts/:id/archivar`, `POST /notes/:id/archivar` | Crear, editar, archivar y borrar contenido |
| `GET /piezas/:tipo/:id/como-va` | Desempeño de una pieza |
| `GET/POST /publications/:handle/cobros`, `PATCH /publications/:handle/precio`, `GET /publications/:handle/caja` | Ingresos |
| `POST /hooks/:publicationId/publicar` | Lo llama el **trabajador** del planificador, firmado con HMAC — nunca el navegador |

El contrato exacto de cada uno —campos, papeles mínimos, códigos de error—
está en el código de esas rutas en `Tamix-social-media`, no repetido aquí
dos veces para que no se desalineen. Ver `services/social-api/README.md` de
ese repositorio para el resto de endpoints públicos de la red.

## Studio (`services/studio-api`, lo que Tamix no tiene)

Base `STUDIO_API_URL`. Mismo formato de error. Misma sesión: el token de
Tamix se reenvía tal cual — el Studio lo verifica contra el mismo user pool
(`TAMIX_COGNITO_USER_POOL_ID`/`TAMIX_COGNITO_CLIENT_ID`) y, para lo que exige
un papel mínimo, se lo pregunta a Tamix llamando a `/publicaciones/:handle/gestion`
en el momento — no hay una copia local de quién puede qué.

| Método y ruta | Papel mínimo | Qué hace |
| --- | --- | --- |
| `GET /planificador/:handle` | `redactor` | Lista la cola |
| `POST /planificador/:handle` | `editor` | Programa un elemento (falla con 409 si la cuenta no conectó la automatización) |
| `PATCH /planificador/:handle/:itemId` | `editor` | Reprograma (sólo si sigue `programado` o `fallido`) |
| `DELETE /planificador/:handle/:itemId` | `editor` | Cancela |
| `GET /automatizacion/:handle` | `analista` | Si la cuenta ya conectó la publicación automática |
| `POST /automatizacion/:handle` | `editor` | Conecta o rota la llave, pidiéndosela a Tamix |
| `DELETE /automatizacion/:handle` | `editor` | Suelta la copia del Studio (no la revoca en Tamix) |
| `GET /integraciones/:handle` | `analista` | Lista RSS y webhooks salientes (sin secretos) |
| `POST /integraciones/:handle` | `editor` | Crea una fuente RSS o un webhook saliente (el secreto sale una sola vez) |
| `PATCH /integraciones/:handle/:integracionId` | `editor` | Activa o desactiva |
| `DELETE /integraciones/:handle/:integracionId` | `editor` | Retira |
| `GET /auditoria/:handle` | `analista` | El registro de lo que hizo el Studio, paginado por cursor |

Eventos de webhook saliente disponibles hoy:
`planificador.programado`, `planificador.publicado`, `planificador.fallido`,
`integracion.sync.completado`, `integracion.sync.fallido`. Los de contenido
publicado en general (`content.published`, etc., del backlog original) no
están porque exigirían que Tamix emitiera eventos hacia el Studio, que es
trabajo nuevo en el otro repositorio — anotado en el backlog, no fingido
aquí.

## Firma de webhooks salientes del Studio

Igual que `services/social-api/src/routes/hooks.ts` en Tamix:

- Cabecera `x-tamix-firma` (para lo que el Studio envía a un CMS externo) o,
  en la implementación actual, la que declare cada endpoint suscrito.
- HMAC-SHA256 sobre el cuerpo crudo con el secreto de esa integración,
  comparado en tiempo constante (`domain/integraciones.ts`, `firmaValida`).
- Reintentos: inmediato, 1 min, 5 min, 30 min, 2 h, 12 h, 24 h
  (`domain/planificador.ts`, `REINTENTOS_MINUTOS` — se reutiliza la misma
  escalera para los reintentos de publicación fallida).
