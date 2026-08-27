#!/usr/bin/env bash
# Local development without Docker: auto-reloads on save.
set -e
cd "$(dirname "$0")"
[ -d .venv ] || python3 -m venv .venv
./.venv/bin/pip install -q -r requirements.txt
cd server
exec ../.venv/bin/uvicorn app:app --reload --host 0.0.0.0 --port "${1:-8000}"
