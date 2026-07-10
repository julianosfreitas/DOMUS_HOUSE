#!/usr/bin/env bash
# ============================================================================
# Traz as métricas REAIS de voz gravadas no Mac mini para o banco local,
# atribuindo-as ao usuário demo (domus@tcc.com). NÃO inventa dado: só importa
# o que existe no Mac. Remapeia por EMAIL/NOME, então não depende dos ids do Mac.
#
# ---------------------------------------------------------------------------
# PASSO 1 — NO MAC MINI: gerar o CSV das métricas de voz (une com email/nome)
# ---------------------------------------------------------------------------
#   Postgres em Docker no Mac (container casai-db):
#     docker exec -i casai-db psql -U postgres -d casai_dev -c \
#       "\copy (SELECT vc.transcript, vc.intent, vc.payload::text, vc.confidence, \
#         vc.success, vc.\"latencyMs\", vc.\"createdAt\", u.email AS user_email, \
#         d.name AS device_name FROM \"VoiceCommand\" vc \
#         JOIN \"User\" u ON u.id=vc.\"userId\" \
#         LEFT JOIN \"Device\" d ON d.id=vc.\"deviceId\") TO STDOUT WITH CSV HEADER" \
#       > macmini_voice.csv
#
#   Postgres nativo (Homebrew/Postgres.app) no Mac:
#     psql -U postgres -d casai_dev -c "\copy (SELECT ... ) TO 'macmini_voice.csv' WITH CSV HEADER"
#
#   Traga macmini_voice.csv para este Dell (USB/nuvem).
#
# ---------------------------------------------------------------------------
# PASSO 2 — AQUI NO DELL:
#     bash scripts/traz-metricas-macmini.sh /caminho/para/macmini_voice.csv
# ---------------------------------------------------------------------------
set -euo pipefail

CSV="${1:?uso: bash scripts/traz-metricas-macmini.sh <macmini_voice.csv>}"
[ -f "$CSV" ] || { echo "✗ arquivo não encontrado: $CSV"; exit 1; }
DB="casai-db"; PGUSER="postgres"; PGDB="casai_dev"; DEMO="domus@tcc.com"

echo "== antes: comandos de voz do $DEMO =="
docker exec -i "$DB" psql -U "$PGUSER" -d "$PGDB" -tAc \
  "SELECT count(*) FROM \"VoiceCommand\" v JOIN \"User\" u ON u.id=v.\"userId\" WHERE u.email='$DEMO';"

# 1) staging (tabela real p/ persistir entre chamadas)
docker exec -i "$DB" psql -U "$PGUSER" -d "$PGDB" -v ON_ERROR_STOP=1 -c \
  "DROP TABLE IF EXISTS stg_voice; CREATE TABLE stg_voice (transcript text, intent text, payload text, confidence double precision, success boolean, \"latencyMs\" integer, \"createdAt\" timestamp, user_email text, device_name text);"

# 2) carrega o CSV via stdin (evita docker cp e problema de path no Windows)
cat "$CSV" | docker exec -i "$DB" psql -U "$PGUSER" -d "$PGDB" -v ON_ERROR_STOP=1 -c \
  "\copy stg_voice FROM STDIN WITH CSV HEADER"

# 3) insere remapeando: userId <- domus@tcc.com ; deviceId <- device local de mesmo nome
docker exec -i "$DB" psql -U "$PGUSER" -d "$PGDB" -v ON_ERROR_STOP=1 <<SQL
INSERT INTO "VoiceCommand" (id, "userId", transcript, intent, "deviceId", payload, confidence, success, "latencyMs", "createdAt")
SELECT gen_random_uuid(),
       (SELECT id FROM "User" WHERE email='$DEMO'),
       s.transcript, s.intent,
       (SELECT d.id FROM "Device" d JOIN "User" u ON u.id=d."userId"
          WHERE u.email='$DEMO' AND d.name = s.device_name LIMIT 1),
       NULLIF(s.payload,'')::jsonb, s.confidence, s.success, s."latencyMs", s."createdAt"
FROM stg_voice s;
DROP TABLE stg_voice;
SQL

echo "== depois: comandos de voz do $DEMO =="
docker exec -i "$DB" psql -U "$PGUSER" -d "$PGDB" -tAc \
  "SELECT count(*) FROM \"VoiceCommand\" v JOIN \"User\" u ON u.id=v.\"userId\" WHERE u.email='$DEMO';"

echo "✓ Métricas do Mac mini importadas para $DEMO. Veja na aba Resultados."
echo "  (energia é análoga: exporte EnergyReading com device_name e me peça o script gêmeo.)"
