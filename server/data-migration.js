// Sicherung vor der Umstellung auf Konto-IDs (V2-01): kopiert die vorhandenen Datendateien einmalig nach backups/pre-v2-01/.
// Es wird nie etwas gelöscht oder überschrieben; existiert der Ordner schon, passiert nichts.
// Rückfall: Server beenden, Dateien aus dem Ordner zurückkopieren, alte Version starten (siehe docs/roadmap/V2-00_BESTANDSAUFNAHME.md).
import { copyFileSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';

export const BACKUP_FILES = ['leaderboard.json', 'rooms.json', 'tickets.json', 'evening-plans.json', 'evening-reviews.json', 'monopoly-boards.json', 'admin-log.json'];
export const BACKUP_NAME = 'pre-v2-01';

export function backupBeforeIdentityMigration(dataDir) {
  const target = join(dataDir, 'backups', BACKUP_NAME);
  if (existsSync(target)) return { created: false, files: readdirSync(target) };
  const present = BACKUP_FILES.filter((name) => existsSync(join(dataDir, name)));
  if (!present.length) return { created: false, files: [] }; // frische Installation: nichts zu sichern
  // Erst in einen Zwischenordner, dann umbenennen: ein halber Ordner gilt nie als fertige Sicherung
  const temp = `${target}.tmp`;
  rmSync(temp, { recursive: true, force: true }); // Rest eines abgebrochenen Versuchs
  mkdirSync(temp, { recursive: true });
  for (const name of present) copyFileSync(join(dataDir, name), join(temp, name));
  renameSync(temp, target);
  return { created: true, files: present, target };
}
