# Soliluna v3 — Contrato API

## 1. Convenciones generales

| Aspecto | Valor |
|---------|-------|
| Base URL | `/api` |
| Formato | JSON (`Content-Type: application/json`) |
| IDs | ULID (generados por el cliente en create, enviados en el body) |
| Timestamps | ISO 8601 con milisegundos (`2025-01-15T10:30:00.000`) |
| Precios | **Enteros en céntimos** (`120` = 1.20 €). El frontend formatea a euros para mostrar |
| Errores | `{ error: string, details?: unknown }` |
| Validación | Zod v4 en el servidor; errores de validación devuelven 422 |
| Conflict detection | Campo `updated_at` en PUT; 409 si hay conflicto |

### Códigos de estado

| Código | Uso |
|--------|-----|
| 200 | OK (GET, PUT, DELETE exitosos) |
| 201 | Created (POST exitoso) |
| 400 | Bad Request (JSON malformado) |
| 404 | Not Found |
| 409 | Conflict (el registro fue modificado por otro cliente) |
| 422 | Validation Error (Zod) |
| 500 | Internal Server Error |

---

## 2. Ingredientes

### `GET /api/ingredients`

Lista todos los ingredientes.

**Response 200:**
```json
{
  "data": [
    {
      "id": "01HQXYZ...",
      "name": "Harina de trigo",
      "pkgSize": 1,
      "pkgUnit": "kg",
      "pkgPrice": 120,
      "createdAt": "2025-01-10T08:00:00.000",
      "updatedAt": "2025-01-12T14:30:00.000"
    }
  ]
}
```

**Notas:**
- Sin paginación por ahora (se esperan <500 ingredientes). Si crece, se añadirá cursor-based pagination.
- Ordenado por `name ASC` por defecto.

---

### `POST /api/ingredients`

Crea un ingrediente.

**Request:**
```json
{
  "id": "01HQXYZ...",
  "name": "Mantequilla",
  "pkgSize": 250,
  "pkgUnit": "g",
  "pkgPrice": 250
}
```

**Response 201:**
```json
{
  "data": {
    "id": "01HQXYZ...",
    "name": "Mantequilla",
    "pkgSize": 250,
    "pkgUnit": "g",
    "pkgPrice": 250,
    "createdAt": "2025-01-15T10:00:00.000",
    "updatedAt": "2025-01-15T10:00:00.000"
  }
}
```

---

### `GET /api/ingredients/:id`

Obtiene un ingrediente por ID.

**Response 200:**
```json
{
  "data": { /* mismo formato que arriba */ }
}
```

**Response 404:**
```json
{ "error": "Ingredient not found" }
```

---

### `PUT /api/ingredients/:id`

Actualiza un ingrediente. Envía todos los campos (full replace, no patch).

**Request:**
```json
{
  "name": "Mantequilla sin sal",
  "pkgSize": 250,
  "pkgUnit": "g",
  "pkgPrice": 280,
  "updatedAt": "2025-01-15T10:00:00.000"
}
```

**Response 200:**
```json
{
  "data": {
    "id": "01HQXYZ...",
    "name": "Mantequilla sin sal",
    "pkgSize": 250,
    "pkgUnit": "g",
    "pkgPrice": 280,
    "createdAt": "2025-01-15T10:00:00.000",
    "updatedAt": "2025-01-15T12:00:00.000"
  }
}
```

**Response 409 (conflicto):**
```json
{
  "error": "Conflict: record was modified",
  "data": { /* versión actual del servidor */ }
}
```

---

### `DELETE /api/ingredients/:id`

Elimina un ingrediente. Falla con 409 si está en uso en alguna receta o plato.

**Response 200:**
```json
{ "ok": true }
```

**Response 409:**
```json
{ "error": "Cannot delete: ingredient is used in 3 recipes and 1 dish" }
```

---

## 3. Recetas

### `GET /api/recipes`

Lista todas las recetas **con sus ingredientes embebidos**.

**Response 200:**
```json
{
  "data": [
    {
      "id": "01HRABC...",
      "name": "Base galleta maría",
      "yieldAmount": 1.5,
      "yieldUnit": "kg",
      "ingredients": [
        {
          "ingredientId": "01HQXYZ...",
          "name": "Galletas María",
          "amount": 400,
          "unit": "g",
          "cost": 160
        },
        {
          "ingredientId": "01HQAAA...",
          "name": "Mantequilla",
          "amount": 200,
          "unit": "g",
          "cost": 224
        }
      ],
      "cost": 384,
      "createdAt": "2025-01-10T08:00:00.000",
      "updatedAt": "2025-01-12T14:30:00.000"
    }
  ]
}
```

**Notas:**
- `cost` e `ingredients[].cost` se **calculan en el servidor** al responder, no se almacenan.
- Todos los valores de coste/precio son **enteros en céntimos**.
- Incluir ingredientes embebidos evita N+1 queries en el cliente.

---

### `POST /api/recipes`

Crea una receta (sin ingredientes inicialmente).

**Request:**
```json
{
  "id": "01HRABC...",
  "name": "Crema pastelera",
  "yieldAmount": 500,
  "yieldUnit": "g"
}
```

**Response 201:**
```json
{
  "data": {
    "id": "01HRABC...",
    "name": "Crema pastelera",
    "yieldAmount": 500,
    "yieldUnit": "g",
    "ingredients": [],
    "cost": 0,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

### `GET /api/recipes/:id`

Obtiene una receta con ingredientes y costes calculados.

---

### `PUT /api/recipes/:id`

Actualiza la receta (metadatos + ingredientes en una sola llamada).

**Request:**
```json
{
  "name": "Crema pastelera",
  "yieldAmount": 500,
  "yieldUnit": "g",
  "ingredients": [
    { "ingredientId": "01HQXYZ...", "amount": 500, "unit": "ml" },
    { "ingredientId": "01HQAAA...", "amount": 100, "unit": "g" },
    { "ingredientId": "01HQBBB...", "amount": 4, "unit": "u" }
  ],
  "updatedAt": "2025-01-15T10:00:00.000"
}
```

**Notas:**
- `ingredients` es un **replace completo**: la lista enviada sustituye a la anterior.
- Esto simplifica la lógica vs. operaciones individuales add/remove.
- El servidor ejecuta dentro de una transacción: `DELETE recipe_ingredients WHERE recipe_id = ? ; INSERT ...`.

**Response 200:** Receta completa con costes recalculados.

---

### `DELETE /api/recipes/:id`

Elimina receta. Falla con 409 si está en uso en algún plato.

---

## 4. Platos

### `GET /api/dishes`

Lista todos los platos con ingredientes, recetas y costes calculados.

**Response 200:**
```json
{
  "data": [
    {
      "id": "01HRDEF...",
      "name": "Torta helada cumple Ana",
      "pax": 18,
      "deliveryDate": "2025-02-14",
      "notes": "Sin frutos secos (alergia)",
      "multiplier": 3,
      "ingredients": [
        {
          "ingredientId": "01HQCCC...",
          "name": "Nata",
          "amount": 1,
          "unit": "l",
          "cost": 350
        }
      ],
      "recipes": [
        {
          "recipeId": "01HRABC...",
          "name": "Base galleta maría",
          "amount": 1,
          "unit": "kg",
          "cost": 256
        }
      ],
      "baseCost": 606,
      "finalPrice": 1818,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

**Campos calculados:**
- `ingredients[].cost` — coste del ingrediente directo.
- `recipes[].cost` — coste de la porción de receta usada.
- `baseCost` — suma de todos los costes (ingredientes + recetas).
- `finalPrice` — `baseCost × multiplier`.

**Orden por defecto:** Platos sin `deliveryDate` primero, luego por fecha descendente.

---

### `POST /api/dishes`

**Request:**
```json
{
  "id": "01HRDEF...",
  "name": "Torta helada",
  "pax": 12,
  "deliveryDate": "2025-03-01",
  "notes": "",
  "multiplier": 3
}
```

---

### `GET /api/dishes/:id`

Obtiene un plato con todos los datos calculados.

---

### `PUT /api/dishes/:id`

Actualiza el plato completo (metadatos + ingredientes + recetas).

**Request:**
```json
{
  "name": "Torta helada cumple Ana",
  "pax": 18,
  "deliveryDate": "2025-02-14",
  "notes": "Sin frutos secos",
  "multiplier": 3,
  "ingredients": [
    { "ingredientId": "01HQCCC...", "amount": 1, "unit": "l" }
  ],
  "recipes": [
    { "recipeId": "01HRABC...", "amount": 1, "unit": "kg" }
  ],
  "updatedAt": "2025-01-15T10:00:00.000"
}
```

**Notas:**
- Igual que en recetas: `ingredients` y `recipes` son replace completo.
- El servidor ejecuta en una transacción (DELETE + INSERT para ambas tablas junction).

---

### `DELETE /api/dishes/:id`

Elimina un plato. Siempre exitoso (platos no tienen dependientes).

---

## 5. Sincronización

### `GET /api/sync/changes?since=<ISO timestamp>`

Devuelve entidades modificadas después del timestamp dado. Usado por el polling periódico (cada 60s).

**Response 200:**
```json
{
  "data": {
    "ingredients": [
      { "id": "01HQXYZ...", "name": "Harina", "pkgSize": 1000, "pkgUnit": "g", "pkgPrice": 120, "createdAt": "...", "updatedAt": "..." }
    ],
    "recipes": [],
    "dishes": [],
    "deletions": [
      { "entity": "ingredients", "id": "01HQOLD...", "deletedAt": "2025-01-15T14:00:00.000" }
    ]
  },
  "syncedAt": "2025-01-15T14:30:00.000"
}
```

**Notas:**
- `syncedAt` es el timestamp que el cliente debe usar en el siguiente `?since=`.
- `deletions` incluye entidades eliminadas desde el último sync (para que el cliente las borre de su cache).
- Recetas y platos se devuelven con ingredientes/recetas embebidos y costes calculados, igual que en sus endpoints CRUD.

---

### `GET /api/events` (Fase 4 — SSE)

Abre una conexión Server-Sent Events para recibir notificaciones push en tiempo real.

**Headers:**
```
Accept: text/event-stream
```

**Eventos enviados:**

```
event: invalidate
data: {"entity":"ingredients","id":"01HQXYZ...","action":"update"}

event: invalidate
data: {"entity":"recipes","id":"01HRABC...","action":"update"}

event: invalidate
data: {"entity":"dishes","id":"01HRDEF...","action":"delete"}

event: ping
data: {}
```

**Campos del evento `invalidate`:**
- `entity` — `"ingredients"`, `"recipes"` o `"dishes"`
- `id` — ID de la entidad afectada
- `action` — `"create"`, `"update"` o `"delete"`

**Comportamiento del cliente:**
1. Al recibir `invalidate` con `action: "update"` o `"create"` → re-fetch esa entidad específica (`GET /api/{entity}/{id}`), actualizar cache + UI.
2. Al recibir `invalidate` con `action: "delete"` → eliminar de IndexedDB + UI.
3. Evento `ping` cada 30s para mantener la conexión viva.
4. Si la conexión se pierde → fallback a polling con `?since=` al reconectar.

**Notas:**
- Implementado con Cloudflare Durable Objects (ver ARCHITECTURE.md §5.5).
- El Worker envía un `notify` al DO tras cada mutación exitosa.
- El DO mantiene las conexiones SSE y hace broadcast a todos los clientes (excepto el emisor, si se identifica).

---

## 6. Resumen de endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/ingredients` | Listar ingredientes |
| `POST` | `/api/ingredients` | Crear ingrediente |
| `GET` | `/api/ingredients/:id` | Obtener ingrediente |
| `PUT` | `/api/ingredients/:id` | Actualizar ingrediente |
| `DELETE` | `/api/ingredients/:id` | Eliminar ingrediente |
| `GET` | `/api/recipes` | Listar recetas (con ingredientes + costes) |
| `POST` | `/api/recipes` | Crear receta |
| `GET` | `/api/recipes/:id` | Obtener receta |
| `PUT` | `/api/recipes/:id` | Actualizar receta (metadatos + ingredientes) |
| `DELETE` | `/api/recipes/:id` | Eliminar receta |
| `GET` | `/api/dishes` | Listar platos (con todo + costes) |
| `POST` | `/api/dishes` | Crear plato |
| `GET` | `/api/dishes/:id` | Obtener plato |
| `PUT` | `/api/dishes/:id` | Actualizar plato (metadatos + ingredientes + recetas) |
| `DELETE` | `/api/dishes/:id` | Eliminar plato |

| `GET` | `/api/sync/changes` | Cambios desde timestamp (polling) |
| `GET` | `/api/events` | SSE real-time (Fase 4) |

**Total:** 17 endpoints — CRUD (15) + sync (1) + SSE (1).

---

## 7. Versionado

- **No se versiona la API inicialmente** (no `/api/v1/...`).
- Si se necesita en el futuro, se añade prefijo de versión.
- Las respuestas siempre envuelven datos en `{ data: ... }` para permitir añadir metadata sin romper clientes.

---

## 8. Formato camelCase

- La API usa **camelCase** en JSON (`pkgSize`, `yieldAmount`, `deliveryDate`).
- La DB usa **snake_case** (`pkg_size`, `yield_amount`, `delivery_date`).
- La conversión ocurre en la capa de queries del servidor.
- Los esquemas Zod definen la forma camelCase (la que ven frontend y API).
