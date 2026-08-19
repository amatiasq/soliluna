# Plan — Rotar las credenciales de `soliluna`

**Status:** 🟡 hecho a medias (2026-08-19). Las credenciales nuevas ya existen
en 1Password —un login por usuario— y el `.env` del VPS ya sale de ahí; falta el
despliegue, que es lo que hace que la app las pida de verdad.
**Blocker:** el despliegue de la v3 ([`soliluna-al-vps.md`](soliluna-al-vps.md)).
Salió de cerrar la API
([`2026-08-06`](../decisions/2026-08-06%20cerrar-la-api-con-basic-auth.md)), que
las puso a correr sin item propio.

Las credenciales de Basic auth **se pusieron iguales a las de `conta`** y se
expusieron en claro al desplegar. Mientras sigan así, quien tenga las de la
pastelería tiene las de las cuentas del banco.

1. ~~Item propio en 1Password~~ **Hecho.** No es un item con un campo
   `SOLILUNA_AUTH`, sino **un login por usuario** (`Soliluna / amatiasq`,
   `Soliluna / mika`): una credencial es compartida y la otra no, así que no
   pueden vivir juntas. `amq soliluna dotenv` las compone, igual que hace
   `conta`. Contraseñas nuevas, sin nada de las viejas.
2. ~~`amq soliluna rotate-credentials`~~ **Hecho**, copiando el de `conta`:
   `amq op item edit --generate-password` sobre los dos logins y después
   `amq soliluna secrets`. **Sin comas ni símbolos en la contraseña**:
   `CONTA_AUTH`/`SOLILUNA_AUTH` se parsean por comas y una coma parte el par y
   deja al usuario fuera sin decir nada — `amq soliluna dotenv` lo comprueba y
   se niega a componer una auth rota.
3. **Desplegar.** Hasta que el contenedor se reinicie con el `.env` nuevo, la app
   sigue pidiendo las contraseñas expuestas.
4. Rotar también las de `conta`, que se consideran expuestas desde el día que se
   compartieron: `amq conta rotate-credentials`.

**No es `wrangler secret put`** (comprobado 2026-08-17: no hay ningún `wrangler*`
en el repo). La rotación va contra el `.env` del stack del VPS, que es a donde va
soliluna — [`soliluna-al-vps.md`](soliluna-al-vps.md). Ojo con el orden: mientras
la v3 siga sirviéndose desde el Worker, rotar el `.env` del VPS no cambia lo que
la app pide de verdad, así que **esto se cierra con el despliegue, no antes**.
