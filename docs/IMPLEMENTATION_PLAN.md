# Soliluna v3 — Plan de Implementación

## Visión general

```
Fase 0          Fase 1            Fase 2              Fase 3             Fase 4          Fase 5
Bootstrap  ──►  Model+DB+API  ──►  UI+Auto-save  ──►  Offline+Sync  ──►  Real-time  ──►  Hardening
(tooling)       (backend)          (frontend)          (PWA)              (SSE)           (polish)
```

---

## Fase 0: Bootstrap

**Objetivo:** Proyecto funcional con tooling, linting, tests y deploy a Cloudflare.

### Tareas

1. **Inicializar monorepo**
   - `pnpm-workspace.yaml` con `packages/*`
   - `tsconfig.base.json` compartido (strict mode, ESM, paths)
   - `.gitignore`, `.editorconfig`

2. **Paquete `@soliluna/shared`**
   - Copiar esquemas Zod y funciones de cálculo (ya creados)
   - Configurar `tsconfig.json`, exports en `package.json`
   - Tests unitarios: conversión de unidades, cálculo de costes
   - Framework de test: `vitest` (compatible Vite, rápido)

3. **Paquete `@soliluna/api`**
   - Scaffold con `wrangler init`
   - Instalar Hono
   - Entry point mínimo (`/api/health` → 200)
   - `wrangler.toml` con binding D1
   - `wrangler dev` funciona local

4. **Paquete `@soliluna/web`**
   - Scaffold con `npm create vite@latest -- --template react-ts`
   - Verificar que `vite dev` + `vite build` funcionan
   - Configurar alias para importar `@soliluna/shared`

5. **Deploy inicial a Cloudflare**
   - Crear base D1 (`wrangler d1 create soliluna`)
   - Deploy del Worker con assets estáticos (SPA vacía)
   - Verificar que `/api/health` responde en producción

6. **CI básico (opcional)**
   - GitHub Action: `pnpm install` → `typecheck` → `test` → `build`

### Entregables
- Monorepo funcional con 3 paquetes
- `pnpm dev` arranca API + web en local
- `pnpm test` ejecuta tests de `shared`
- Deploy funcional a Cloudflare (aunque vacío)

### Estimación de esfuerzo: Bajo

---

## Fase 1: Model + DB + API mínimas

**Objetivo:** CRUD completo de las 3 entidades vía API REST, con D1 como persistencia.

### Tareas

1. **Migración SQL inicial**
   - `packages/api/src/db/migrations/0001_initial.sql` con el esquema completo (ver DB.md)
   - Aplicar con `wrangler d1 migrations apply`
   - Verificar tablas en D1 local

2. **Capa de queries**
   - `packages/api/src/db/queries.ts`
   - Queries tipadas para CRUD de cada entidad
   - Uso de prepared statements (D1 API)
   - Conversión snake_case (DB) ↔ camelCase (API)
   - Helpers: `toRow()` / `fromRow()` por entidad

3. **Rutas Hono — Ingredientes**
   - `GET /api/ingredients` — listar
   - `POST /api/ingredients` — crear (valida con Zod)
   - `GET /api/ingredients/:id` — detalle
   - `PUT /api/ingredients/:id` — actualizar (con check `updated_at`)
   - `DELETE /api/ingredients/:id` — eliminar (check dependencias)

4. **Rutas Hono — Recetas**
   - CRUD con ingredientes embebidos
   - PUT reemplaza la lista de ingredientes en transacción
   - GET calcula costes en runtime (JOIN con ingredients)

5. **Rutas Hono — Platos**
   - CRUD con ingredientes + recetas embebidos
   - PUT reemplaza ambas listas en transacción
   - GET calcula `baseCost` y `finalPrice`

6. **Middleware**
   - CORS (para desarrollo local)
   - Error handler global (500 con formato JSON)
   - Validación Zod como middleware Hono

7. **Tests de integración**
   - Tests contra D1 local (miniflare)
   - CRUD completo de cada entidad
   - Verificar cálculo de costes
   - Verificar detección de conflictos (409)

### Entregables
- 15 endpoints funcionales (ver API.md)
- Tests pasando
- Deploy a Cloudflare con datos reales posibles

### Estimación de esfuerzo: Medio

---

## Fase 2: UI básica con auto-save

**Objetivo:** SPA funcional con listas, detalle y edición de las 3 entidades. Auto-save sin botón guardar.

### Tareas

1. **Estructura de la SPA**
   - React Router con rutas:
     - `/` → Home (redirect a `/ingredients`)
     - `/ingredients` → Lista de ingredientes
     - `/recipes` → Lista de recetas
     - `/recipes/:id` → Detalle de receta
     - `/dishes` → Lista de platos
     - `/dishes/:id` → Detalle de plato
   - Layout con navegación (tabs o sidebar)
   - Estilos base (CSS Modules o Tailwind)

2. **Cliente API**
   - `services/api.ts`: wrapper fetch con base URL, JSON parsing, error handling
   - Funciones tipadas: `getIngredients()`, `createIngredient()`, etc.
   - Usa tipos de `@soliluna/shared`

3. **Hook genérico `useEntity`**
   - `useEntity<T>(endpoint)` → `{ data, isLoading, error, mutate }`
   - Fetch on mount, refetch on dependency change
   - Integración con auto-save (ver paso 5)

4. **Páginas — Ingredientes**
   - Lista con inline editing (como v2):
     - Cada fila es un mini-formulario: nombre, tamaño, unidad, precio
     - Botón + para añadir, botón × para eliminar
   - Auto-save por fila

5. **Auto-save hook**
   - `useAutoSave(values, onSave, { debounceMs: 500 })`
   - Watch de cambios → debounce → validación Zod → PUT
   - Indicador visual: ✓ guardado, ⏳ pendiente, ✗ error
   - Componente `<SaveIndicator />` reutilizable

6. **Páginas — Recetas**
   - Lista: nombre, yield, coste total
   - Detalle: editar nombre/yield + lista de ingredientes
   - Picker de ingredientes (dropdown con búsqueda)
   - Coste calculado en tiempo real (client-side con funciones de `@soliluna/shared`)
   - Auto-save del formulario completo

7. **Páginas — Platos**
   - Lista: nombre, fecha, PAX, precio final
   - Ordenación: sin fecha primero, luego por fecha desc
   - Detalle: editar metadatos + ingredientes + recetas
   - Picker de recetas
   - Cálculo de baseCost y finalPrice (client-side)
   - Selector de multiplicador (1-6×)
   - Auto-save

8. **Componentes reutilizables (migrados/reimaginados del v2)**
   - `<AutoSaveForm>` — wrapper de formulario con debounce
   - `<FormList>` — lista dinámica de items (add/remove)
   - `<NumberInput>` — input numérico
   - `<UnitSelect>` — dropdown de unidades
   - `<DateInput>` — input de fecha
   - `<DeleteButton>` — con confirmación
   - `<CostDisplay>` — muestra coste formateado (€)

### Entregables
- SPA funcional con CRUD de las 3 entidades
- Auto-save visible (editar → recargar → cambio persiste)
- Cálculo de costes correcto
- Navegación fluida entre pantallas

### Estimación de esfuerzo: Alto (es la fase más grande)

---

## Fase 3: Offline cache + outbox + sync

**Objetivo:** La app funciona sin conexión con datos cacheados. Las escrituras offline se sincronizan al reconectar.

### Tareas

1. **Service Worker con Workbox**
   - Instalar `vite-plugin-pwa`
   - Precache de shell (HTML, JS, CSS, icons)
   - Runtime cache de `/api/*` con NetworkFirst (timeout 3s)
   - Fallback a IndexedDB (no al cache de Workbox, porque IndexedDB es más flexible)

2. **IndexedDB setup**
   - Instalar `idb` (wrapper ligero)
   - `services/db.ts`: crear/abrir DB con stores:
     - `ingredients`, `recipes`, `dishes` (key: `id`)
     - `outbox` (autoIncrement)
     - `meta` (key: `key`)
   - Funciones CRUD por store

3. **Capa de cache (stale-while-revalidate)**
   - Refactorizar `useEntity` para:
     1. Leer de IndexedDB → render inmediato
     2. Fetch API en paralelo → si OK, actualizar IDB + re-render
     3. Si error → mantener datos de IDB
   - Indicador de estado de red (online/offline)

4. **Outbox para escrituras**
   - `services/sync.ts`:
     - `enqueue(method, url, body)` → guardar en IDB outbox
     - `flush()` → procesar cola FIFO, enviar cada item al API
     - Retry exponencial (1s, 2s, 4s, 8s, max 30s)
     - Máx 5 reintentos por item → marcar `failed`
   - Listener en `window.addEventListener('online', flush)`
   - Ejecutar flush periódicamente (cada 30s si online)

5. **Integrar outbox en auto-save**
   - Refactorizar flujo de escritura:
     1. Validar con Zod
     2. Escribir en IndexedDB (optimista)
     3. Encolar en outbox
     4. Intentar flush
   - Indicador de sync: ✓ synced, ☁ offline-saved, ✗ failed

6. **PWA Manifest**
   - `public/manifest.json`:
     - `name`, `short_name`, `description`
     - `start_url: "/"`
     - `display: "standalone"`
     - `theme_color`, `background_color`
     - Icons: 192×192, 512×512
   - Meta tags en `index.html`
   - Verificar instalación en Android/iOS

7. **Pre-carga y revalidación**
   - Al arrancar: fetch de las 3 listas en paralelo → poblar IndexedDB
   - `visibilitychange` → visible: re-fetch completo
   - `navigator.onLine` → true: flush outbox + re-fetch
   - Polling cada 60s: `GET /api/sync/changes?since=X` (cambios incrementales)

8. **Endpoint de cambios incrementales**
   - `GET /api/sync/changes?since=<timestamp>`
   - Devuelve entidades modificadas + deletions desde ese timestamp
   - Responde con `syncedAt` para el siguiente poll

9. **Manejo de conflictos**
   - Si el servidor devuelve 409 durante flush:
     - Sobrescribir cache local con dato del servidor
     - Descartar el item del outbox
     - Si el usuario tiene el formulario abierto: mostrar toast "Dato actualizado por otro dispositivo"

10. **Tests**
    - Test manual: abrir app → cargar datos → cortar red → navegar → verificar datos
    - Test manual: editar offline → reconectar → verificar sync
    - Test unitario: outbox enqueue/flush
    - Test unitario: cache read/write

### Entregables
- App instalable como PWA
- Navegación offline funcional con datos cacheados
- Escrituras offline se sincronizan automáticamente
- Indicadores de estado (online/offline, synced/pending)

### Estimación de esfuerzo: Medio-alto

---

## Fase 4: Real-time con Server-Sent Events

**Objetivo:** Cuando un usuario modifica datos en un dispositivo, los demás dispositivos conectados ven el cambio inmediatamente sin recargar.

### Tareas

1. **Durable Object "SyncHub"**
   - Crear clase DO `SyncHub` en `packages/api/src/sync-hub.ts`
   - Mantiene un `Map<string, WritableStreamDefaultWriter>` de conexiones SSE activas
   - Métodos:
     - `handleSSE(request)` → abre conexión SSE, registra el writer
     - `broadcast(event)` → envía a todas las conexiones activas
     - `cleanup()` → eliminar conexiones cerradas
   - Ping cada 30s para mantener conexiones vivas y detectar desconexiones

2. **Configurar Durable Object en wrangler.toml**
   ```toml
   [durable_objects]
   bindings = [
     { name = "SYNC_HUB", class_name = "SyncHub" }
   ]

   [[migrations]]
   tag = "v1"
   new_classes = ["SyncHub"]
   ```

3. **Endpoint SSE: `GET /api/events`**
   - Ruta Hono que delega al Durable Object:
     ```ts
     app.get('/api/events', async (c) => {
       const id = c.env.SYNC_HUB.idFromName('global');
       const hub = c.env.SYNC_HUB.get(id);
       return hub.fetch(c.req.raw);
     });
     ```
   - El DO responde con `new Response(readable, { headers: { 'Content-Type': 'text/event-stream' } })`

4. **Notificar al DO tras cada mutación**
   - En cada handler POST/PUT/DELETE exitoso, después de commit a D1:
     ```ts
     const hub = c.env.SYNC_HUB.get(c.env.SYNC_HUB.idFromName('global'));
     await hub.fetch(new Request('http://internal/notify', {
       method: 'POST',
       body: JSON.stringify({ entity: 'ingredients', id, action: 'update' })
     }));
     ```
   - El DO recibe el notify y hace broadcast a todos los SSE listeners

5. **Cliente: `services/events.ts`**
   - Wrapper sobre `EventSource`:
     ```ts
     const es = new EventSource('/api/events');
     es.addEventListener('invalidate', (e) => {
       const { entity, id, action } = JSON.parse(e.data);
       // Invalidar cache + refetch
     });
     ```
   - Reconexión automática (EventSource reconecta por defecto)
   - Si no puede conectar tras 3 intentos → fallback a polling

6. **Hook: `useRealtimeSync()`**
   - Se monta en el root de la app
   - Escucha eventos SSE
   - Al recibir `invalidate`:
     - `action: "update"/"create"` → re-fetch `GET /api/{entity}/{id}` → actualizar IndexedDB + dispatch re-render
     - `action: "delete"` → borrar de IndexedDB + dispatch re-render
   - Desconecta SSE si la app pasa a background (`visibilitychange → hidden`)
   - Reconecta al volver a foreground

7. **Excluir al emisor**
   - El cliente envía un header `X-Client-Id: <ULID>` en cada mutación
   - El DO almacena el `clientId` del emisor junto con cada evento
   - Al hacer broadcast, salta al emisor (no necesita re-fetch de su propio cambio)

8. **Tests E2E**
   - Abrir 2 pestañas → editar ingrediente en pestaña A → verificar que pestaña B se actualiza en <2s
   - Crear receta en pestaña A → aparece en lista de pestaña B
   - Eliminar plato en pestaña A → desaparece de pestaña B
   - Cortar SSE (simular DO down) → verificar que polling sigue funcionando como fallback

### Entregables
- Cambios en un dispositivo se reflejan en otros en <1 segundo
- SSE con reconexión automática
- Fallback a polling si SSE no disponible
- Tests E2E de sync entre pestañas

### Estimación de esfuerzo: Medio

---

## Fase 5: Refinamiento y hardening

**Objetivo:** Pulido final, migración de datos y robustez.

### Tareas

1. **Migración de datos desde Firebase (v2)**
   - Script `scripts/migrate-firebase.ts`:
     - Leer collections de Firestore (ingredientes, recetas, pasteles)
     - Transformar modelo v2 → v3 (renombrar campos, generar ULIDs)
     - Insertar en D1 vía API
   - Ejecutar una vez, verificar integridad

2. **UX refinements**
   - Animaciones de transición (View Transitions API o CSS)
   - Feedback háptico/visual en auto-save
   - Pull-to-refresh en móvil
   - Empty states (primera vez sin datos)
   - Skeleton loaders mientras carga
   - Buscar/filtrar en listas de ingredientes/recetas

3. **Seguridad**
   - Configurar Cloudflare Access (si se quiere restringir acceso)
   - O añadir auth bearer simple con token en env var
   - Rate limiting en la API (Workers tiene built-in)

4. **Rendimiento**
   - Lazy loading de rutas (React.lazy + Suspense)
   - Optimizar bundle: analizar con `vite-bundle-visualizer`
   - Comprimir assets (brotli, gzip — Workers lo hace automáticamente)

5. **Exportar/Importar datos**
   - Endpoint `GET /api/export` → JSON dump de toda la DB
   - Endpoint `POST /api/import` → restaurar desde JSON
   - Útil para backup y debugging

6. **Monitorización**
   - Logging estructurado en el Worker (console.log con JSON)
   - Error tracking básico (errores se logean en el cliente y se envían al servidor si hay red)

7. **Documentación final**
   - Actualizar docs/ con cambios realizados
   - Instrucciones de desarrollo en README
   - Instrucciones de deploy

### Entregables
- Datos migrados desde v2
- App pulida y lista para uso diario
- Auth configurada
- Documentación actualizada

### Estimación de esfuerzo: Medio

---

## Dependencias entre fases

```
Fase 0 (bootstrap)
  │
  ├── Fase 1 (API)
  │     │
  │     └── Fase 2 (UI)
  │           │
  │           ├── Fase 3 (offline + polling)
  │           │     │
  │           │     └── Fase 4 (SSE real-time)
  │           │
  │           └── Fase 5 (hardening)
  │                 │
  │                 └── (Fase 3 debe completarse antes de migración de datos)
  │
  └── shared package se usa en Fase 1 y Fase 2
```

**Fase 0 y Fase 1** se pueden solapar parcialmente (trabajar en API mientras se configura CI).

**Fase 2 y Fase 3** son secuenciales: la UI necesita funcionar online antes de añadir offline.

**Fase 3 y Fase 4** son secuenciales: el polling y la pre-carga deben funcionar antes de añadir SSE (que es una optimización sobre el polling, no un reemplazo).

**Fase 5** es paralela a Fase 4 en algunos items (UX refinements no dependen de SSE).

---

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Zod v4 aún no es estable | Medio | Usar Zod v3.24 (última estable) con la misma API; migrar a v4 cuando sea GA. Los esquemas son compatibles. |
| D1 tiene limitaciones (tamaño, velocidad) | Bajo | La app es pequeña (<1000 registros). D1 es más que suficiente. |
| Conflictos offline complejos | Medio | LWW es simple y suficiente para 1-2 usuarios. Documentar limitaciones. |
| Bundle grande con React | Bajo | Sin Chakra UI. React 19 + tree shaking mantiene el bundle pequeño (~50KB gzipped). |
| Service Worker cache stale | Medio | Usar `workbox-precaching` con hash de revisión. SW se actualiza en cada deploy. |
| Durable Objects coste/complejidad | Bajo | DO se factura por uso (requests + duración). Con 1-2 usuarios el coste es ~$0. La complejidad está encapsulada en una sola clase. |
| SSE desconexiones frecuentes | Bajo | `EventSource` reconecta automáticamente. Fallback a polling siempre disponible. |

---

## Nota sobre Zod v4

Los esquemas están escritos con la API de Zod v3 que es forwards-compatible con v4. Cuando Zod v4 se publique como estable:
1. Actualizar dependencia: `zod@^4.0.0`
2. Revisar breaking changes (principalmente en `.transform()` y error formatting)
3. Los esquemas básicos (`z.object()`, `z.string()`, `z.number()`, `z.enum()`, `.extend()`) funcionan igual.
4. Beneficios de v4: bundle más pequeño (~40%), mejor rendimiento, mejores mensajes de error.
