# infra-v2 — el stack que sirve `soliluna.amatiasq.com` HOY

Un nginx que hace de proxy a `amatiasq.github.io/soliluna/`, es decir a la **v2**,
la versión vieja de la app. Esto sigue siendo lo que hay en producción.

**No es lo que despliega `amq soliluna deploy`.** Ese comando despliega la v3, el
proceso Node de `../infra/`, y durante la migración lo hace a una carpeta de
staging del servidor (ver [`../.agents/plans/soliluna-al-vps.md`](../.agents/plans/soliluna-al-vps.md)).

Si hubiera que tocar este stack antes del corte:

```sh
INFRA_DIR=infra-v2 amq deploy-infra soliluna
amq vps pull-and-restart soliluna
```

**Esta carpeta se borra en la fase 3 del plan**, cuando el dominio pase a la v3.
Antes de borrarla hay que guardar en algún sitio el build de la v2 que vive en
GitHub Pages: es la única copia que queda de una versión que funcionaba.
