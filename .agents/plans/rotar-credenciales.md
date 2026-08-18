# Plan — Rotar las credenciales de `soliluna`

**Status:** ⬜ sin empezar. Salió de cerrar la API
([`2026-08-06`](../decisions/2026-08-06%20cerrar-la-api-con-basic-auth.md)), que
las puso a correr sin item propio.
**Blocker:** ninguno. `amq conta rotate-credentials` es el patrón a copiar y
`amq soliluna secrets` ya es la mitad que empuja.

Las credenciales de Basic auth **se pusieron iguales a las de `conta`** y se
expusieron en claro al desplegar. Mientras sigan así, quien tenga las de la
pastelería tiene las de las cuentas del banco.

1. Item propio en 1Password, distinto del de `conta`, con un campo
   `SOLILUNA_AUTH` = `usuario:pass,usuario2:pass2`. Es exactamente lo que
   `amq soliluna secrets` exige por `SOLILUNA_OP_ITEM` y hoy no existe.
2. `amq soliluna rotate-credentials` = `amq op item edit --generate-password`
   sobre ese item, y después `amq soliluna secrets`, igual que el de `conta`
   acaba en `amq conta deploy-dotenv`. **Sin comas ni símbolos en la contraseña**:
   `CONTA_AUTH`/`SOLILUNA_AUTH` se parsean por comas y una coma parte el par y
   deja al usuario fuera sin decir nada.
3. Rotar también las de `conta`, que se consideran expuestas desde el día que se
   compartieron.

**No es `wrangler secret put`** (comprobado 2026-08-17: no hay ningún `wrangler*`
en el repo). La rotación va contra el `.env` del stack del VPS, que es a donde va
soliluna — [`soliluna-al-vps.md`](soliluna-al-vps.md). Ojo con el orden: mientras
la v3 siga sirviéndose desde el Worker, rotar el `.env` del VPS no cambia lo que
la app pide de verdad, así que **esto se cierra con el despliegue, no antes**.
