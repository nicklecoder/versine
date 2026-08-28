#!/usr/bin/env bash
#
# Bring the running instance up to date with the git remote, safely.
#
# Run at boot and on a timer. The whole thing is built around one priority:
# a kid sitting down to practise must find a working app. An update that
# cannot be done safely is an update that does not happen -- this script
# fails open, leaving the previous version serving, and says why.
#
# Order matters:
#   1. back up the database BEFORE any new code can migrate it
#   2. fast-forward only, so local edits are never clobbered
#   3. start the new version and prove it healthy
#   4. if it is not healthy, put the old version back
#
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BRANCH="${VERSINE_BRANCH:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo master)}"
PORT="${VERSINE_PORT:-8000}"
HEALTH="http://127.0.0.1:${PORT}/api/health"
HEALTH_TIMEOUT="${VERSINE_HEALTH_TIMEOUT:-90}"
KEEP_BACKUPS="${VERSINE_KEEP_BACKUPS:-10}"
DB="$ROOT/data/progress.db"

# git does not track empty directories, so a fresh clone may not have one.
mkdir -p "$ROOT/data"

log() { printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
die() { log "ERROR: $*"; exit 1; }

# ── One at a time ────────────────────────────────────────────────────────────
# Boot and the timer can fire together; two concurrent rebuilds on the same
# checkout would interleave badly.
exec 9>"$ROOT/.update.lock"
flock -n 9 || { log "another update is already running; nothing to do"; exit 0; }

compose() { docker compose "$@"; }

# The commit this run intends to serve, exported so that every compose call --
# including the exit trap's -- agrees on it. Compose treats a changed
# environment as a changed container and recreates it, which is what makes an
# update actually take effect: web/ and server/ are bind-mounted, so the files
# change on disk the moment we pull, but the running Python process has already
# imported them and will not notice until it is replaced.
export VERSINE_VERSION="$(git rev-parse --short=8 HEAD 2>/dev/null || echo dev)"

# ── Always end with something serving ────────────────────────────────────────
# Whatever happens below, the app comes up. If the update failed we would
# rather run yesterday's version than nothing at all.
ensure_running() {
  # Only step in when nothing is serving. Without this check the trap fires
  # after a successful update and recreates the container a second time,
  # costing another restart and overwriting the version stamp.
  if [ -n "$(compose ps --status running --quiet 2>/dev/null)" ]; then return; fi
  log "nothing is serving; starting the container"
  compose up -d >/dev/null 2>&1 || log "WARNING: could not start the container"
}
trap ensure_running EXIT

wait_healthy() {
  local deadline=$(( SECONDS + HEALTH_TIMEOUT ))
  while (( SECONDS < deadline )); do
    if curl -fsS --max-time 5 "$HEALTH" >/dev/null 2>&1; then return 0; fi
    sleep 2
  done
  return 1
}

# ── Library validity ─────────────────────────────────────────────────────────
# The problem libraries are the catalogue. Their rows are meant to be corrected
# by hand -- fixing a bad problem in place beats debugging the generator that
# produced it -- so this deliberately does not check that a library still
# matches its generator. A hand-fixed library is supposed to have diverged.
#
# What it does check is that every row is still usable, because a malformed one
# does not crash: it serves a student a broken problem, which is the kind of
# fault that runs for weeks unnoticed.
libraries_valid() {
  local checker="$ROOT/scripts/check-library.py"
  # A version predating the libraries is not invalid, just older.
  [ -f "$checker" ] || { log "no library checker in this version; skipping validation"; return 0; }
  python3 "$checker" 2>&1 | while IFS= read -r line; do log "  $line"; done
  return "${PIPESTATUS[0]}"
}

# ── 1. Back up the database ──────────────────────────────────────────────────
# Before anything else, and before any new code gets a chance to run its
# migrations. sqlite's own backup API rather than cp, because the database
# runs in WAL mode and copying the file alone can capture a torn state.
backup_db() {
  [ -f "$DB" ] || { log "no database yet; nothing to back up"; return 0; }
  # The commit being left behind goes in the name: seconds alone collide when
  # two updates land close together, and "which version made this" is exactly
  # what you want to know when reaching for a backup.
  local dest="$ROOT/data/progress.backup-$(date '+%Y%m%d-%H%M%S')-pre-${OLD_REV:0:8}.db"
  python3 - "$DB" "$dest" <<'PY' || return 1
import sqlite3, sys
src, dest = sys.argv[1], sys.argv[2]
s = sqlite3.connect(f"file:{src}?mode=ro", uri=True)
d = sqlite3.connect(dest)
with d:
    s.backup(d)
d.close(); s.close()
PY
  log "database backed up to $(basename "$dest")"
}

prune_backups() {
  local old
  old=$(ls -1t "$ROOT"/data/progress.backup-*.db 2>/dev/null | tail -n +$((KEEP_BACKUPS + 1)))
  [ -n "$old" ] || return 0
  echo "$old" | xargs -r rm -f
  log "pruned $(echo "$old" | wc -l) old backup(s), keeping $KEEP_BACKUPS"
}

# ── 2. Fetch, and decide whether there is anything to do ─────────────────────
if ! git remote get-url origin >/dev/null 2>&1; then
  log "no git remote configured; starting the current checkout unchanged"
  exit 0
fi

OLD_REV="$(git rev-parse HEAD 2>/dev/null)" || die "repository has no commits yet"

if ! git fetch --quiet origin "$BRANCH" 2>/dev/null; then
  log "could not reach the remote; starting the current version unchanged"
  exit 0
fi

NEW_REV="$(git rev-parse "origin/$BRANCH")"
if [ "$OLD_REV" = "$NEW_REV" ]; then
  log "already up to date at ${OLD_REV:0:8}"
  exit 0
fi

# Uncommitted work on the server means somebody was editing in place. Pulling
# over it would either fail halfway or silently discard their work.
if ! git diff --quiet || ! git diff --cached --quiet; then
  log "working tree has uncommitted changes; refusing to update over them"
  log "  commit or stash them on the server, then re-run this script"
  exit 0
fi

log "updating ${OLD_REV:0:8} -> ${NEW_REV:0:8} on $BRANCH"

backup_db || die "database backup failed; refusing to update"

# --ff-only: if the branches have diverged this stops rather than merging.
if ! git merge --ff-only "origin/$BRANCH" >/dev/null 2>&1; then
  log "cannot fast-forward (the branches have diverged); leaving the checkout alone"
  exit 0
fi

# ── 3. Refuse a version whose problem libraries are broken ───────────────────
if ! libraries_valid; then
  log "the problem libraries in ${NEW_REV:0:8} are not valid"
  log "  refusing to deploy; staying on ${OLD_REV:0:8}"
  git reset --hard "$OLD_REV" >/dev/null 2>&1 || log "WARNING: could not reset to $OLD_REV"
  exit 1
fi

# ── 4. Rebuild only when the image actually changed ──────────────────────────
# web/ and server/ are bind-mounted, so most updates need no rebuild at all --
# only a dependency or image change does.
BUILD_ARGS=()
if git diff --name-only "$OLD_REV" "$NEW_REV" | grep -qE '^(Dockerfile|requirements\.txt|docker-compose\.yml)$'; then
  log "image inputs changed; rebuilding"
  BUILD_ARGS=(--build)
fi

VERSINE_VERSION="${NEW_REV:0:8}"
compose up -d "${BUILD_ARGS[@]}" || log "compose failed to start the new version"

# ── 5. Prove it works, or put the old one back ───────────────────────────────
if wait_healthy; then
  log "healthy on ${NEW_REV:0:8}"
  prune_backups
  exit 0
fi

log "new version did not become healthy within ${HEALTH_TIMEOUT}s; rolling back"
git reset --hard "$OLD_REV" >/dev/null 2>&1 || log "WARNING: could not reset to $OLD_REV"
VERSINE_VERSION="${OLD_REV:0:8}"
compose up -d "${BUILD_ARGS[@]}" >/dev/null 2>&1

if wait_healthy; then
  log "rolled back to ${OLD_REV:0:8} and healthy again"
else
  log "ERROR: rolled back to ${OLD_REV:0:8} but it is still not healthy -- needs a look"
fi
exit 1
