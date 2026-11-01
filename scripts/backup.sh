#!/usr/bin/env bash
# Sichert das Daten-Volume des Spieleabends (Tische, Verläufe, Bestenliste, Schlüssel) als .tar.gz
# und löscht Sicherungen, die älter als 14 Tage sind.
#
#   scripts/backup.sh                    # Volume wird automatisch gefunden, Ziel /var/backups/spieleabend
#   BACKUP_DIR=/srv/backup scripts/backup.sh
#   VOLUME=webseite_poker_poker-data KEEP_DAYS=30 scripts/backup.sh
#
# Optional zweites Ziel außer Haus (aus, solange keine der beiden Variablen gesetzt ist):
#   BACKUP_RSYNC_TARGET=user@host:/pfad/spieleabend/     # rsync über SSH
#   BACKUP_RCLONE_TARGET=meinremote:spieleabend          # rclone (S3, WebDAV, Google Drive …)
# Scheitert die Kopie, endet das Skript mit Fehler – die lokale Sicherung bleibt trotzdem erhalten.
#
# Ob sich eine Sicherung wirklich wiederherstellen lässt, prüft scripts/restore-test.sh.
#
# Täglich per Cronjob (crontab -e), z. B. um 4:30 Uhr:
#   30 4 * * * /pfad/zum/repo/scripts/backup.sh >> /var/log/spieleabend-backup.log 2>&1
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/spieleabend}"
KEEP_DAYS="${KEEP_DAYS:-14}"
VOLUME="${VOLUME:-}"

# Docker Compose hängt den Projektnamen vor das Volume (z. B. „webseite_poker_poker-data“)
if [ -z "$VOLUME" ]; then
  VOLUME="$(docker volume ls --format '{{.Name}}' | grep -E '(^|_)poker-data$' | head -n 1 || true)"
fi
if [ -z "$VOLUME" ]; then
  echo "$(date '+%F %T') FEHLER: Kein Volume „…poker-data“ gefunden. Mit VOLUME=name angeben." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
FILE="spieleabend-$(date '+%F_%H%M').tar.gz"

# Sichern über einen kurzlebigen Container: Volume nur lesend einhängen, Archiv ins Zielverzeichnis
docker run --rm \
  -v "$VOLUME":/data:ro \
  -v "$BACKUP_DIR":/backup \
  alpine:3 \
  tar czf "/backup/$FILE" -C /data .

# Leeres oder kaputtes Archiv? Dann lieber laut scheitern als still nichts sichern
if ! tar tzf "$BACKUP_DIR/$FILE" > /dev/null 2>&1; then
  echo "$(date '+%F %T') FEHLER: Archiv $FILE ist nicht lesbar." >&2
  exit 1
fi

echo "$(date '+%F %T') Gesichert: $BACKUP_DIR/$FILE ($(du -h "$BACKUP_DIR/$FILE" | cut -f1)) aus Volume $VOLUME"

# Alte Sicherungen löschen (nur unsere Dateien)
find "$BACKUP_DIR" -maxdepth 1 -name 'spieleabend-*.tar.gz' -type f -mtime +"$KEEP_DAYS" -print -delete \
  | sed "s/^/$(date '+%F %T') Gelöscht (älter als $KEEP_DAYS Tage): /"

# Optional: Kopie auf ein zweites Ziel
COPY_FAILED=0
if [ -n "${BACKUP_RSYNC_TARGET:-}" ]; then
  if command -v rsync > /dev/null 2>&1 && rsync -a "$BACKUP_DIR/$FILE" "$BACKUP_RSYNC_TARGET"; then
    echo "$(date '+%F %T') Kopiert (rsync): $BACKUP_RSYNC_TARGET"
  else
    echo "$(date '+%F %T') FEHLER: rsync nach $BACKUP_RSYNC_TARGET ist fehlgeschlagen." >&2
    COPY_FAILED=1
  fi
fi
if [ -n "${BACKUP_RCLONE_TARGET:-}" ]; then
  if command -v rclone > /dev/null 2>&1 && rclone copy "$BACKUP_DIR/$FILE" "$BACKUP_RCLONE_TARGET"; then
    echo "$(date '+%F %T') Kopiert (rclone): $BACKUP_RCLONE_TARGET"
  else
    echo "$(date '+%F %T') FEHLER: rclone nach $BACKUP_RCLONE_TARGET ist fehlgeschlagen." >&2
    COPY_FAILED=1
  fi
fi
exit "$COPY_FAILED"
