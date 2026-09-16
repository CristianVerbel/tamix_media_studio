# studio-infra

App de SST (`tamix-media-studio`), independiente del stack `acento-social`
de Tamix-social-media. Comparte la cuenta de AWS y la zona de Route 53 de
`tamix.app` — nada más. Otra tabla, otro Lambda, otro CloudFront; desplegar
o borrar esto no puede tocar la red social.

## Qué levanta

- `sst.aws.Dynamo('Tabla')` — sólo lo que el Studio guarda de más (ver
  `docs/DATA_MODEL.md` en la raíz del repositorio).
- `sst.aws.Function('PublicarProgramado')` — el trabajador del planificador.
- Un grupo de EventBridge Scheduler y el rol que le permite invocar al
  trabajador, un disparo por elemento programado.
- `sst.aws.ApiGatewayV2('Api')` → `services/studio-api`.
- `sst.aws.StaticSite('Web')` → `web/`, en `studio.<dominio>`.

## Variables de entorno al desplegar

| Variable | De dónde sale |
| --- | --- |
| `DOMINIO` | El mismo dominio raíz que usa Tamix-social-media (`tamix.app` por omisión) |
| `ZONA_DNS` | El ID de la zona de Route 53 donde ya vive ese dominio |
| `TAMIX_API_URL` | La URL del API de Tamix para esa etapa |
| `TAMIX_COGNITO_USER_POOL_ID`, `TAMIX_COGNITO_CLIENT_ID` | Los outputs `userPool` / `userPoolClient` del stack `acento-social` |

## Comandos

```bash
npm install
npx sst install
npm test                       # sólo comprueba que CORS no se separó entre la infra y el enrutador
npx sst deploy --stage staging
```
