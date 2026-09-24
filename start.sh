#!/usr/bin/env sh
# ---------------------------------------------------------------------------
#  Scopeo : lanceur macOS / Linux
#  ./start.sh : installe ce qui manque au premier lancement, puis démarre
#  l'application et ouvre le navigateur.
# ---------------------------------------------------------------------------
set -e
cd "$(dirname "$0")"

PORT="${SCOPEO_PORT:-8000}"
VENV_PY="server/.venv/bin/python"

# --- Python -----------------------------------------------------------------
if [ ! -x "$VENV_PY" ]; then
  PY="$(command -v python3 || command -v python || true)"
  if [ -z "$PY" ]; then
    echo "Python 3.11 ou plus récent est requis : https://www.python.org/downloads/" >&2
    exit 1
  fi
  echo "Installation du serveur local…"
  "$PY" -m venv server/.venv
  "$VENV_PY" -m pip install --disable-pip-version-check -q -r server/requirements.txt
fi

# --- Interface (déjà compilée dans les versions publiées) -------------------
if [ ! -f dist/index.html ]; then
  if ! command -v npm >/dev/null 2>&1; then
    echo "L'interface n'est pas compilée et Node.js est introuvable." >&2
    echo "Téléchargez la version « portable » depuis la page Releases, ou installez Node.js 20+." >&2
    exit 1
  fi
  echo "Compilation de l'interface…"
  npm ci --no-audit --no-fund
  npx vite build
fi

URL="http://127.0.0.1:$PORT"
echo ""
echo "  Scopeo : $URL"
echo "  Ctrl + C pour arrêter."
echo ""
( sleep 3; (command -v xdg-open >/dev/null && xdg-open "$URL") || (command -v open >/dev/null && open "$URL") || true ) >/dev/null 2>&1 &
exec "$VENV_PY" -m uvicorn app.main:app --app-dir server --host 127.0.0.1 --port "$PORT"
