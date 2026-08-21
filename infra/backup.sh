#!/bin/bash -e

# Copia consistente del SQLite de soliluna a backups/. Corre EN EL SERVIDOR:
#   VPS_DIR=$HOME/vps ~/vps/docker/soliluna/backup.sh
# `VACUUM INTO`, no `cp`: instantánea consistente aunque haya escrituras y WAL
# sin volcar.


cd "${VPS_DIR:?VPS_DIR is not set}/docker/${SERVICE:-soliluna}"

mkdir -p backups

stamp="$(date +%Y-%m-%d_%H-%M-%S)"
name="soliluna-$stamp.db"

docker compose exec -T app node --input-type=module -e "
  import { DatabaseSync } from 'node:sqlite';
  const db = new DatabaseSync(process.env.DB_PATH);
  db.exec(\"VACUUM INTO '/data/$name'\");
  db.close();
"

docker compose cp "app:/data/$name" "backups/$name"
docker compose exec -T app rm "/data/$name"

gzip -f "backups/$name"

# Rotación: 30 días de copias locales.
find backups -name 'soliluna-*.db.gz' -mtime +30 -delete

echo "backup written: backups/$name.gz"
