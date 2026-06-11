#!/usr/bin/env bash
# Double-click to (re)launch the scroll-cinematic demo on localhost.
# Edit PORT and SITE_NAME for your project.
PORT=8137
SITE_NAME="AlgoXperts 3D Scroll"

cd "$(dirname "$0")" || exit 1

# Free the port if something is already on it.
if command -v lsof >/dev/null 2>&1; then
  PID="$(lsof -ti tcp:$PORT 2>/dev/null || true)"
  [ -n "$PID" ] && kill "$PID" 2>/dev/null || true
fi

echo "Serving $SITE_NAME on http://localhost:$PORT"
URL="http://localhost:$PORT"

# Open the browser shortly after the server starts.
( sleep 1
  if command -v open >/dev/null 2>&1; then open "$URL"
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL"
  fi ) &

python3 -m http.server "$PORT"
