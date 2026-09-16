/// <reference path="./.sst/platform/config.d.ts" />

/**
 * Infraestructura de Tamix Media Studio.
 *
 * Vive en su propia app de SST (`tamix-media-studio`), separada por
 * completo del stack `acento-social` de Tamix-social-media: otra tabla,
 * otras funciones, otro CloudFront. Desplegar o destruir esto no puede
 * tocar la red, y al revés tampoco — es justo lo que pedía mantener el
 * Studio sin afectar el rendimiento ni la escalabilidad de la red social.
 *
 * Lo único que el Studio comparte con Tamix es la cuenta de AWS y la zona de
 * Route 53 de `tamix.app` (para poder colgar `studio.` del mismo dominio) y,
 * en tiempo de ejecución, el user pool de Cognito de Tamix — para que quien
 * ya tiene cuenta en Tamix entre al Studio con la misma sesión, sin
 * registrarse dos veces. Ni lo uno ni lo otro se crea aquí: llegan por
 * variable de entorno al desplegar (`ZONA_DNS`, `TAMIX_COGNITO_USER_POOL_ID`,
 * `TAMIX_COGNITO_CLIENT_ID`, `TAMIX_API_URL`), tomados de lo que ya existe.
 *
 * Qué se levanta:
 *
 *   DynamoDB      tabla propia — sólo lo que Tamix no tiene: cola de
 *                 programación, integraciones, automatización cacheada,
 *                 auditoría del Studio
 *   API Gateway   HTTP API → Lambda con el enrutador Hono (services/studio-api)
 *   EventBridge   Scheduler — un disparo por elemento programado, no un cron
 *   S3+CloudFront la aplicación web del panel (web/)
 *
 * Despliegue:
 *   cd studio-infra
 *   npx sst install
 *   npx sst deploy --stage staging
 */
export default $config({
  app(input) {
    return {
      // Igual que en Tamix-social-media: el nombre de la app de SST no
      // recoge la marca, es sólo el identificador con el que AWS y el
      // estado de SST reconocen cada recurso. Cambiarlo levantaría un stack
      // nuevo y vacío al lado del que tiene los datos.
      name: 'tamix-media-studio',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      protect: input?.stage === 'production',
      home: 'aws',
      providers: {
        aws: {
          region: 'us-east-1',
          version: '6.66.2',
        },
      },
    };
  },

  async run() {
    const stage = $app.stage;
    const isProd = stage === 'production';

    /**
     * El dominio del que cuelga el Studio: el mismo `tamix.app` de la red,
     * en un subdominio propio.
     *
     * **No es `medios.tamix.app`.** Ese nombre ya está tomado — sirve las
     * imágenes redimensionadas de la red (`imagen-servida.ts` en
     * Tamix-social-media), y dos cosas distintas detrás del mismo nombre es
     * justo la clase de colisión que un segundo repositorio no puede ver
     * venir. `studio.` es un subdominio libre, en la misma zona.
     */
    const rootDomain = process.env.DOMINIO ?? 'tamix.app';
    const webDomain = isProd ? `studio.${rootDomain}` : `studio-${stage}.${rootDomain}`;
    const apiDomain = isProd ? `studio-api.${rootDomain}` : `studio-api-${stage}.${rootDomain}`;

    // La misma zona de Route 53 que usa Tamix-social-media, por variable de
    // entorno: no se crea ninguna zona aquí, se escribe en la que ya existe.
    const dns = sst.aws.dns({ zone: process.env.ZONA_DNS });

    const allowedOrigins = [`https://${webDomain}`, ...(isProd ? [] : ['http://localhost:5173'])];

    /**
     * La sesión con la que se entra al Studio no se crea aquí.
     *
     * Es el mismo user pool y el mismo cliente que ya usan la app y la web
     * de Tamix: quien ya tiene cuenta en la red entra al Studio con el
     * correo y el código que ya conoce, sin una cuenta nueva que gestionar
     * por separado. Los valores salen de los outputs `userPool` /
     * `userPoolClient` del stack de Tamix-social-media.
     */
    const tamixCognitoUserPoolId = process.env.TAMIX_COGNITO_USER_POOL_ID ?? '';
    const tamixCognitoClientId = process.env.TAMIX_COGNITO_CLIENT_ID ?? '';
    const tamixApiUrl = process.env.TAMIX_API_URL ?? `https://${isProd ? 'api' : `api-${stage}`}.${rootDomain}`;

    /* ---------------------------------------------------------------- *
     *                            DATOS                                  *
     * ---------------------------------------------------------------- */

    /**
     * Tabla propia, y deliberadamente pequeña: cola de programación,
     * integraciones, la llave de automatización cacheada y la auditoría del
     * Studio. Ni una fila de contenido, de audiencia o de ingresos — eso se
     * pide en vivo a Tamix, nunca se copia aquí. Cifrado en reposo por SSE,
     * que trae la tabla por omisión.
     */
    const table = new sst.aws.Dynamo('Tabla', {
      fields: { PK: 'string', SK: 'string' },
      primaryIndex: { hashKey: 'PK', rangeKey: 'SK' },
      transform: {
        table: {
          pointInTimeRecovery: { enabled: true },
          deletionProtectionEnabled: isProd,
        },
      },
    });

    /* ---------------------------------------------------------------- *
     *                        PLANIFICADOR                               *
     * ---------------------------------------------------------------- */

    /**
     * Un grupo propio de EventBridge Scheduler, uno por etapa.
     *
     * Cada elemento programado es **un disparo de una vez**, no una entrada
     * de cron que hay que filtrar: a la hora exacta, EventBridge invoca
     * directamente al trabajador con el identificador del elemento y se
     * borra sola (`ActionAfterCompletion: 'DELETE'`). Es la cola durable que
     * pide `docs/PRODUCT_SPEC.md`: sobrevive a un despliegue y no depende de
     * que ningún proceso siga vivo entre que se programa algo y su hora.
     */
    const schedulerGroup = new aws.scheduler.ScheduleGroup('GrupoDelPlanificador', {
      name: `tamix-media-studio-${stage}`,
    });
    // Sólo los horarios de este grupo, no los de toda la cuenta: un papel
    // con `scheduler:*Schedule` sobre `*` podría tocar los de cualquier otra
    // aplicación de SST en la misma cuenta.
    const arnDelGrupo = $interpolate`arn:aws:scheduler:${aws.getRegionOutput().name}:${aws.getCallerIdentityOutput().accountId}:schedule/${schedulerGroup.name}/*`;

    /** El papel que EventBridge Scheduler asume para poder llamar al trabajador. */
    const rolDelProgramador = new aws.iam.Role('RolDelProgramador', {
      assumeRolePolicy: JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          { Effect: 'Allow', Principal: { Service: 'scheduler.amazonaws.com' }, Action: 'sts:AssumeRole' },
        ],
      }),
    });

    const worker = new sst.aws.Function('PublicarProgramado', {
      handler: '../services/studio-api/src/workers/publicar-programado.handler',
      runtime: 'nodejs22.x',
      timeout: '30 seconds',
      memory: '256 MB',
      environment: {
        TABLE_NAME: table.name,
        SCHEDULER_GROUP: schedulerGroup.name,
        SCHEDULER_ROLE_ARN: rolDelProgramador.arn,
      },
      permissions: [
        { actions: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:Query'], resources: [table.arn] },
        { actions: ['scheduler:CreateSchedule'], resources: [arnDelGrupo] },
      ],
    });

    new aws.iam.RolePolicy('PermisoDelProgramador', {
      role: rolDelProgramador.id,
      policy: $jsonStringify({
        Version: '2012-10-17',
        Statement: [{ Effect: 'Allow', Action: 'lambda:InvokeFunction', Resource: worker.arn }],
      }),
    });

    /* ---------------------------------------------------------------- *
     *                              API                                   *
     * ---------------------------------------------------------------- */

    const api = new sst.aws.ApiGatewayV2('Api', {
      domain: { name: apiDomain, dns },
      cors: {
        allowHeaders: ['content-type', 'authorization'],
        allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
        allowOrigins: allowedOrigins,
        maxAge: '1 day',
      },
    });

    api.route('$default', {
      handler: '../services/studio-api/src/index.handler',
      runtime: 'nodejs22.x',
      timeout: '29 seconds',
      memory: '512 MB',
      environment: {
        TABLE_NAME: table.name,
        ALLOWED_ORIGINS: allowedOrigins.join(','),
        TAMIX_API_URL: tamixApiUrl,
        TAMIX_COGNITO_USER_POOL_ID: tamixCognitoUserPoolId,
        TAMIX_COGNITO_CLIENT_ID: tamixCognitoClientId,
        SCHEDULER_GROUP: schedulerGroup.name,
        SCHEDULER_ROLE_ARN: rolDelProgramador.arn,
        PUBLICAR_PROGRAMADO_ARN: worker.arn,
        ETAPA: stage,
        VERSION: process.env.VERSION ?? 'dev',
        COMMIT: process.env.COMMIT ?? '',
      },
      permissions: [
        { actions: ['dynamodb:*'], resources: [table.arn] },
        { actions: ['scheduler:CreateSchedule', 'scheduler:UpdateSchedule', 'scheduler:DeleteSchedule'], resources: [arnDelGrupo] },
        { actions: ['iam:PassRole'], resources: [rolDelProgramador.arn] },
      ],
    });

    /* ---------------------------------------------------------------- *
     *                             PANEL                                  *
     * ---------------------------------------------------------------- */

    /**
     * El panel es una aplicación estática (Vite + React): se compila una
     * vez y se sirve por CloudFront, igual que `orion/` en Tamix-social-media
     * pero con un paso de compilación porque aquí sí hay componentes y
     * estado, no HTML suelto.
     *
     * No llama a este API para nada que Tamix ya sepa contestar: contenido,
     * equipo, métricas e ingresos salen en vivo de `TAMIX_API_URL` con la
     * sesión de quien entró. Este API sólo entra en juego para lo que el
     * Studio añade — planificador, integraciones, auditoría.
     */
    const web = new sst.aws.StaticSite('Web', {
      path: '../web',
      domain: { name: webDomain, dns },
      build: { command: 'npm run build', output: 'dist' },
      environment: {
        // El panel nunca habla con Cognito directo: entra llamando a
        // `/auth/start` y `/auth/verify` en Tamix, que son las que ya saben
        // resolver el reto CUSTOM_AUTH. Por eso el cliente de Cognito no
        // viaja aquí — sólo lo necesita este servicio, para verificar el
        // token, arriba.
        VITE_STUDIO_API_URL: api.url,
        VITE_TAMIX_API_URL: tamixApiUrl,
      },
    });

    return {
      web: web.url,
      webDominio: `https://${webDomain}`,
      api: api.url,
      apiDominio: `https://${apiDomain}`,
      tabla: table.name,
    };
  },
});
