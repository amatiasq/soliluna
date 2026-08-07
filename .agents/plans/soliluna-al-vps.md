# Plan — Soliluna entero en el VPS

**Blocker:** falta el backup fuera del VPS, y falta el item de 1Password con las
credenciales (que hay que rotar: se expusieron).
**Status:** 🟡 fases 0 y 1 hechas; la 2 escrita y probada en local, **sin
desplegar**.

Objetivo: **soliluna depende de un solo sistema, y ese sistema es el VPS.** Hoy
depende de tres a la vez —el nginx del VPS que proxea a GitHub Pages (la v2), el
Worker de Cloudflare (la v3 de verdad) y las propias Pages— y ninguno sirve lo
mismo que los otros. El dominio bueno, `soliluna.amatiasq.com`, sirve la
**versión vieja**; la v3 sólo existe en una URL de `workers.dev`.

## Esto invierte una decisión escrita, a propósito

[`infra/machines/cloudflare.md`](../../../infra/machines/cloudflare.md) decía que
`soliluna` se queda en Cloudflare porque es un servicio de una pastelería real y
su disponibilidad no debería depender de una máquina mía.

**Ese argumento no se asume como coste: se cae.** El subdominio ya es un `AAAA`
al VPS y ya lo sirve su nginx, así que la disponibilidad **ya depende de mi
máquina hoy**. Cloudflare no aporta independencia: aporta un segundo sistema **en
serie**, y dos en serie caen más que uno. Añadido al cerrar la API: los secretos
del resto del mono se despliegan con `amq op dotenv | amq vps ssh`, y
`wrangler secret put` en una tubería no usa el login de la CLI —exige un
`CLOUDFLARE_API_TOKEN` aparte—, así que es una plataforma más que mantener.

Lo que sí se paga, y es una cosa sola: **D1 tenía el backup de Cloudflare de
facto y un SQLite en el disco del VPS no tiene ninguno.** Este plan **no puede
cerrarse sin backup** — ver
[`backups-3-2-1.md`](../../../.agents/plans/backups-3-2-1.md).

Si se revierte la decisión, lo que hay que reescribir es este plan y el bullet de
`cloudflare.md`, no el código: el trabajo es sobre todo desacoplar de la
plataforma, y eso vale en las dos direcciones.

## Fases

- **0 — cerrar la API. ✅** [`cerrar-la-api.md`](cerrar-la-api.md). Poner la v3
  en el dominio bueno con la API abierta convertía un agujero en una URL
  adivinable en un agujero en la URL del negocio.
- **1 — desacoplar de Cloudflare, sin desplegar nada. ✅** Los tres bindings, y
  ninguno era exótico: `D1` es un shim sobre `node:sqlite` (la API de D1 mapea
  casi 1:1, así que las 700 líneas de `queries.ts` no se tocaron), el Durable
  Object del SSE existía sólo porque *un Worker no puede sostener conexiones
  abiertas* y un proceso Node sí, y `ASSETS` es `serveStatic` con fallback.
  Criterio de salida cumplido: la E2E pasa contra el proceso Node.
- **2 — empaquetar y desplegar. 🟡** `Dockerfile`, `infra/compose.yml`,
  `infra/backup.sh` y `amq soliluna deploy` reescrito, todo probado en local.
  Falta el item de 1Password (las credenciales de hoy son un secreto de
  Cloudflare que hay que rotar, así que no se pueden copiar) y meter
  `soliluna-v3` en el DNS. Se despliega a un subdominio de prueba, no al bueno.
- **3 — el corte.** Exportar D1, importar en el SQLite, apuntar el dominio a la
  v3, avisar a quien lo usa y apagar la v2 (`infra-v2/` y el proxy a Pages).
  **Guardar antes el build de la v2**: es la única copia que queda de una
  versión que funcionaba.
- **4 — retirar Cloudflare.** `wrangler delete`, y no borrar la D1 el mismo día:
  es el rollback. El backup del SQLite entra aquí y es **condición de cierre**.

## Decidido al implementar (2026-08-06)

- **Driver `node:sqlite`**: sin dependencia nueva y sin compilar nada para la
  arquitectura del VPS. La CPU del VPS no tiene AVX2, así que Bun no es opción y
  el runtime es Node.
- **Node ejecuta el TypeScript sin build.** El precio está en el `AGENTS.md`.
- **El fan-out de SSE deja de escalar a más de una réplica.** Para este servicio
  da igual; queda escrito para que no sorprenda.

## Criterios de aceptación

- `soliluna.amatiasq.com` sirve la **v3**, con su PWA, y pide credenciales.
- No queda ningún `wrangler` en el camino de despliegue.
- Los datos del VPS **cuadran con los de D1** — con conteos por tabla, no
  razonado.
- Existe un backup automático del SQLite **fuera** del VPS.
- La E2E en verde contra el proceso Node.
- `amatiasq.github.io/soliluna/` ya no lo sirve nada.

## Pendiente de decidir

- **Cómo sale el backup del VPS**: la copia local ya la hace `infra/backup.sh`;
  falta el destino de fuera y el cron. Es condición de cierre.
- **Qué se hace con la v2** más allá de apagarla: ¿archivar el repo de Pages, o
  borrarlo?
