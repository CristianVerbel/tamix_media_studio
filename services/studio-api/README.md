# services/studio-api

Hono sobre Lambda + DynamoDB, en el mismo estilo que `services/social-api`
de Tamix-social-media — pero es otra tabla, otro Lambda, sin ningún import
cruzado entre los dos backends.

## Qué hay aquí y qué no

Sólo lo que Tamix no tiene: la cola de publicación programada
(`routes/planificador.ts`), la llave de automatización cacheada
(`routes/automatizacion.ts`), las integraciones RSS/webhook
(`routes/integraciones.ts`) y la auditoría del Studio
(`routes/auditoria.ts`). Todo lo demás —contenido, equipo, ingresos,
identidad— se pide en vivo a `TAMIX_API_URL` desde `lib/tamix.ts`; no hay
dominio propio de esas cosas aquí, y `web/` de hecho llama a Tamix
directamente para eso, sin pasar por este servicio.

## Variables de entorno

| Variable | Qué es |
| --- | --- |
| `TABLE_NAME` | La tabla propia del Studio |
| `TAMIX_API_URL` | Base de `services/social-api` de Tamix |
| `TAMIX_COGNITO_USER_POOL_ID`, `TAMIX_COGNITO_CLIENT_ID` | El mismo user pool de Tamix, para verificar la misma sesión |
| `ALLOWED_ORIGINS` | CORS del panel |
| `SCHEDULER_GROUP`, `SCHEDULER_ROLE_ARN`, `PUBLICAR_PROGRAMADO_ARN` | Para programar el disparo de un solo tiro del trabajador del planificador |

## Comandos

```bash
npm ci
npm run typecheck
npm test     # node --test, funciones de dominio puras, sin red ni DynamoDB
npm run build
```

## El trabajador del planificador

`src/workers/publicar-programado.ts` no lo invoca API Gateway: lo invoca
EventBridge Scheduler, un disparo por elemento, con `{ itemId }`. Publica
llamando a `POST /hooks/:publicationId/publicar` en Tamix, firmado con la
llave de automatización cacheada — el mismo camino que usaría el CMS de
cualquier medio aliado.
