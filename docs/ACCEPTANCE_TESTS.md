# Criterios de aceptación

## Sesión y permisos

- Sin sesión de Tamix válida, ninguna pantalla del Studio muestra nada de
  ninguna cuenta.
- Un `analista` no puede programar, editar equipo ni conectar integraciones
  — el botón ni se ofrece, y si se fuerza la llamada, Tamix o el Studio
  contestan 403.
- Retirar a alguien del equipo en Tamix bloquea su siguiente llamada al
  Studio en cuanto Tamix se lo niegue — el Studio no cachea el papel más
  allá de la petición en curso.

## Planificador

- Programar en el pasado falla con un mensaje que dice por qué, no un error
  genérico.
- Programar sin haber conectado la automatización de la cuenta falla con
  409 y explica el paso que falta, con enlace a Integraciones.
- Reprogramar o cancelar un elemento en `publicando`, `publicado`,
  `fallido` tras agotar reintentos, o `cancelado` no es posible desde la
  interfaz.
- Un fallo de Tamix al publicar reintenta según la escalera documentada y
  queda visible en el elemento (`ultimoError`, `intentos`) y en la
  auditoría.

## Contenido

- Crear, editar y archivar contenido desde el Studio produce exactamente el
  mismo resultado que hacerlo desde la app de Tamix — porque es la misma
  llamada al mismo endpoint.
- Ninguna pantalla de contenido usa datos que no vengan de una respuesta de
  Tamix.

## Integraciones

- El secreto de un webhook saliente se enseña una sola vez, en el momento
  de crearlo; ninguna lectura posterior lo devuelve.
- Una firma inválida en una entrega se rechaza; el registro de entregas
  distingue firma inválida de destino caído.
- Desconectar la automatización en el Studio no programa nada nuevo, pero
  no cancela lo ya programado con la llave anterior de forma silenciosa: se
  avisa.

## Ingresos

- Los números de `caja` siempre coinciden con lo que muestra Tamix para la
  misma cuenta, porque son la misma respuesta pintada — no hay cálculo
  propio del Studio de por medio.
- Sin pasarela conectada (`cobraYa: false`), la pantalla lo dice y no
  ofrece cifras de «cobrado» como si fueran reales.

## Comunidad y Métricas avanzadas

- La pantalla de Comunidad no presenta ninguna conversación: explica que la
  lectura agregada todavía no existe en Tamix.
- La pantalla de Métricas no presenta alcance, impresiones ni atención
  activa: sólo lo que hoy es real (seguidores, piezas, desempeño por pieza),
  con el resto marcado como próximo.

## UX y accesibilidad

- Navegación completa con teclado y foco visible (heredado de los
  componentes shadcn ya portados, que ya lo resuelven).
- Contraste WCAG AA con los tokens de `marca/producto-ui.css` de Tamix, en
  claro y en oscuro.
- `prefers-reduced-motion` elimina la animación no esencial.
- Estados de carga, vacío, error y sin permiso presentes en cada mutación.

## Infraestructura

- `studio-infra` no declara, referencia ni modifica ningún recurso del
  stack `acento-social` de Tamix-social-media: son cuentas de AWS
  compartidas, pero dos stacks de SST sin dependencia de despliegue entre
  sí.
- `services/studio-api` no importa nada de `services/social-api`: toda
  comunicación es HTTP, con `TAMIX_API_URL` como única frontera.
