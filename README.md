# Tamix Media Studio

El centro de operaciones para medios, autores institucionales y marcas
aliadas de [Tamix](https://tamix.app): crear y programar contenido,
gestionar el equipo que lleva una cuenta, ver ingresos y conectar
integraciones — todo desde un panel pensado para una redacción.

**Es una aplicación independiente, no una parte de Tamix.** Vive en su
propio dominio, con su propia infraestructura en AWS y su propia base de
datos, para que un pico de tráfico o un despliegue del panel no puedan tocar
el rendimiento ni la escalabilidad de la red social. Lo que sí comparte con
Tamix, a propósito, es la cuenta de AWS, la sesión (misma cuenta, mismo
inicio de sesión con código al correo) y, sobre todo, los datos: contenido,
equipo, métricas e ingresos se leen y escriben **en vivo** contra
[`Tamix-social-media`](https://github.com/CristianVerbel/Tamix-social-media),
nunca se copian aquí.

## Por qué `studio.tamix.app` y no `medios.tamix.app`

Porque `medios.tamix.app` ya existe y es otra cosa: el CDN que sirve las
imágenes redimensionadas de la red
(`services/social-api/src/workers/imagen-servida.ts` en Tamix-social-media).
Dos productos distintos detrás del mismo nombre es una colisión que un
segundo repositorio no puede ver venir a tiempo, así que el panel se levanta
en un subdominio libre.

## Qué hay

| Carpeta               | Qué es                                                                 |
| ---------------------- | ----------------------------------------------------------------------- |
| `web/`                 | El panel: Vite + React + TypeScript. Habla con Tamix y con el Studio.   |
| `services/studio-api/` | El backend del Studio: Hono sobre Lambda + DynamoDB. Sólo lo que Tamix no tiene. |
| `studio-infra/`        | La infraestructura en AWS: app de SST `tamix-media-studio`, independiente de `acento-social`. |
| `docs/`                | Especificación de producto, modelo de datos, contrato de API y backlog. |

Cada carpeta trae su propio `README.md` con el detalle. Empieza por
`CLAUDE.md` para la vista de conjunto y las reglas de ingeniería.

## Qué necesita, de Tamix y de AWS

Nada de esto se crea aquí: se lee de lo que ya existe al desplegar.

| Variable                       | De dónde sale                                                             |
| ------------------------------- | ---------------------------------------------------------------------------- |
| `DOMINIO`                       | El mismo `tamix.app` (o el que use ese entorno) de Tamix-social-media       |
| `ZONA_DNS`                      | El ID de la zona de Route 53 donde ya vive `tamix.app`                      |
| `TAMIX_API_URL`                 | `https://api.tamix.app` (o `https://api-<etapa>.tamix.app` en pruebas)      |
| `TAMIX_COGNITO_USER_POOL_ID`    | El output `userPool` del stack `acento-social` de Tamix-social-media        |
| `TAMIX_COGNITO_CLIENT_ID`       | El output `userPoolClient` del mismo stack                                  |

Y, del lado de Tamix, un origen permitido: `https://studio.tamix.app` (y su
variante de pruebas) tienen que estar en `origenesPermitidos` de
`social-infra/sst.config.ts` para que el navegador pueda llamar al API de la
red desde el panel — ya está añadido ahí.

## Cómo se levanta

```bash
# 1. El backend del Studio
cd services/studio-api && npm ci && npm run dev # o: revisa package.json

# 2. El panel, contra un backend real (staging, por ejemplo)
cd web
npm ci
VITE_TAMIX_API_URL=https://api-staging.tamix.app \
VITE_STUDIO_API_URL=https://studio-api-staging.tamix.app \
npm run dev

# 3. La infraestructura entera, en AWS (mismo entorno que Tamix)
cd studio-infra
npm install
npx sst install --stage staging
DOMINIO=tamix.app ZONA_DNS=<id-de-la-zona> \
TAMIX_API_URL=https://api-staging.tamix.app \
TAMIX_COGNITO_USER_POOL_ID=<...> TAMIX_COGNITO_CLIENT_ID=<...> \
npx sst deploy --stage staging
```

## Los flujos

| Flujo      | Cuándo corre                    | Qué hace                              |
| ---------- | -------------------------------- | ---------------------------------------- |
| `ci.yml`   | Cada pull request y cada `main`  | Typecheck, pruebas y build de los tres paquetes |
| `deploy-studio.yml` | Fusión en `main`     | Despliega a **pruebas**                  |
| `deploy-studio.yml` | Etiqueta `v*`         | Despliega a **producción**               |

Los secretos de despliegue (credenciales de AWS, `ZONA_DNS`,
`TAMIX_COGNITO_USER_POOL_ID`, `TAMIX_COGNITO_CLIENT_ID`) viven en los
secretos y variables del repositorio, nunca en el código.

## Lo que este panel no duplica de Tamix

Identidad, cuentas, equipo, contenido, métricas de cada pieza e ingresos
siguen viviendo enteros en `services/social-api`. Si ese servicio cae, el
Studio no tiene una copia a la que caer: muestra el error, porque inventar
un número sería mentir. Lo único que el Studio guarda es lo que la red no
tiene — cola de programación, integraciones y su propia auditoría — descrito
en `docs/DATA_MODEL.md`.
