# 2026-02-09 — La v3: SPA offline-first, sin ORM

Las seis fases del plan (bootstrap, API, UI, offline, SSE,
hardening) se hicieron sobre Cloudflare; el 2026-08-06 la app se movió a un
proceso Node en el VPS sin tocar ni el esquema ni las rutas.

## Decisión

**SPA de React 19 + Vite**, servida como estáticos por el mismo proceso que
sirve la API. Se descartaron Astro y Next/Remix por lo mismo: **SSR necesita
servidor en cada request y eso contradice offline-first**. Una SPA vive entera
en el navegador, así que con el shell cacheado funciona sin red. Solid.js era
igual de válida; React ganó por continuidad con la v2.

De ahí salen las demás: CSS Modules y react-hook-form en vez de Chakra y Formik
(bundle y auto-save), IndexedDB para los datos y Service Worker para el shell.

## Lo que no se hizo, a propósito

- **Sin ORM.** Las queries son SQL a mano con *prepared statements*, y Zod
  valida entrada y salida. Drizzle queda para cuando la complejidad lo pida.
- **Sin costes almacenados.** Se calculan en cada lectura: cambiar un precio no
  puede dejar totales viejos por ahí.
- **IDs ULID generados en el cliente**, para poder crear entidades sin red.
- **LWW en vez de merge de campos.** Con uno o dos usuarios, un CRDT es pagar
  por adelantado un problema que no existe.
