#!/usr/bin/env bash
# Backup do banco do CASAI via pg_dump. Agende no cron do CasaOS/host.
# Uso: ./scripts/backup-db.sh [diretorio_destino]
set -euo pipefail

DEST="${1:-./backups}"
mkdir -p "$DEST"
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$DEST/casai-$STAMP.sql.gz"

# Roda o pg_dump dentro do container do Postgres e comprime.
docker exec casai-db pg_dump -U postgres casai_dev | gzip > "$FILE"

echo "Backup criado: $FILE"

# Retenção: mantém os 14 backups mais recentes.
ls -1t "$DEST"/casai-*.sql.gz 2>/dev/null | tail -n +15 | xargs -r rm -f
echo "Retenção aplicada (14 últimos)."
