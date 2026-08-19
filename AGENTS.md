# soliluna — AGENTS.md

Gestión de costes de recetas para un obrador. Es un servicio real para terceros,
así que la fiabilidad manda: ver *Data safety* en el [`AGENTS.md`](../AGENTS.md)
raíz, que rige también aquí.

## Glosario

- **Ingrediente** — lo que se compra: un paquete de `pkgSize` `pkgUnit` que
  cuesta `pkgPrice`. De ahí sale el precio por unidad, y de ahí todo lo demás.
- **Receta** — lista de ingredientes que rinde `yieldAmount` `yieldUnit`. Su
  coste es la suma de sus ingredientes, y **no se guarda**: se calcula en cada
  lectura, para que cambiar el precio de la harina no exija migrar nada.
- **Plato** — lo que se entrega a un cliente: ingredientes directos más
  porciones de recetas, para `pax` comensales y con `deliveryDate` opcional.
- **Unit** (`l`, `ml`, `kg`, `g`, `u`) — unidades de ingrediente.
  **RecipeUnit** (`PAX`, `kg`, `g`) — lo que rinde una receta.
- **PAX** — comensales. Es una `RecipeUnit`, no una unidad física: no se
  convierte a peso, se escala linealmente por porciones.
- **multiplier** (1–6) — el margen del plato: `precio final = coste × multiplier`.
- **Céntimos** — todo precio es un entero en céntimos (120 = 1,20 €). Se pasa a
  euros sólo para pintarlo.
- **outbox** — cola en IndexedDB con las escrituras que el servidor todavía no
  ha aceptado. La escritura es optimista: primero IndexedDB, luego la red; si la
  red falla estando offline, a la cola, que se vacía en FIFO al reconectar.
- **LWW** (*last-write-wins*) — el cliente manda el `updatedAt` que leyó; si no
  coincide con el del servidor, 409 y gana el servidor. Con dos usuarios los
  conflictos son rarísimos y no compensa nada más listo.
- **SyncHub** — el mapa de conexiones SSE abiertas dentro del proceso. Cada
  escritura emite un `invalidate` a los demás clientes, que refrescan lo
  afectado. Es una optimización sobre el *polling*, no un sustituto.

**Conversión de unidades**: sólo dentro de la misma familia (`l↔ml`, `kg↔g`).
`u` no se convierte a nada, y pasar de volumen a peso exigiría la densidad del
ingrediente, que no se guarda. Por eso **un coste no calculable es `null`, nunca
un número**: inventar la densidad miente y un `0` se lee como gratis. Las filas
`null` cuentan como cero en el total y se cuentan aparte (`missing`), así que
quien pinte ese total tiene que decir que va por debajo.

La base de datos guarda las cantidades **tal como las escribe el usuario**
(`500 ml`, no `0.5 l`); normalizar es cosa de `shared/src/calc/conversion.ts`.

## Invariantes

- **La API no se compila: Node ejecuta el TypeScript directamente.** Por eso
  *todos* los imports relativos del repo acaban en `.ts`, y por eso
  `@soliluna/shared` tiene que seguir siendo un symlink de pnpm: Node se niega a
  quitar tipos de un fichero que esté dentro de `node_modules`.
- **La auth cubre la navegación a `/`, no sólo `/api/*`.** El navegador no pinta
  el diálogo de Basic auth ante un `fetch()`, así que proteger sólo la API deja
  la app rota y sin forma de autenticarse. De ahí que el mismo proceso sirva
  también los estáticos: quedan detrás del mismo middleware. Sólo `/api/health`
  es público.
- **Sin `SOLILUNA_AUTH` no se sirve nada: 503.** Fail-closed, porque son datos
  de un negocio real.
- **El service worker es parte de la auth.** Una navegación va primero a la red;
  sólo cae al shell cacheado si la red no responde *y* consta que este navegador
  se autenticó antes. Ante un 401 devuelve el 401, nunca la caché: con el worker
  que generaba workbox, cancelar el diálogo pintaba la app entera desde disco.
  El navegador no enseña sus credenciales cacheadas a un worker, así que esa
  constancia es una marca que el propio worker escribe y borra.
- **Los endpoints `/api/__test`** borran las siete tablas y ejecutan SQL
  arbitrario: sólo se montan desde `dev.ts`, y producción arranca `serve.ts`.
  Que no existan es la primera línea; la auth es la segunda.
- **El backup se hace con `VACUUM INTO`**, no con `cp`: es la única forma de
  sacar una instantánea consistente con la base en caliente. Y una copia dentro
  del propio VPS todavía no es un backup: sacarla de ahí es `amq soliluna
  backup`, que la baja y la deja también en Cereza.
- **`amq soliluna backup` y `restore` no han corrido nunca contra un servidor**,
  porque la v3 no está desplegada y el dato vive todavía en D1. Son la condición
  de cierre del corte, no un detalle posterior:
  [`2026-08-20 backup-3-2-1.md`](../.agents/decisions/2026-08-20%20backup-3-2-1.md).
- **Al restaurar hay que parar la app y borrar los `-wal` y `-shm`.** Son el
  diario de la base vieja: junto a la nueva, SQLite los cree suyos y reproduce
  encima escrituras que no le tocan. Es lo que se lleva por delante un restore, y
  la razón de que `infra/restore.sh` sea un script y no tres comandos.
- **Los datos son un fichero SQLite en un volumen**, no una base gestionada.
  `amq vps deploy` excluye `data/` del rsync para que una copia local no pueda
  pisar la del servidor.
- **Durante la migración el dominio bueno sirve todavía la v2.** Lo que hay en
  `soliluna.amatiasq.com` es `infra-v2/`; la v3 va a staging con
  `SOLILUNA_SERVICE=soliluna-v3 amq soliluna deploy`. El corte y el apagado de
  la v2: [`.agents/plans/soliluna-el-corte.md`](.agents/plans/soliluna-el-corte.md).

## Convenciones de código

Además del `AGENTS.md` raíz: los imports van de más general a más específico
(lib externa → shared → local), y los exports son explícitos —`export *` sólo en
los `index.ts` de barrel, con los tipos en `export type`—.
