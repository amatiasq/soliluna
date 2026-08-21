# El corte: soliluna sale de Cloudflare

**Status:** ⚪ listo en local, sin desplegar (2026-08-20)
**Manual:** avisar a quien usa la app, y apuntar el Worker y la D1 del panel —
[pasos](#manual)

Sale de partir
[`2026-08-20 soliluna-desacoplado-de-cloudflare.md`](../decisions/2026-08-20%20soliluna-desacoplado-de-cloudflare.md).
El paso 1 no espera a nadie: el subdominio ya está decidido.

`soliluna.amatiasq.com` sirve la **v2** —un nginx que proxea a
`amatiasq.github.io/soliluna/`— y la v3 sólo existe en una URL de `workers.dev`.
**Hoy hay tres sistemas en serie sirviendo cosas distintas**; este plan deja uno.

## 1. Desplegar a `soliluna-v3.amatiasq.com` (decidido 2026-08-20)

`Dockerfile`, `infra/compose.yml`, `infra/backup.sh` y `amq soliluna deploy` están
escritos y probados en local. Falta el DNS y soltarlo.

El DNS es una línea `...AAAA('soliluna-v3')` en
[`dns/shared.ts`](../../../dns/shared.ts), en la lista `// myself`. **Da también
`soliluna-v3.amq.im`**, porque las dos zonas comparten esa lista; no molesta, y
que exista el bueno con la v2 delante es lo que hace falta cuidar.

**Al subdominio de prueba, no al bueno.** El dominio bueno es el del negocio, y
sigue sirviendo la v2 hasta el paso 2.

## 2. El corte

Exportar D1, importar en el SQLite, apuntar el dominio a la v3, **avisar a quien
lo usa**, y apagar la v2 (`infra-v2/` y el proxy a Pages).

**Guardar antes el build de la v2**: es la única copia que queda de una versión
que funcionaba.

## 3. Retirar Cloudflare

`wrangler delete`, **y no borrar la D1 el mismo día**: es el rollback.

**El `wrangler delete` va por nombre de Worker y de base D1 sacados del panel**, no
de un fichero del repo — `packages/api/wrangler.toml` se borró en `64cfbd12`.
Apuntarlos antes de necesitarlos.

## 4. Meter soliluna en el tirón de Cereza

Concretamente: **añadir una línea a `infra/amq/nas-bin/backup-pull`**, donde hoy
dice `echo "==> soliluna: se salta (sin desplegar)"`, y quitar ese `echo`. El
mecanismo ya existe y ya corre a diario
([`2026-08-20 backup-3-2-1.md`](../../../.agents/decisions/2026-08-20%20backup-3-2-1.md));
lo único que falta es que haya algo que copiar, y eso pasa en el paso 1. Por eso
va aquí, al final, y no antes.

**Es el único coste real del movimiento**: D1 tenía copia de facto y un SQLite en
el disco del VPS no tiene ninguna. Mientras esta línea no exista, soliluna es el
único dato del 3-2-1 con una sola copia.

## Sin decidir

**Qué se hace con la v2** más allá de apagarla: ¿archivar el repo de Pages, o
borrarlo?

## Criterios de aceptación

- `soliluna-v3.amatiasq.com` sirve la v3 desde el VPS, antes de tocar el bueno.
- `soliluna.amatiasq.com` sirve la **v3**, con su PWA, y pide credenciales.
- **Pide las credenciales nuevas**, no las expuestas
  ([`2026-08-20 credenciales-de-soliluna-rotadas.md`](../decisions/2026-08-20%20credenciales-de-soliluna-rotadas.md)).
- Los datos del VPS **cuadran con los de D1** — con conteos por tabla, no razonado.
- `amq soliluna backup` y `amq soliluna restore` han corrido contra el VPS, y
  existe un backup automático del SQLite **fuera** del VPS.
- No queda ningún `wrangler` en el camino de despliegue, ni Worker en pie.
- `amatiasq.github.io/soliluna/` ya no lo sirve nada.
- La E2E en verde contra el proceso Node.

## Manual

Dos cosas de los pasos 2 y 3 piden a una persona, porque la app es una tienda
en marcha y los nombres que hay que borrar ya no están en ningún fichero.

1. **Avisar a quien usa la app** antes de apagar la v2. Un mensaje con el día
   del corte; el paso 2 no empieza sin respuesta.
2. **Apuntar del panel de Cloudflare** (Workers & Pages, y Storage & Databases
   → D1) el nombre exacto del Worker y el de la base D1, y dejarlos escritos
   en este plan. El `wrangler.toml` que los nombraba se borró en `64cfbd12`, y
   sin ellos no hay `wrangler delete`.
