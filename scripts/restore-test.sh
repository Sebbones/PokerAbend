#!/usr/bin/env bash
# Prüft, ob sich eine Sicherung wirklich wiederherstellen lässt: entpackt das neueste Backup in einen
# temporären Ordner, startet den Server mit DATA_DIR darauf, prüft /health sowie das Laden von Bestenliste,
# Tickets und Tischen und räumt danach alles wieder auf. Die echten Daten werden nie angefasst.
#
#   scripts/restore-test.sh                       # neuestes Backup aus /var/backups/spieleabend
#   BACKUP_DIR=/srv/backup scripts/restore-test.sh
#   scripts/restore-test.sh /pfad/spieleabend-2026-11-01_0430.tar.gz
#
# Läuft aus dem Repository (braucht Node 20+ und tar). Gut als wöchentlicher Cronjob nach dem Backup:
#   0 5 * * 0 /pfad/zum/repo/scripts/restore-test.sh >> /var/log/spieleabend-restore-test.log 2>&1
# Ende 0 = alles geprüft, sonst Fehler (die Meldung steht auf stderr).
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/spieleabend}"
log() { echo "$(date '+%F %T') $*"; }
fail() { echo "$(date '+%F %T') FEHLER: $*" >&2; exit 1; }

ARCHIVE="${1:-}"
if [ -z "$ARCHIVE" ]; then
  ARCHIVE="$(ls -1t "$BACKUP_DIR"/spieleabend-*.tar.gz 2>/dev/null | head -n 1 || true)"
  [ -n "$ARCHIVE" ] || fail "Kein Backup (spieleabend-*.tar.gz) in $BACKUP_DIR gefunden."
fi
[ -f "$ARCHIVE" ] || fail "Backup $ARCHIVE gibt es nicht."

WORK="$(mktemp -d)"
SERVER_PID=""
cleanup() {
  if [ -n "$SERVER_PID" ]; then kill "$SERVER_PID" 2> /dev/null || true; wait "$SERVER_PID" 2> /dev/null || true; fi
  rm -rf "$WORK"
}
trap cleanup EXIT

# Entpacken über das Verzeichnis des Archivs: tar deutet „C:/…“ sonst als Rechnernamen (Windows/Git Bash)
log "Prüfe $ARCHIVE"
ARCHIVE_DIR="$(cd "$(dirname "$ARCHIVE")" && pwd)"
ARCHIVE_NAME="$(basename "$ARCHIVE")"
mkdir -p "$WORK/data"
(cd "$ARCHIVE_DIR" && tar xzf "$ARCHIVE_NAME" -C "$WORK/data") || fail "Das Archiv lässt sich nicht entpacken."
[ -n "$(ls -A "$WORK/data")" ] || fail "Das Archiv ist leer."

# Node versteht unter Windows keine /tmp-Pfade
native() { if command -v cygpath > /dev/null 2>&1; then cygpath -m "$1"; else echo "$1"; fi; }
DATA_DIR="$(native "$WORK/data")"

PORT="$(cd "$REPO" && node -e "const s=require('net').createServer().listen(0,()=>{console.log(s.address().port);s.close()})")"
log "Starte Server mit den wiederhergestellten Daten auf Port $PORT"
(cd "$REPO" && POKER_NO_DOTENV=1 PORT="$PORT" DATA_DIR="$DATA_DIR" SITE_PASSWORD="" ADMIN_PASSWORD="" TICKET_ADMIN_PASSWORD="" \
  exec node server/index.js) > "$WORK/server.log" 2>&1 &
SERVER_PID=$!

get() { node -e "
fetch('http://127.0.0.1:$PORT$1').then(async (r) => { const t = await r.text(); if (!r.ok) { console.error(r.status, t.slice(0, 200)); process.exit(2); } process.stdout.write(t); }).catch((e) => { console.error(e.message); process.exit(3); });
"; }

for _ in $(seq 1 60); do
  if get /health > "$WORK/health.json" 2> /dev/null; then break; fi
  kill -0 "$SERVER_PID" 2> /dev/null || { cat "$WORK/server.log" >&2; fail "Der Server ist beim Start abgestürzt."; }
  sleep 0.5
done
node -e "const h=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')); if(!h.ok) process.exit(1); console.log(h.version)" "$WORK/health.json" > "$WORK/version.txt" || { cat "$WORK/server.log" >&2; fail "/health antwortet nicht in Ordnung."; }
log "/health ok, Version $(cat "$WORK/version.txt")"

# Bestenliste
if [ -f "$WORK/data/leaderboard.json" ]; then
  get "/api/leaderboard?game=poker&period=all" > "$WORK/lb.json" || fail "Bestenliste lässt sich nicht laden."
  node -e "const d=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')); if(!Array.isArray(d.rows)) process.exit(1)" "$WORK/lb.json" || fail "Bestenliste hat ein unerwartetes Format."
  log "Bestenliste geladen"
else
  log "Hinweis: Das Backup enthält keine leaderboard.json (noch keine Ergebnisse?)"
fi

# Tickets
if [ -f "$WORK/data/tickets.json" ]; then
  get "/api/tickets" > "$WORK/tickets.json" || fail "Tickets lassen sich nicht laden."
  TICKETS="$(node -e "const d=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')); if(!d.tickets) process.exit(1); console.log(d.counts?.total ?? d.total)" "$WORK/tickets.json")" || fail "Tickets haben ein unerwartetes Format."
  log "Tickets geladen ($TICKETS)"
else
  log "Hinweis: Das Backup enthält keine tickets.json (noch keine Tickets?)"
fi

# Tische
if [ -f "$WORK/data/rooms.json" ]; then
  EXPECTED="$(node -e "const d=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')); console.log(Array.isArray(d)?d.length:-1)" "$WORK/data/rooms.json")" || fail "rooms.json ist kein gültiges JSON."
  [ "$EXPECTED" -ge 0 ] || fail "rooms.json hat ein unerwartetes Format."
  if [ "$EXPECTED" -gt 0 ]; then
    grep -q "$EXPECTED Tisch(e) wiederhergestellt" "$WORK/server.log" || { cat "$WORK/server.log" >&2; fail "Nicht alle $EXPECTED gesicherten Tische wurden geladen."; }
  fi
  log "Tische geladen ($EXPECTED)"
else
  log "Hinweis: Das Backup enthält keine rooms.json (keine offenen Tische)"
fi

# Meldungen des Servers, die auf kaputte Daten hindeuten
if grep -Eq "Laden fehlgeschlagen|nicht lesbar|konnten nicht geladen" "$WORK/server.log"; then
  cat "$WORK/server.log" >&2
  fail "Der Server meldet beim Laden Probleme mit den Daten."
fi

log "OK: Die Sicherung $ARCHIVE_NAME lässt sich wiederherstellen."
