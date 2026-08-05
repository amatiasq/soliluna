# soliluna — AGENTS.md

Gestión de costes de recetas para un obrador. Es un servicio real para terceros,
así que la fiabilidad manda: ver *Data safety* en el [`AGENTS.md`](../AGENTS.md)
raíz, que rige también aquí.

Monorepo pnpm con tres paquetes:

- **shared** — esquemas Zod + cálculo de costes. Lo usan API y web.
- **api** — Cloudflare Worker + Hono + D1 (SQLite).
- **web** — React 19 + Vite + react-hook-form + CSS Modules. Offline con
  IndexedDB (`idb`) + Service Worker (Workbox) + outbox. Tiempo real con Durable
  Objects + SSE.

Tests: Vitest (unidad) + Playwright (E2E). Arquitectura en detalle: `docs/`.

## Convenciones de datos

- **Precios siempre en céntimos** (enteros). Se formatean a euros sólo para
  mostrar.
- **IDs son ULIDs** (strings), generados en el cliente.
- **Timestamps ISO 8601** con milisegundos.
- El coste se calcula en los dos lados: el front para respuesta instantánea, la
  API como canónico.

## Dónde encontrar cada cosa

| Busco... | Está en... |
|----------|-----------|
| Tipos y validación Zod | `packages/shared/src/model/` |
| Cálculo de costes | `packages/shared/src/calc/cost.ts` |
| Conversión de unidades | `packages/shared/src/calc/conversion.ts` |
| API REST (rutas Hono) | `packages/api/src/routes/` |
| Queries SQL | `packages/api/src/db/queries.ts` |
| Migraciones DB | `packages/api/src/db/migrations/` |
| Páginas/vistas React | `packages/web/src/pages/` |
| Componentes reutilizables | `packages/web/src/components/` |
| Hooks (auto-save, entity) | `packages/web/src/hooks/` |
| Cache IndexedDB + sync | `packages/web/src/services/` |
| Service Worker | `packages/web/src/sw.ts` |

## Convenciones de código

Además del `AGENTS.md` raíz:

- Los imports van de más general a más específico: lib externa → shared → local.
- Exports explícitos; `export *` sólo en los `index.ts` de barrel, y los tipos
  con `export type`.
