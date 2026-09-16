# Tamix Media Studio — web

Panel de operación editorial para publicaciones en Tamix: contenido,
planificador, equipo, ingresos, integraciones y auditoría, todo en una sola
cuenta activa a la vez.

## Correr en local

```bash
npm install
cp .env.example .env   # y edita las URLs si hace falta
npm run dev
```

Abre la URL que imprime Vite (por defecto `http://localhost:5173`). Necesitas
una cuenta real en Tamix para entrar — el login llama directo a la API de
autenticación de Tamix, no hay atajo de demostración.

## Variables de entorno

| Variable                | Para qué |
| ------------------------ | -------- |
| `VITE_TAMIX_API_URL`     | Base de la API real de Tamix (identidad, publicaciones, equipo, caja). |
| `VITE_STUDIO_API_URL`    | Base de la API propia de este Studio (planificador, integraciones, automatización, auditoría). |

Ver `.env.example`.

## Otros scripts

```bash
npm run typecheck   # tsc --noEmit
npm run build        # typecheck + build de producción (dist/)
npm test             # vitest, unidades sobre lógica pura (roles, forma de error de la API)
```

## Arquitectura: dos clientes de API, dos roles distintos

La app habla con **dos backends**, y la distinción importa para quien la
mantenga:

- **`src/lib/tamixApi.ts`** llama directo a la API real y ya desplegada de
  Tamix (`VITE_TAMIX_API_URL`): identidad (`/me`, `/me/cuentas`), rol y
  automatización por cuenta (`/publicaciones/:handle/gestion`), contenido
  (`/publications/:handle`, `/publications/:handle/piezas`, `/posts`,
  `/notes`), desempeño por pieza (`/piezas/:tipo/:id/como-va`), caja y cobros
  (`/publications/:handle/caja`, `/cobros`, `/precio`) y equipo
  (`/publicaciones/:handle/equipo`). Esta es la fuente de verdad para todo lo
  que ya existe en la red social — el Studio nunca la duplica ni la
  cachea localmente.
- **`src/lib/studioApi.ts`** llama a la API propia de este repo
  (`services/studio-api`, vía `VITE_STUDIO_API_URL`) para lo único que Tamix
  no tiene todavía: la cola de publicación programada (planificador),
  las integraciones (fuentes RSS y webhooks salientes), la copia cacheada
  de la llave de automatización, y el registro de auditoría propio del
  Studio.

Las dos APIs verifican **el mismo bearer token** (mismo user pool de
Cognito), así que `src/lib/auth.ts` lo obtiene y refresca una sola vez
(`getValidAccessToken()`) y ambos clientes lo usan. Los dos backends
devuelven errores no-2xx con la misma forma (`{error: string}`), por eso un
único `src/lib/httpClient.ts` + `src/lib/apiError.ts` (`ApiError`, con
`esPermisoDenegado` / `esNoAutenticado`) sirve para los dos — nunca se
proxean las llamadas de Tamix a través del backend del Studio, ni al revés.

El rol de la cuenta activa (`analista < redactor < editor < propietario`,
`src/lib/roles.ts`) gatea la UI de forma optimista con `alcanza(rol, mínimo)`
— el servidor sigue siendo la autoridad real y responde 403 igual si se
fuerza una llamada; la UI sólo evita llevar a alguien a un botón muerto.

## Lo que es real vs. lo que está deliberadamente vacío

Toda página que no tiene datos reales todavía (Comunidad, y la parte de
alcance/impresiones/atención de Métricas) muestra un estado vacío honesto que
explica por qué, en vez de números inventados — ver
`docs/IMPLEMENTATION_BACKLOG.md` en la raíz del repo para el detalle de cada
hueco.
