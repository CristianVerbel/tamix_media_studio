# Modelo de datos

DynamoDB de tabla única, en el estilo de `services/social-api/src/lib/keys.ts`
de Tamix-social-media: `KEY.*` son constructores de clave puros, `SK_PREFIX.*`
sirve para consultar subcolecciones dentro de una partición. **A propósito
mucho más corta que la tabla de Tamix**: cinco particiones, nada más, porque
todo lo demás —organizaciones, membresías, roles, contenido, versiones,
revisiones, conversaciones, moderación, métricas diarias, ledger de
ingresos, liquidaciones— ya existe en Tamix y se lee de ahí. Copiarlo aquí
sería una segunda fuente de verdad que un día dejaría de coincidir con la
primera.

| Partición (PK)            | Qué guarda | Por qué no está en Tamix |
| --------------------------- | ------------ | --------------------------- |
| `COLA#<handle>` / `ITEMCOLA#<itemId>` | Un elemento programado para publicarse: título, cuerpo, fecha, estado, intentos | Tamix publica al momento; no tiene concepto de «programado» |
| `INTEGRACIONES#<handle>`   | Una fuente RSS o un webhook saliente configurado por esa cuenta | Son integraciones del panel, no de la red |
| `ENTREGAS#<integracionId>` | El registro de cada intento de entrega de un webhook saliente | Idem |
| `AUTOMATIZACION#<handle>`  | La URL y el secreto de la llave de publicación automática de Tamix, cacheados | Tamix sólo la enseña una vez; el planificador la necesita para publicar sin sesión abierta |
| `AUDITORIA#<handle>`       | Qué hizo el Studio por esta cuenta: quién programó qué, quién conectó qué integración | Tamix tiene su propia bitácora (`domain/bitacora.ts`) para lo que pasa en la red; ésta es sólo de las acciones del Studio |

## Lo que NO vive aquí, y dónde vive de verdad

| Lo que el paquete original pedía como tabla propia | Dónde está de verdad |
| ------------------------------------------------------ | ----------------------- |
| `organizations`, `memberships`, `roles`                | `PublicationItem`, `MiembroItem` y la escala de `domain/roles.ts` en Tamix |
| `contents`, `content_versions`, `content_assets`        | `PostItem` / `NoteItem` en Tamix |
| `content_channels`, `editorial_reviews`                 | No existen todavía como tales en Tamix; el Studio no las simula (ver backlog) |
| `conversations`, `messages`, `moderation_cases`          | No expuestas todavía por Tamix a quien administra una cuenta (backlog, épico Comunidad) |
| `analytics_events`, `daily_content_metrics`              | Parcial en Tamix (`domain/metricas.ts`, `domain/lecturas.ts`); no hay API pública de agregados todavía (backlog, épico Métricas) |
| `revenue_ledger`, `statements`, `payouts`                | El flujo de Stripe Connect de Tamix (`routes/pagos.ts`, `routes/premium.ts`) — el dinero nunca pasa por el Studio |
| `api_keys`                                               | La llave de automatización de Tamix (`routes/organizacion.ts`), no una tabla nueva de llaves |
| `webhook_endpoints`, `webhook_deliveries`                | Sí viven aquí — son del Studio, no de Tamix — ver `INTEGRACIONES#`/`ENTREGAS#` arriba |
| `ingestion_sources`                                      | `INTEGRACIONES#<handle>` con `tipo: 'rss'` |
| `audit_logs`                                             | `AUDITORIA#<handle>`, y sólo de lo que hizo el Studio — el de Tamix es otro, más grande, y vive allá |

## Restricciones y forma

- Cifrado en reposo: el que trae DynamoDB por SSE, sin gestión propia de
  llaves en este primer corte (anotado como posible mejora en el backlog,
  no como pendiente bloqueante).
- El secreto de un webhook saliente y la llave de automatización nunca se
  devuelven en una lectura posterior a su creación — sólo en la respuesta de
  creación o rotación, igual que hace Tamix con la suya.
- Auditoría append-only: ninguna ruta actualiza ni borra un evento ya
  escrito.
- Todo se particiona por `handle` de la publicación en Tamix, no por un
  identificador propio del Studio: el Studio no tiene ni necesita un
  concepto de «organización» distinto del que ya existe en Tamix.
