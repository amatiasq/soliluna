# 2026-08-06 — Cerrar la API con Basic auth

**Status:** Done. Desplegado y verificado en producción (184 peticiones sin
credenciales a `/`, `/sw.js` y todas las rutas de datos: 401 sin una excepción).

## Decisión

**Basic auth copiando `conta/api/auth.ts`**, que ya protege movimientos
bancarios en producción. Si basta para las cuentas del banco, basta para unas
recetas. Se descarta el login con Google que llevaba meses a medias: sin consola
de terceros no hay bloqueo externo, sin `ALLOWED_EMAILS` no hay correos reales
que se filtren al repo espejo, y el prompt lo pinta el navegador, así que
desaparece la fase de frontend entera. Lo que se pierde —no hay logout, las
credenciales viajan en cada petición sobre https— es irrelevante para dos
personas en una pastelería.

## Tres cosas que no eran obvias

**La auth tiene que cubrir la navegación a `/`, no sólo `/api/*`.** El navegador
no pinta el diálogo de Basic auth ante un `fetch()`, y la primera petición de
datos de la app es un `fetch`. Proteger sólo la API deja la app rota y sin forma
de autenticarse; obliga a que el mismo proceso sirva también los estáticos.

**El service worker es parte de la auth.** Con el que generaba workbox se podía
cancelar el diálogo y seguir navegando: servía el shell precacheado antes de
tocar la red, y los datos salían de IndexedDB. No era una fuga —el servidor daba
401 a todo— pero rompía la premisa de que el login va por delante de la app. Se
pasa a `injectManifest`. El navegador no le enseña sus credenciales cacheadas a
un service worker, así que "este navegador ya se autenticó" es una marca que el
worker escribe al recibir un 200 y borra al recibir un 401.

**Un 401 no puede descartar la cola offline.** `flushOutbox()` borraba la entrada
aunque la respuesta fuese un error, porque sólo miraba si el `fetch` lanzaba.
Unas credenciales olvidadas perdían en silencio cambios que el usuario ya veía
guardados.

## Dos fallos que sólo salieron al usar la app

Ninguno era de autenticación; aparecieron al ejercitar la app de verdad.

- **Las escrituras esperaban al broadcast SSE.** Un cliente que dejó de leer deja
  un writer que no resuelve nunca, así que bloqueaba el broadcast y con él el
  `PUT` —reproducido: el siguiente `PUT` pasó de tres minutos—. Ahora el aviso es
  fire-and-forget, las escrituras del hub van en paralelo con plazo, y el ping
  hace de barrendero.
- **`/api/sync/changes` devolvía 500.** Resolvía las relaciones fila a fila y
  pasaba del millar de subpeticiones, así que moría la primera sincronización de
  cualquier cliente nuevo, en silencio, porque el cliente sólo miraba
  `response.ok`. Ahora es un batch de nueve consultas y el join se hace en
  memoria, compartiendo funciones puras entre endpoints para que los costes no
  diverjan.
