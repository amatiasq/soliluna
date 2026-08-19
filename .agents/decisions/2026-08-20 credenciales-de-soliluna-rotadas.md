# 2026-08-20 — Las credenciales de soliluna, rotadas y en 1Password

Cierra `soliluna/.agents/plans/rotar-credenciales.md`. Las de Basic auth **se
habían puesto iguales a las de `conta`** y se expusieron en claro al desplegar:
quien tuviera las de la pastelería tenía las de las cuentas del banco. Ya no.

- **Un login por usuario, no un item con un campo `SOLILUNA_AUTH`**: `Soliluna /
  amatiasq` y `Soliluna / mika`, porque una credencial es compartida y la otra no,
  así que no pueden vivir juntas. `amq soliluna dotenv` las compone, igual que
  hace `conta`. Contraseñas nuevas, sin nada de las viejas.
- **`amq soliluna rotate-credentials`**, copiado del de `conta`: `amq op item edit
  --generate-password` sobre los dos logins y después `amq soliluna secrets`.
- **Sin comas ni dos puntos en la contraseña.** `CONTA_AUTH`/`SOLILUNA_AUTH` se
  parsean por comas: una coma parte el par y deja al usuario fuera **sin decir
  nada**. `amq soliluna dotenv` lo comprueba y se niega a componer una auth rota.

## Lo que esto todavía no arregla

**La app sigue pidiendo las contraseñas expuestas** hasta que el contenedor
arranque con el `.env` nuevo, y eso no pasa mientras la v3 se sirva desde el
Worker: rotar el `.env` del VPS no cambia lo que pide una app que no está ahí. Es
un criterio de cierre de [`soliluna-el-corte.md`](../plans/soliluna-el-corte.md),
no de aquí.

Y **las de `conta` se consideran expuestas** desde el día en que se compartieron:
[`conta/.agents/plans/rotar-credenciales-de-conta.md`](../../../conta/.agents/plans/rotar-credenciales-de-conta.md).
