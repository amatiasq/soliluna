# 2026-08-20 — Soliluna deja de necesitar Cloudflare

Cierra las fases 0 y 1 de `soliluna/.agents/plans/soliluna-al-vps.md`. **El código
ya no depende de la plataforma**; lo que queda es desplegarlo, y eso sale como
[`soliluna-el-corte.md`](../plans/soliluna-el-corte.md).

## La decisión que se invirtió, y por qué se cae sola

[`infra/machines/cloudflare.md`](../../../infra/machines/cloudflare.md) decía que
soliluna se quedaba en Cloudflare porque es el servicio de una pastelería real y
su disponibilidad no debería depender de una máquina mía.

**Ese argumento no se asume como coste: se cae.** El subdominio ya es un `AAAA` al
VPS y ya lo sirve su nginx, así que **la disponibilidad ya depende de mi máquina
hoy**. Cloudflare no aporta independencia: aporta un segundo sistema **en serie**,
y dos en serie caen más que uno.

Y aporta una plataforma más que mantener: los secretos del resto del mono se
despliegan con `amq op dotenv | amq vps ssh`, y `wrangler secret put` en una
tubería **no usa el login de la CLI** — exige un `CLOUDFLARE_API_TOKEN` aparte.

**Lo que sí se paga, y es una cosa sola: D1 tenía el backup de Cloudflare de facto
y un SQLite en el disco del VPS no tiene ninguno.** Por eso el corte no cierra sin
backup fuera del VPS.

## Los tres bindings, y ninguno era exótico

- **`D1`** es un shim sobre `node:sqlite`: la API de D1 mapea casi 1:1, así que
  las 700 líneas de `queries.ts` **no se tocaron**.
- **El Durable Object del SSE** existía sólo porque *un Worker no puede sostener
  conexiones abiertas*. Un proceso Node sí.
- **`ASSETS`** es `serveStatic` con fallback.

Criterio de salida cumplido: **la E2E pasa contra el proceso Node.**

## Decidido al implementar

- **Driver `node:sqlite`**: sin dependencia nueva y sin compilar nada para la
  arquitectura del VPS. La CPU del VPS **no tiene AVX2**, así que Bun no es opción
  y el runtime es Node.
- **Node ejecuta el TypeScript sin build.** El precio está en el `AGENTS.md`.
- **El fan-out de SSE deja de escalar a más de una réplica.** Para este servicio da
  igual; queda escrito para que no sorprenda.
- **En el repo ya no queda config de Cloudflare**: `packages/api/wrangler.toml` se
  borró en `64cfbd12`. Consecuencia práctica: **el `wrangler delete` del final irá
  por nombre de Worker y de base D1 sacados del panel**, no de un fichero de aquí.

Si algún día se revierte la decisión, lo que hay que reescribir es el plan y el
bullet de `cloudflare.md`, no el código: el trabajo fue desacoplar de la
plataforma, y eso vale en las dos direcciones.
