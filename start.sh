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
    echo "Python 3.11 or later is required / Python 3.11 ou plus récent est requis : https://www.python.org/downloads/" >&2
    exit 1
  fi
  echo "Installing the local server… / Installation du serveur local…"
  rm -rf server/.venv
  if ! "$PY" -m venv server/.venv; then
    rm -rf server/.venv
    echo "" >&2
    echo "The Python venv module is missing / Le module venv de Python est absent. Debian, Ubuntu: sudo apt install python3-venv" >&2
    exit 1
  fi
fi

# Composants du serveur : installés au premier lancement, puis à chaque
# changement de server/requirements.txt (nouvelle version de l'archive).
if ! cmp -s server/requirements.txt server/.venv/requirements.txt; then
  echo "Installing the server components… / Installation des composants du serveur…"
  "$VENV_PY" -m pip install --disable-pip-version-check -q -r server/requirements.txt
  cp server/requirements.txt server/.venv/requirements.txt
fi

# --- Interface (déjà compilée dans les versions publiées) -------------------
if [ ! -f dist/index.html ]; then
  if ! command -v npm >/dev/null 2>&1; then
    echo "The interface is not built and Node.js was not found. Download the \"portable\" version from the Releases page, or install Node.js 20.19 or later." >&2
    echo "L'interface n'est pas compilée et Node.js est introuvable. Téléchargez la version « portable » depuis la page Releases, ou installez Node.js 20.19 ou plus." >&2
    exit 1
  fi
  echo "Building the interface… / Compilation de l'interface…"
  npm ci --no-audit --no-fund
  npx vite build
fi

URL="http://127.0.0.1:$PORT"
echo ""
echo "  Scopeo : $URL"
echo "  Ctrl + C to stop / pour arrêter."
echo ""
( sleep 3; (command -v xdg-open >/dev/null && xdg-open "$URL") || (command -v open >/dev/null && open "$URL") || true ) >/dev/null 2>&1 &
exec "$VENV_PY" -m uvicorn app.main:app --app-dir server --host 127.0.0.1 --port "$PORT"
