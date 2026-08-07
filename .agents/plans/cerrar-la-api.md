# Plan — Cerrar la API de soliluna

**✅ Hecho y desplegado (2026-08-06).** La API respondía 200 con los costes,
recetas y precios de una pastelería real a cualquiera que pidiera la URL, y
escribir tampoco estaba protegido. Registro y razonamiento:
[`../decisions/2026-08-06 cerrar-la-api-con-basic-auth.md`](../decisions/2026-08-06%20cerrar-la-api-con-basic-auth.md).

**Por qué estuvo abierta meses:** había auth escrita en los dos extremos —JWT en
cookie, login con Google, `Login.tsx`, `AuthProvider`— y sin conectar en
ninguno. `auth/config.ts` seguía con `CHANGE_ME.apps.googleusercontent.com`:
**sin una OAuth App de Google de verdad el login no podía funcionar**, así que se
dejó a medias y las rutas de datos quedaron al aire. Se borró todo ese código en
vez de aparcarlo: **código muerto que parece seguridad es peor que no tenerlo**.

**El orden importaba.** Verificar la PWA era una puerta —si el precache de
workbox fallaba con la auth puesta se perdía el offline, y el plan B era un login
con cookie—, así que el borrado del código de Google fue el último paso y no el
primero. La puerta no pasó tal cual: hubo que reescribir el service worker.

## Lo que sigue abierto

- **Rotar las credenciales.** Se pusieron iguales a las de `conta` y se
  expusieron en claro. Falta item propio en 1Password y un
  `amq soliluna rotate-credentials` como el de conta.
- **Cerrar la API no des-filtra nada.** Los datos estuvieron legibles en una URL
  pública; hay que asumir que pudieron copiarse.
- **Es copia-pega de `conta/api/auth.ts` y se queda así** (migrar conta a Hono se
  descartó, 2026-08-06). Son dos copias que pueden divergir: si se arregla algo
  aquí, apuntarlo allí. `conta` compara la contraseña sin tiempo constante —aquí
  se hizo bien de entrada con `timingSafeEqual`—.
