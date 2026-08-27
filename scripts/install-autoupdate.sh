#!/usr/bin/env bash
#
# Install the boot-and-nightly auto-update timer. Run once, on the server.
# Needs sudo only to write into /etc/systemd/system.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
USER_NAME="$(id -un)"
UNIT_DIR=/etc/systemd/system

ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
bad()  { printf '  \033[31m✗\033[0m %s\n' "$*"; }

echo "Checking prerequisites"

fatal=0
command -v docker >/dev/null || { bad "docker is not installed"; fatal=1; }
docker compose version >/dev/null 2>&1 || { bad "the docker compose plugin is missing"; fatal=1; }
id -nG | tr ' ' '\n' | grep -qx docker \
  && ok "$USER_NAME can talk to docker" \
  || { bad "$USER_NAME is not in the docker group: sudo usermod -aG docker $USER_NAME"; fatal=1; }
systemctl is-enabled --quiet docker \
  && ok "docker starts at boot" \
  || { bad "docker is not enabled at boot: sudo systemctl enable --now docker"; fatal=1; }

# Not fatal -- the update script handles a missing remote by leaving the
# checkout alone -- but without one there is nothing to update from.
if git -C "$ROOT" remote get-url origin >/dev/null 2>&1; then
  ok "remote: $(git -C "$ROOT" remote get-url origin)"
else
  warn "no git remote named 'origin'; the timer will install but find nothing to pull"
  warn "  add one with: git -C $ROOT remote add origin <url>"
fi

git -C "$ROOT" rev-parse HEAD >/dev/null 2>&1 \
  && ok "branch $(git -C "$ROOT" rev-parse --abbrev-ref HEAD) at $(git -C "$ROOT" rev-parse --short HEAD)" \
  || warn "the repository has no commits yet; commit and push before this can do anything"

[ "$fatal" = 0 ] || { echo; echo "Fix the above, then run this again."; exit 1; }

echo
echo "Installing units into $UNIT_DIR"
for unit in versine-update.service versine-update.timer; do
  sed -e "s#__ROOT__#$ROOT#g" -e "s#__USER__#$USER_NAME#g" \
    "$ROOT/scripts/systemd/$unit" | sudo tee "$UNIT_DIR/$unit" >/dev/null
  ok "$unit"
done

sudo systemctl daemon-reload
sudo systemctl enable --now versine-update.timer
ok "timer enabled: boot + 04:30 nightly"

echo
systemctl list-timers versine-update.timer --no-pager | head -3
echo
echo "Run one now with:   sudo systemctl start versine-update.service"
echo "Watch it with:      journalctl -u versine-update.service -f"
