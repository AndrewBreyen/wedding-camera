#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENT_DIR="$ROOT_DIR/client"
URL="http://localhost:5173"

if ! command -v npm >/dev/null 2>&1; then
  echo "Node.js and npm are required. Install Node.js before launching the camera." >&2
  exit 1
fi

if [[ ! -x "$CLIENT_DIR/node_modules/.bin/vite" ]]; then
  echo "Client dependencies are missing. Run 'npm ci --prefix client' first." >&2
  exit 1
fi

if [[ ! -f "$CLIENT_DIR/.env" ]] || ! grep -Eq '^VITE_API_URL=https?://[^[:space:]]+' "$CLIENT_DIR/.env"; then
  echo "The camera API is not configured. Set VITE_API_URL in client/.env first." >&2
  exit 1
fi

echo "Starting the wedding camera at $URL"
echo "The API URL is loaded from client/.env. Press Ctrl-C to stop."
echo "Camera access works on localhost. Phones on your Wi-Fi need HTTPS."
cd "$CLIENT_DIR"
exec npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
