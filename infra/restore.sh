#!/bin/bash -e

# Restaura un backup del SQLite de soliluna. Se ejecuta EN EL SERVIDOR, por
# tubería desde `amq soliluna restore`.
#
# ⚠️ DESTRUCTIVO: reemplaza la base viva. El argumento es un fragmento (una
# fecha, o el nombre entero) que se busca en backups/; sin argumento, lista.
#
# El orden importa y es la razón de que esto sea un script y no tres comandos:
#
# 1. **Parar la app antes de tocar el fichero.** Un proceso con la base abierta
#    tiene páginas en memoria y un WAL a medio volcar; sustituirle el fichero
#    debajo no restaura nada, corrompe las dos cosas.
# 2. **Borrar los sidecars `-wal` y `-shm`.** Son el diario de la base VIEJA. Si
#    se quedan al lado de la nueva, SQLite los cree suyos y reproduce encima
#    escrituras que no le corresponden. Es la trampa que se lleva el restore.
# 3. **Apartar la base actual, no borrarla.** Restaurar el backup equivocado es
#    justo el momento en que más falta hace la copia de lo que había.

cd "${VPS_DIR:?VPS_DIR is not set}/docker/${SERVICE:-soliluna}"

DB="data/soliluna.db"
arg="$1"

if [[ -z "$arg" ]]; then
  echo "Usage: restore.sh <fecha-o-fichero>. Backups disponibles:"
  ls -1 backups/ 2>/dev/null || echo "  (ninguno)"
  exit 1
fi

f="$(ls -1 backups/ | grep -- "$arg" | tail -n1 || true)"

if [[ -z "$f" ]]; then
  echo "Ningún backup coincide con '$arg'. Disponibles:"
  ls -1 backups/ 2>/dev/null || echo "  (ninguno)"
  exit 1
fi

echo "==> restaurando backups/$f sobre $DB (REEMPLAZA los datos actuales)"

echo "==> parando la app"
docker compose stop app

aside="data/soliluna-reemplazada-$(date +%Y-%m-%d_%H-%M-%S).db"
if [[ -f "$DB" ]]; then
  echo "==> apartando la base actual en $aside"
  mv "$DB" "$aside"
fi
rm -f "$DB-wal" "$DB-shm"

echo "==> descomprimiendo"
gunzip -c "backups/$f" > "$DB"

echo "==> levantando la app"
docker compose up -d app

echo "==> comprobando la base restaurada"
docker compose exec -T app node --input-type=module -e "
  import { DatabaseSync } from 'node:sqlite';
  const db = new DatabaseSync(process.env.DB_PATH);
  const [{ result }] = db.prepare('PRAGMA integrity_check').all();
  if (result !== 'ok') { console.error('integrity_check: ' + result); process.exit(1); }
  const tables = db.prepare(\"select name from sqlite_master where type='table' and name not like 'sqlite_%'\").all();
  for (const { name } of tables) {
    const [{ n }] = db.prepare('select count(*) as n from \"' + name + '\"').all();
    console.log('  ' + name + '=' + n);
  }
  db.close();
"

echo "restaurado $f; la base anterior sigue en $aside"
