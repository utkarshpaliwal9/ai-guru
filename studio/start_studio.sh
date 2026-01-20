#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# start_studio.sh – one-liner launcher for the whole Studio stack
# -----------------------------------------------------------------------------
# 1. Spins up the CrewAI Python service (port 8000)
# 2. Starts the Node/Express API & socket server (port 5001)
# 3. Boots the Next.js client (port 3000)
#
#  Each subprocess runs in the background; Ctrl-C from this script will
#  terminate the whole stack.
# -----------------------------------------------------------------------------
set -euo pipefail

ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# --------------------------  Helper  -----------------------------------------
function heading() {
  echo -e "\n\033[1;34m▶ $1\033[0m"
}

# ------------------  1. CrewAI Python side-car  ------------------------------
heading "Starting CrewAI side-car (FastAPI)"
cd "$ROOT_DIR/python/crewai_service"

if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install -q -r requirements.txt
# run in background with live reload
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
PY_PID=$!
deactivate

# ------------------  2. Node/Express back-end  ------------------------------
heading "Starting Node API server"
cd "$ROOT_DIR/server"

npm install --silent
export CREWAI_SERVICE_URL="http://localhost:8000"
PORT=${PORT:-5001}
NODE_ENV=development npm start &
SERVER_PID=$!

# ------------------  3. Next.js front-end  ----------------------------------
heading "Starting Next.js client (frontend)"
cd "$ROOT_DIR/client"

npm install --silent
npm run dev &
CLIENT_PID=$!

cd "$ROOT_DIR"

heading "All services launched"
echo "  • CrewAI service   → http://localhost:8000/docs"
echo "  • API server       → http://localhost:5001"
echo "  • Web client       → http://localhost:3000"

echo -e "\nPress Ctrl+C to stop everything.\n"

# Clean shutdown on CTRL-C
trap "echo -e '\nShutting down…'; kill $PY_PID $SERVER_PID $CLIENT_PID 2>/dev/null" INT TERM
wait 