# Plan — El corte: soliluna sale de Cloudflare

**Status:** 👨‍💻 el código está listo y probado en local, **sin desplegar**. Sale
de partir [`2026-08-20 soliluna-desacoplado-de-cloudflare.md`](../decisions/2026-08-20%20soliluna-desacoplado-de-cloudflare.md).
**Blocker:** ninguno técnico; son manos humanas. El backup fuera del VPS no se
puede hacer hasta que el stack exista allí, así que es condición de cierre, no
blocker.

`soliluna.amatiasq.com` sirve la **v2** —un nginx que proxea a
`amatiasq.github.io/soliluna/`— y la v3 sólo existe en una URL de `workers.dev`.
**Hoy hay tres sistemas en serie sirviendo cosas distintas**; este plan deja uno.

## 1. Desplegar a un subdominio de prueba

`Dockerfile`, `infra/compose.yml`, `infra/backup.sh` y `amq soliluna deploy` están
escritos y probados en local. Falta meter `soliluna-v3` en el DNS y soltarlo.

**Al subdominio de prueba, no al bueno.** El dominio bueno es el del negocio.

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

## 4. Y el backup, que es condición de cierre

`infra/backup.sh` hace la copia local, y el mecanismo de fuera ya existe: el tirón
que Cereza lanza a diario
([`2026-08-20 backup-3-2-1.md`](../../../.agents/decisions/2026-08-20%20backup-3-2-1.md)).
**No puede incluir a soliluna hasta que el stack exista en el VPS**, así que va
aquí y no antes. Es trabajo, no una decisión.

Es el único coste real del movimiento: D1 tenía backup de facto y un SQLite en el
disco del VPS no tiene ninguno.

## Sin decidir

**Qué se hace con la v2** más allá de apagarla: ¿archivar el repo de Pages, o
borrarlo?

## Criterios de aceptación

- `soliluna.amatiasq.com` sirve la **v3**, con su PWA, y pide credenciales.
- **Pide las credenciales nuevas**, no las expuestas
  ([`2026-08-20 credenciales-de-soliluna-rotadas.md`](../decisions/2026-08-20%20credenciales-de-soliluna-rotadas.md)).
- Los datos del VPS **cuadran con los de D1** — con conteos por tabla, no razonado.
- `amq soliluna backup` y `amq soliluna restore` han corrido contra el VPS, y
  existe un backup automático del SQLite **fuera** del VPS.
- No queda ningún `wrangler` en el camino de despliegue, ni Worker en pie.
- `amatiasq.github.io/soliluna/` ya no lo sirve nada.
- La E2E en verde contra el proceso Node.
