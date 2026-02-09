# Soliluna v3 — Guía para Claude y Desarrolladores

## Principio fundamental: Legibilidad ante todo

El código debe ser **comprensible por un humano que no lo ha escrito**. Quien venga a leerlo debe poder:
- Abrir cualquier archivo y entender qué hace en <30 segundos.
- Encontrar la funcionalidad que busca sin grep exhaustivo.
- Modificar una parte sin romper otra por efecto sorpresa.

## Reglas de código

### Nombrado
- Nombres descriptivos, no abreviados. `calculateIngredientCost`, no `calcIngCost`.
- Archivos nombrados por lo que contienen: `ingredients.ts` tiene rutas de ingredientes, `cost.ts` tiene cálculos de coste.
- Un archivo = una responsabilidad clara.

### Estructura
- Cada carpeta tiene un propósito obvio (ver ARCHITECTURE.md §3).
- Los imports van de más general a más específico: lib externa → shared → local.
- Exports explícitos; evitar `export *` excepto en archivos `index.ts` de barrel.

### Funciones
- Funciones pequeñas que hacen una cosa.
- Comentarios solo cuando el "por qué" no es obvio. El código explica el "qué".
- Tipos explícitos en las firmas de funciones públicas. TypeScript infiere el resto.

### Datos
- Precios siempre en **céntimos** (enteros). Formatear a euros solo para mostrar.
- IDs son ULIDs (strings). Se generan en el cliente.
- Timestamps ISO 8601 con milisegundos.

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
| Documentación de arquitectura | `docs/` |

## Stack

- **Monorepo**: pnpm workspaces
- **Shared**: Zod schemas + cálculos (usado por API y web)
- **API**: Cloudflare Worker + Hono + D1 (SQLite)
- **Web**: React 19 + Vite + react-hook-form + CSS Modules
- **Offline**: IndexedDB (idb) + Service Worker (Workbox) + outbox
- **Real-time**: Durable Objects + SSE (Fase 4)
- **Tests**: Vitest (unit) + Playwright (E2E)
