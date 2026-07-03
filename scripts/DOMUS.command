#!/bin/bash
# ==========================================================================
# DOMUS — abre a casa inteligente como um app, 100% no PC, sem internet.
#
# Dê dois cliques neste arquivo (ou rode no terminal). Ele:
#   1. sobe o hub local (API :4000) se ainda não estiver rodando;
#   2. sobe o app web em produção (:3000, build standalone);
#   3. abre o DOMUS em uma janela de app (sem abas/barra), como programa nativo.
#
# Tudo é localhost: nenhuma requisição sai para a internet. Pré-requisitos já
# prontos no projeto: Postgres na :5432, `apps/api/dist` buildado e
# `apps/web/.next/standalone` preparado (static/public copiados).
# ==========================================================================
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API="$ROOT/apps/api"
WEB="$ROOT/apps/web"
LOGS="$ROOT/.domus-logs"
URL="http://localhost:3000/voz"
mkdir -p "$LOGS"

running() { lsof -ti tcp:"$1" >/dev/null 2>&1; }

# 1) Hub (API)
if running 4000; then
  echo "✓ hub já no ar (:4000)"
else
  echo "→ subindo o hub (API :4000)…"
  ( cd "$API" && nohup npm run start:prod >"$LOGS/api.log" 2>&1 & )
fi

# 2) App web (produção — build standalone)
if running 3000; then
  echo "✓ app já no ar (:3000)"
else
  echo "→ subindo o app (Web :3000)…"
  ( cd "$WEB" && PORT=3000 HOSTNAME=127.0.0.1 nohup node .next/standalone/server.js >"$LOGS/web.log" 2>&1 & )
fi

# 3) Espera o app responder
echo "→ aguardando o app subir…"
for _ in $(seq 1 60); do running 3000 && break; sleep 0.5; done

# 4) Abre como app (janela dedicada, perfil próprio → dá pra "Instalar" e fixar no Dock)
echo "→ abrindo DOMUS…"
open -na "Google Chrome" --args --app="$URL" --user-data-dir="$HOME/.domus-chrome" 2>/dev/null \
  || open "$URL"

echo ""
echo "DOMUS no ar → $URL   (login demo: domus@tcc.com / domus123)"
echo "Para fechar o hub depois:  lsof -ti tcp:3000 tcp:4000 | xargs kill"
