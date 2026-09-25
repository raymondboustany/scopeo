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
# Un environnement incomplet (échec d'un premier essai) est recréé.
if [ ! -x "$VENV_PY" ] || ! "$VENV_PY" -m pip --version >/dev/null 2>&1; then
  PY=""
  for candidate in python3 python3.14 python3.13 python3.12 python3.11 python; do
    if command -v "$candidate" >/dev/null 2>&1       && "$candidate" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)' 2>/dev/null; then
      PY="$(command -v "$candidate")"
      break
    fi
  done
  if [ -z "$PY" ]; then
    echo "Python 3.11 ou plus récent est requis : https://www.python.org/downloads/" >&2
    exit 1
  fi
  echo "Installation du serveur local…"
  rm -rf server/.venv
  if ! "$PY" -m venv server/.venv; then
    rm -rf server/.venv
    echo "" >&2
    echo "Le module venv de Python est absent. Debian, Ubuntu : sudo apt install python3-venv" >&2
    exit 1
  fi
fi

# Composants du serveur : installés au premier lancement, puis à chaque
# changement de server/requirements.txt (nouvelle version de l'archive).
if ! cmp -s server/requirements.txt server/.venv/requirements.txt; then
  echo "Installation des composants du serveur…"
  "$VENV_PY" -m pip install --disable-pip-version-check -q -r server/requirements.txt
  cp server/requirements.txt server/.venv/requirements.txt
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
