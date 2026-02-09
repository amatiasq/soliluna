# Soliluna v3 — Arquitectura

## 1. Decisión de framework: SPA (React + Vite)

### Opciones evaluadas

| Opción | Offline-first | Workers compat | Complejidad | Veredicto |
|--------|:---:|:---:|:---:|---|
| **Astro (SSG/SSR)** | Parcial — genera HTML estático pero las islas interactivas necesitan hidratación; no hay soporte nativo offline | Astro SSR en Workers es posible pero las páginas requieren servidor para renderizar | Media-alta | Descartado: SSR no funciona sin red; SSG no sirve para datos dinámicos |
| **Next.js / Remix (SSR)** | No — requiere servidor para cada request | Workers adapter disponible | Alta | Descartado: SSR contradice offline-first |
| **SPA pura (React + Vite)** | Excelente — el shell se cachea con Service Worker, la app funciona sin servidor | Worker sirve archivos estáticos + API | Baja | **Elegido** |
| **SPA (Solid.js + Vite)** | Igual de buena | Igual | Baja-media (menos ecosistema) | Alternativa válida pero React es familiar del v2 |

### Decisión

**React 19 + Vite SPA** desplegada como assets estáticos en un Cloudflare Worker.

Razones:
- Continuidad con v2 (React + Vite + Zod) → menor curva de adopción.
- SPA = toda la UI vive en el navegador → funciona offline una vez cacheada.
- Bundle pequeño sin Chakra UI; usaremos **CSS Modules** o **Tailwind CSS** (a decidir en fase 0).
- **react-hook-form** en lugar de Formik (más ligero, mejor DX para auto-save).
- Service Worker cachea el shell y los assets; IndexedDB cachea los datos.

---

## 2. Stack tecnológico

| Capa | Tecnología | Notas |
|------|-----------|-------|
| Frontend | React 19 + Vite 6 + TypeScript 5 | SPA |
| Formularios | react-hook-form | Auto-save con debounce |
| Estilos | CSS Modules (ligero) o Tailwind | Sin Chakra UI — menor bundle |
| Backend | Cloudflare Worker + Hono | API REST |
| Base de datos | Cloudflare D1 (SQLite gestionado) | Persistencia principal |
| Validación | Zod v4 | Esquemas compartidos frontend/backend |
| Cache local | IndexedDB (vía `idb` wrapper) | Datos offline |
| Service Worker | Workbox (vía vite-plugin-pwa) | Cache de assets + estrategia de red |
| PWA | Web App Manifest + SW | Instalable en móvil |
| IDs | ULID | Ordenables por tiempo, generables client-side |
| Real-time | Durable Objects + SSE | Push de cambios entre dispositivos (Fase 4) |
| Monorepo | pnpm workspaces | 3 paquetes: shared, api, web |

---

## 3. Estructura de carpetas

```
soliluna.v3/
├── packages/
│   ├── shared/                    # Esquemas y lógica compartida
│   │   ├── src/
│   │   │   ├── model/
│   │   │   │   ├── units.ts       # Unit, RecipeUnit, conversiones
│   │   │   │   ├── ingredient.ts  # Schema Zod + tipo Ingredient
│   │   │   │   ├── recipe.ts      # Schema Zod + tipo Recipe
│   │   │   │   ├── dish.ts        # Schema Zod + tipo Dish (antes Cake)
│   │   │   │   └── index.ts       # Re-exports
│   │   │   ├── calc/
│   │   │   │   ├── cost.ts        # Cálculo de costes
│   │   │   │   ├── conversion.ts  # Conversión de unidades
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── api/                       # Cloudflare Worker (Hono)
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── ingredients.ts
│   │   │   │   ├── recipes.ts
│   │   │   │   └── dishes.ts
│   │   │   ├── db/
│   │   │   │   ├── queries.ts     # Queries SQL tipadas
│   │   │   │   └── migrations/
│   │   │   │       └── 0001_initial.sql
│   │   │   ├── middleware/
│   │   │   │   └── cors.ts
│   │   │   └── index.ts           # Entry point Hono
│   │   ├── wrangler.toml
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                       # React SPA
│       ├── public/
│       │   ├── manifest.json      # PWA manifest
│       │   └── icons/             # App icons 192/512
│       ├── src/
│       │   ├── components/        # Componentes UI reutilizables
│       │   │   ├── AutoSaveForm.tsx
│       │   │   ├── FormList.tsx
│       │   │   ├── SaveIndicator.tsx
│       │   │   └── ...
│       │   ├── pages/             # Páginas/rutas
│       │   │   ├── IngredientList.tsx
│       │   │   ├── RecipeDetail.tsx
│       │   │   ├── DishDetail.tsx
│       │   │   ├── DishList.tsx
│       │   │   └── ...
│       │   ├── hooks/
│       │   │   ├── useAutoSave.ts
│       │   │   ├── useEntity.ts   # Hook CRUD genérico
│       │   │   ├── useOnline.ts   # Detector de conexión
│       │   │   └── useRealtimeSync.ts  # SSE listener (Fase 4)
│       │   ├── services/
│       │   │   ├── api.ts         # Cliente HTTP → Worker
│       │   │   ├── cache.ts       # IndexedDB read/write
│       │   │   ├── sync.ts        # Outbox + reconciliación
│       │   │   ├── events.ts      # EventSource SSE (Fase 4)
│       │   │   └── db.ts          # Wrapper IndexedDB (idb)
│       │   ├── sw.ts              # Service Worker (Workbox)
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── index.html
│       ├── vite.config.ts
│       ├── package.json
│       └── tsconfig.json
│
├── docs/
│   ├── ARCHITECTURE.md            # (este archivo)
│   ├── DB.md
│   ├── API.md
│   └── IMPLEMENTATION_PLAN.md
│
├── package.json                   # Workspace root (pnpm)
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── .gitignore
```

---

## 4. Flujo de datos

### 4.1 Diagrama general

```
┌─────────────────────────────────────────────────────┐
│                   NAVEGADOR                          │
│                                                     │
│  ┌──────────┐    ┌──────────┐    ┌───────────────┐  │
│  │  React   │◄──►│  Hooks   │◄──►│  services/    │  │
│  │  UI/SPA  │    │ useEntity│    │  api.ts       │  │
│  └──────────┘    │ useAuto  │    │  cache.ts     │  │
│                  │  Save    │    │  sync.ts      │  │
│                  └──────────┘    └──────┬────────┘  │
│                                        │            │
│                               ┌────────▼────────┐   │
│                               │   IndexedDB     │   │
│                               │  ┌───────────┐  │   │
│                               │  │ cache     │  │   │
│                               │  │ outbox    │  │   │
│                               │  │ meta      │  │   │
│                               │  └───────────┘  │   │
│                               └─────────────────┘   │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │  Service Worker (Workbox)                    │   │
│  │  - Cache shell + assets (precache)           │   │
│  │  - Intercepta /api/* → network-first         │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
└──────────────────────────┬──────────────────────────┘
                           │ HTTPS
                           ▼
┌──────────────────────────────────────────────────────┐
│              CLOUDFLARE WORKER                        │
│                                                      │
│  ┌──────────┐    ┌──────────────┐    ┌───────────┐   │
│  │  Static  │    │  Hono API    │    │           │   │
│  │  Assets  │    │  /api/*      │◄──►│  D1       │   │
│  │  (SPA)   │    │              │    │  (SQLite) │   │
│  └──────────┘    │  Zod valid.  │    │           │   │
│                  └──────┬───────┘    └───────────┘   │
│                         │ notify                     │
│                  ┌──────▼───────┐                     │
│                  │  Durable     │  ◄── SSE connections │
│                  │  Object hub  │  ──► broadcast       │
│                  └──────────────┘     (Fase 4)        │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 4.2 Flujo de LECTURA (stale-while-revalidate)

```
Usuario abre /ingredientes
        │
        ▼
  ┌─ useEntity('ingredients') ─┐
  │                             │
  │  1. Lee IndexedDB (cache)   │ → Render inmediato con datos cacheados
  │  2. Fetch GET /api/...      │ → En paralelo
  │     │                       │
  │     ├─ 200 OK               │ → Actualiza IndexedDB + re-render
  │     └─ Error/timeout        │ → Mantiene datos de cache
  └─────────────────────────────┘
```

**Comportamiento:**
- Primera visita (sin cache): muestra spinner → fetch → render + guardar en cache.
- Visitas siguientes: render instantáneo con cache → revalida en background.
- Sin conexión: render directo desde cache, sin error visible.

### 4.3 Flujo de ESCRITURA (auto-save + outbox)

```
Usuario edita campo → debounce 500ms
        │
        ▼
  ┌─ auto-save trigger ─────────────────────┐
  │                                          │
  │  1. Validar con Zod                      │
  │     ├─ Error → mostrar indicador rojo    │
  │     └─ OK → continuar                    │
  │                                          │
  │  2. Guardar en IndexedDB (optimista)     │ → UI se actualiza inmediatamente
  │                                          │
  │  3. Crear entrada en outbox:             │
  │     { id, method, path, body, timestamp }│
  │                                          │
  │  4. Intentar flush del outbox:           │
  │     ├─ Online → PUT /api/... → 200 OK   │ → Marcar como synced ✓
  │     │                      → 409 Conflict│ → Resolver (ver §5)
  │     └─ Offline → Quedar en outbox       │ → Reintentar al reconectar
  └──────────────────────────────────────────┘
```

---

## 5. Estrategia offline y sincronización

### 5.1 Service Worker (Workbox)

| Recurso | Estrategia | Razón |
|---------|-----------|-------|
| Shell SPA (HTML/JS/CSS) | **Precache** (build-time) | La app debe cargar sin red |
| Assets estáticos (iconos, fuentes) | **Cache-first** | Inmutables entre deploys |
| `GET /api/*` | **Network-first** (timeout 3s) → fallback IndexedDB | Datos frescos cuando hay red |
| `PUT/POST/DELETE /api/*` | **Network-only** con outbox fallback | Escrituras van al servidor o se encolan |

### 5.2 IndexedDB — Stores

| Store | Key | Contenido |
|-------|-----|-----------|
| `ingredients` | `id` | Todos los ingredientes |
| `recipes` | `id` | Todas las recetas (con ingredient list) |
| `dishes` | `id` | Todos los platos (con ingredients + recipes) |
| `outbox` | auto-increment | Mutaciones pendientes `{ method, path, body, createdAt }` |
| `meta` | `key` | `lastSyncAt`, `schemaVersion`, etc. |

### 5.3 Outbox y reconciliación

**Escritura offline:**
1. Cada mutación (create/update/delete) se guarda en el outbox de IndexedDB.
2. El servicio `sync.ts` escucha el evento `online` del navegador.
3. Al reconectar, flushea el outbox en orden FIFO.
4. Cada item se envía al servidor y se elimina del outbox al recibir 2xx.

**Reintentos:**
- Retry exponencial: 1s → 2s → 4s → 8s → máximo 30s.
- Tras 5 fallos consecutivos de un item, se marca como `failed` y se notifica al usuario.

### 5.4 Pre-carga y revalidación de cache

**Al arrancar (o volver online):**

El frontend hace fetch de las 3 listas completas en paralelo:

```
App arranca / navigator.onLine → true
   │
   ├── GET /api/ingredients  → IndexedDB.ingredients (replace all)
   ├── GET /api/recipes      → IndexedDB.recipes (replace all)
   └── GET /api/dishes       → IndexedDB.dishes (replace all)
```

Los datos son pequeños (~500 ingredientes, ~50 recetas, ~30 platos) → unos pocos KB cada request.

**Triggers de revalidación:**

| Evento | Acción |
|--------|--------|
| App arranca | Pre-carga completa (3 listas) |
| `visibilitychange` → visible | Re-fetch completo (3 listas) |
| `navigator.onLine` → true | Flush outbox + re-fetch completo |
| Timer cada 60s (si app visible) | `GET /api/sync/changes?since=X` (polling ligero) |
| Auto-save exitoso (PUT/POST) | Actualizar cache local de esa entidad |
| Evento SSE recibido (Fase 4) | Invalidar + re-fetch entidades afectadas |

**Endpoint de polling:**

`GET /api/sync/changes?since=<ISO timestamp>` devuelve solo las entidades modificadas después de ese timestamp. Si no hay cambios, responde `{ data: { ingredients: [], recipes: [], dishes: [] } }` — payload mínimo.

### 5.5 Sincronización real-time: Server-Sent Events (Fase 4)

En la Fase 4 se añade SSE para notificaciones push inmediatas entre dispositivos.

**Arquitectura:**

```
┌─────────┐  PUT /api/ingredients/:id   ┌──────────────────┐
│ Cliente  │ ──────────────────────────► │  Hono Worker     │
│    A     │                            │                  │
└─────────┘                            │  1. Actualiza D1 │
                                       │  2. Notifica DO  │
┌─────────┐  SSE: event: invalidate    │        │         │
│ Cliente  │ ◄──────────────────────── │        ▼         │
│    B     │                           │  ┌────────────┐  │
│ (escucha │                           │  │  Durable   │  │
│  /api/   │  EventSource connection   │  │  Object    │  │
│  events) │ ─────────────────────────►│  │  "hub"     │  │
└─────────┘                            │  │  (broadc.) │  │
                                       │  └────────────┘  │
                                       └──────────────────┘
```

**Flujo:**
1. Cliente A guarda un ingrediente → Worker actualiza D1 → Worker envía `notify` al Durable Object "hub".
2. El DO "hub" mantiene conexiones SSE abiertas con todos los clientes.
3. El hub envía a todos (excepto al emisor): `event: invalidate\ndata: {"entity":"ingredients","id":"01HQ..."}\n\n`
4. Cliente B recibe el evento → invalida su cache de ese ingrediente → re-fetch → UI se actualiza.

**Formato de eventos SSE:**

```
event: invalidate
data: {"entity":"ingredients","id":"01HQXYZ...","action":"update"}

event: invalidate
data: {"entity":"recipes","id":"01HRABC...","action":"delete"}
```

**Fallback:** Si la conexión SSE se pierde (offline, error), el cliente vuelve al polling con `since` al reconectar. SSE es una optimización sobre el polling, no un reemplazo.

### 5.6 Resolución de conflictos: Last-Write-Wins (LWW)

**Mecanismo:**
- Cada entidad tiene un campo `updated_at` (ISO 8601, precisión milisegundos).
- El cliente envía `updated_at` del dato que modificó.
- El servidor compara con el `updated_at` almacenado:
  - Si coincide → acepta el cambio, actualiza `updated_at`.
  - Si difiere (otro cliente lo modificó) → responde **409 Conflict** con el dato actual del servidor.
- El cliente ante un 409:
  - Sobrescribe su cache local con el dato del servidor.
  - Si el usuario tiene el formulario abierto, muestra un aviso no-intrusivo.

**Justificación de LWW (suficiente para este caso):**
- La app es de uso personal/familiar (1-2 usuarios), por lo que los conflictos serán extremadamente raros.
- LWW es simple, predecible y suficiente para este caso. Si en el futuro se necesita merge de campos, se puede evolucionar a CRDT parcial sobre esta base.

---

## 6. Auto-save

### Patrón

```
Cambio en campo → react-hook-form watch() detecta cambio
       │
       ▼
  Debounce 500ms (cancelar si hay nuevo cambio)
       │
       ▼
  Validar con Zod (schema compartido)
       │
  ┌────┴────┐
  Error     OK
  │         │
  ▼         ▼
 Icono    Guardar en IndexedDB (optimista)
 rojo     + enviar a outbox
          + intentar sync
          │
    ┌─────┴──────┐
    Synced       Offline
    │            │
    ▼            ▼
  Icono ✓     Icono ⏳
  verde       (pendiente)
```

### Estados del indicador

| Estado | Icono | Significado |
|--------|-------|-------------|
| `idle` | ✓ verde | Todo guardado y sincronizado |
| `pending` | Reloj azul | Cambio detectado, esperando debounce |
| `saving` | Spinner amarillo | Guardando en IndexedDB / enviando |
| `offline` | Nube tachada | Guardado local, pendiente de sync |
| `error` | ✗ rojo | Error de validación o fallo persistente |

---

## 7. Despliegue en Cloudflare

### Worker único (API + SPA)

Un solo Cloudflare Worker sirve ambos:

```toml
# wrangler.toml (api)
name = "soliluna-api"
compatibility_date = "2025-01-01"

[assets]
directory = "../web/dist"    # SPA build output

[[d1_databases]]
binding = "DB"
database_name = "soliluna"
database_id = "<id>"
```

**Routing en el Worker:**
- `GET /api/*` → Hono router (datos)
- `PUT/POST/DELETE /api/*` → Hono router (mutaciones)
- Todo lo demás → servir SPA estática (el SPA router maneja las rutas del cliente)

### Entornos

| Entorno | Worker | D1 |
|---------|--------|----|
| `dev` | local (`wrangler dev`) | D1 local (SQLite file) |
| `preview` | `soliluna-preview` | D1 preview |
| `production` | `soliluna-api` | D1 production |

---

## 8. Decisiones adicionales

### Autenticación (simplificada)
- **Fase inicial:** Sin auth (app de uso personal, acceso por URL no publicada).
- **Fase futura:** Cloudflare Access (zero-trust, sin código extra) o token bearer simple.
- La v2 usaba Google Auth con whitelist de emails; podemos reintroducirlo con Cloudflare Access.

### Generación de IDs
- **ULID** generados en el cliente → permite crear entidades offline.
- Formato: 26 caracteres, ordenables cronológicamente, sin colisiones prácticas.
- Paquete: `ulid` (~300 bytes gzipped).

### Sin ORM
- Queries SQL escritas a mano en `db/queries.ts`.
- Zod valida los datos de entrada y salida.
- D1 soporta prepared statements para evitar SQL injection.
- Un ORM como Drizzle es opción futura si la complejidad crece.
