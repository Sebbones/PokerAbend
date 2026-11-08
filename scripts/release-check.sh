#!/usr/bin/env bash
# Release-Check für den Spieleabend: prüft VOR dem Aufspielen die .env, das Docker-Image und die Sicherung und NACH dem Start den Healthcheck.
# Es wird nur geprüft und gelesen – nichts angelegt, geändert, gestartet oder gelöscht (kein pull, kein up, keine Schreibzugriffe;
# die Prüfung der Image-Version startet höchstens einen Wegwerf-Container mit --rm, abschaltbar mit RELEASE_CHECK_NO_RUN=1).
# Geheimnisse (Passwörter, Secrets) werden nie ausgegeben.
#
#   scripts/release-check.sh              # alles: vorher + nachher
#   scripts/release-check.sh vorher       # vor dem Aufspielen: .env, Image, Sicherung
#   scripts/release-check.sh nachher      # nach "docker compose up -d": Healthcheck und Version
#
# Einstellbar über Umgebungsvariablen (alle optional):
#   ENV_FILE=.env                      die zu prüfende Datei
#   BACKUP_DIR=/var/backups/spieleabend  Ordner mit spieleabend-*.tar.gz (wie scripts/backup.sh)
#   MAX_BACKUP_AGE_H=26                so alt darf die neueste Sicherung höchstens sein
#   HEALTH_URL=https://meine.domain/health   Standard: https://$DOMAIN/health aus der .env
#   EXPECTED_VERSION=3.0.0             Standard: "version" aus package.json im Repository
#   EXPECTED_COMMIT=abc1234            optional: Commit-Hash, den /health melden muss
#   HEALTH_WAIT_S=45                   so lange auf einen gesunden Start warten (nur "nachher")
#   COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml"
#   RELEASE_CHECK_SKIP_DOCKER=1        Docker-Prüfungen überspringen (z. B. auf einem Rechner ohne Docker)
#   RELEASE_CHECK_NO_RUN=1             keinen Wegwerf-Container zum Lesen der Image-Version starten
# Ende 0 = keine Fehler (Warnungen sind erlaubt), 1 = mindestens ein Fehler.
set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE="${1:-alles}"
case "$MODE" in alles|vorher|nachher) ;; -h|--help) sed -n '2,24p' "${BASH_SOURCE[0]}"; exit 0 ;; *) echo "Unbekannter Modus „$MODE“ (alles | vorher | nachher)" >&2; exit 2 ;; esac

ENV_FILE="${ENV_FILE:-$REPO/.env}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/spieleabend}"
MAX_BACKUP_AGE_H="${MAX_BACKUP_AGE_H:-26}"
HEALTH_WAIT_S="${HEALTH_WAIT_S:-45}"
COMPOSE_FILES="${COMPOSE_FILES:--f docker-compose.yml -f docker-compose.prod.yml}"

ERRORS=0; WARNINGS=0
ok()   { echo "  OK        $*"; }
warn() { echo "  WARNUNG   $*"; WARNINGS=$((WARNINGS + 1)); }
fail() { echo "  FEHLER    $*"; ERRORS=$((ERRORS + 1)); }
info() { echo "  ·         $*"; }
section() { echo; echo "== $* =="; }

# Wert einer Variablen aus der .env (ohne die Datei auszuführen: nur "NAME=Wert", Anführungszeichen und Zeilenende-Kommentare entfernt)
declare -A ENVV=()
load_env() {
  local line key val
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"
    [[ "$line" =~ ^[[:space:]]*(export[[:space:]]+)?([A-Za-z_][A-Za-z0-9_]*)[[:space:]]*=(.*)$ ]] || continue
    key="${BASH_REMATCH[2]}"; val="${BASH_REMATCH[3]}"
    val="${val#"${val%%[![:space:]]*}"}"
    if [[ "$val" =~ ^\"(.*)\"[[:space:]]*(#.*)?$ ]]; then val="${BASH_REMATCH[1]}"
    elif [[ "$val" =~ ^\'(.*)\'[[:space:]]*(#.*)?$ ]]; then val="${BASH_REMATCH[1]}"
    else val="${val%%[[:space:]]#*}"; val="${val%"${val##*[![:space:]]}"}"; fi
    ENVV["$key"]="$val"
  done < "$ENV_FILE"
}
v() { printf '%s' "${ENVV[$1]:-}"; }
has() { [ -n "$(v "$1")" ]; }

KNOWN_VARS="DOMAIN IMAGE SITE_PASSWORD TICKET_ADMIN_PASSWORD ADMIN_PASSWORD SESSION_SECRET PUBLIC_URL DISCORD_CLIENT_ID DISCORD_CLIENT_SECRET DISCORD_GUILD_ID DISCORD_ROLE_ID FEATURE_DISCORD FEATURE_RANKED FEATURE_CAMERA DISABLED_GAMES MAX_ROOMS CREATE_LIMIT API_LIMIT NEW_ACCOUNT_LIMIT MAX_CONN_PER_IP PLAYER_TIMEOUT_MIN UPDATE_ANNOUNCE_MIN UPDATE_DRAIN_MAX_MIN TRUST_PROXY PORT DATA_DIR"

check_env() {
  section ".env ($ENV_FILE)"
  if [ ! -f "$ENV_FILE" ]; then fail ".env nicht gefunden – aus .env.example kopieren und ausfüllen"; return; fi
  ok ".env vorhanden"
  load_env
  local perms; perms="$(stat -c '%a' "$ENV_FILE" 2>/dev/null || stat -f '%Lp' "$ENV_FILE" 2>/dev/null || echo '')"
  if [ -n "$perms" ] && [ "${perms: -1}" != "0" ]; then warn ".env ist für alle lesbar (Rechte $perms) – besser: chmod 600 .env"; fi
  if command -v git >/dev/null 2>&1 && git -C "$REPO" rev-parse --git-dir >/dev/null 2>&1 && [ "$(dirname "$(readlink -f "$ENV_FILE" 2>/dev/null || echo "$ENV_FILE")")" = "$REPO" ]; then
    if git -C "$REPO" ls-files --error-unmatch "$(basename "$ENV_FILE")" >/dev/null 2>&1; then fail ".env ist in Git eingecheckt – Secrets gehören nie ins Repository"; fi
  fi

  # Pflicht
  for name in DOMAIN IMAGE SITE_PASSWORD; do has "$name" && ok "$name gesetzt" || fail "$name fehlt (Pflicht)"; done
  if has SITE_PASSWORD; then
    local pw; pw="$(v SITE_PASSWORD)"
    [ "${#pw}" -ge 8 ] && ok "SITE_PASSWORD hat mindestens 8 Zeichen" || warn "SITE_PASSWORD ist sehr kurz (${#pw} Zeichen)"
    case "$pw" in changeme|passwort|password|geheim|test|1234|12345678) fail "SITE_PASSWORD ist ein Platzhalter" ;; esac
  fi
  if has DOMAIN; then
    local d; d="$(v DOMAIN)"
    [[ "$d" =~ ^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$ ]] && [[ "$d" == *.* || "$d" == localhost ]] && ok "DOMAIN sieht gültig aus ($d)" || fail "DOMAIN ist keine Domain ohne https:// und ohne Pfad ($d)"
  fi
  # Empfohlen
  has ADMIN_PASSWORD && ok "ADMIN_PASSWORD gesetzt (/admin ist an)" || warn "ADMIN_PASSWORD fehlt – /admin ist ausgeschaltet (keine Räume schließen, keine Funktionen umlegen)"
  has TICKET_ADMIN_PASSWORD && ok "TICKET_ADMIN_PASSWORD gesetzt" || info "TICKET_ADMIN_PASSWORD leer – Ticket-Verwaltung ausgeschaltet"
  if has ADMIN_PASSWORD && [ "$(v ADMIN_PASSWORD)" = "$(v SITE_PASSWORD)" ]; then warn "ADMIN_PASSWORD ist gleich SITE_PASSWORD – bitte ein eigenes wählen"; fi

  # Discord: ganz oder gar nicht
  local d1=0 d2=0 d3=0
  has DISCORD_CLIENT_ID && d1=1; has DISCORD_CLIENT_SECRET && d2=1; has PUBLIC_URL && d3=1
  if [ $((d2 + d3)) -eq 0 ]; then info "Discord nicht eingerichtet (kein Knopf, Routen 404)"
  elif [ $((d1 + d2 + d3)) -eq 3 ]; then
    ok "Discord: Client-ID, Secret und PUBLIC_URL sind gesetzt"
    local u; u="$(v PUBLIC_URL)"
    [[ "$u" =~ ^https://[^/]+$ ]] && ok "PUBLIC_URL ist https ohne Schrägstrich am Ende" || fail "PUBLIC_URL muss mit https:// beginnen und darf keinen Pfad/Schrägstrich am Ende haben ($u)"
    if has DOMAIN && [[ "$u" =~ ^https://[^/]+$ ]] && [ "${u#https://}" != "$(v DOMAIN)" ]; then warn "PUBLIC_URL (${u#https://}) und DOMAIN ($(v DOMAIN)) weichen ab – die Redirect-URI im Discord-Portal muss zu PUBLIC_URL passen"; fi
    [[ "$(v DISCORD_CLIENT_ID)" =~ ^[0-9]{5,25}$ ]] || fail "DISCORD_CLIENT_ID besteht nicht nur aus Ziffern"
  else fail "Discord unvollständig: DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET und PUBLIC_URL müssen zusammen gesetzt sein (oder alle leer)"; fi
  for name in DISCORD_GUILD_ID DISCORD_ROLE_ID; do
    if has "$name"; then [[ "$(v "$name")" =~ ^[0-9]{5,25}$ ]] && ok "$name sieht gültig aus" || fail "$name ist keine Discord-ID (nur Ziffern, 5–25 Stellen)"; fi
  done
  if has DISCORD_GUILD_ID && [ $((d1 + d2 + d3)) -ne 3 ]; then warn "DISCORD_GUILD_ID ohne vollständige Discord-Einrichtung hat keine Wirkung"; fi

  # Feature-Flags
  for name in FEATURE_DISCORD FEATURE_RANKED FEATURE_CAMERA; do
    if has "$name"; then
      case "$(v "$name" | tr 'A-Z' 'a-z')" in on|off|true|false|1|0|yes|no|ja|nein|an|aus) ok "$name=$(v "$name")" ;; *) fail "$name hat keinen gültigen Wert (on oder off): $(v "$name")" ;; esac
    fi
  done
  if has DISABLED_GAMES; then
    local bad="" g; for g in $(v DISABLED_GAMES | tr ',;' '  '); do [[ "$g" =~ ^[a-z0-9][a-z0-9-]{0,39}$ ]] || bad="$bad $g"; done
    [ -z "$bad" ] && ok "DISABLED_GAMES: $(v DISABLED_GAMES)" || fail "DISABLED_GAMES enthält ungültige Spiel-IDs:$bad (erlaubt: Kleinbuchstaben, Ziffern, Bindestrich)"
    if [ -f "$REPO/games/index.js" ]; then
      for g in $(v DISABLED_GAMES | tr ',;' '  '); do
        [ -d "$REPO/games/$g" ] || [ -d "$REPO/games/singleplayer" ] || warn "DISABLED_GAMES: „$g“ gibt es im Repository nicht"
      done
    fi
  fi

  # Zahlenwerte
  local n
  for n in MAX_ROOMS CREATE_LIMIT API_LIMIT NEW_ACCOUNT_LIMIT MAX_CONN_PER_IP PLAYER_TIMEOUT_MIN UPDATE_ANNOUNCE_MIN UPDATE_DRAIN_MAX_MIN; do
    if has "$n"; then [[ "$(v "$n")" =~ ^[0-9]+$ ]] && [ "$(v "$n")" -gt 0 ] && ok "$n=$(v "$n")" || fail "$n muss eine positive ganze Zahl sein ($(v "$n"))"; fi
  done
  if has TRUST_PROXY; then info "TRUST_PROXY steht in der .env – im Betrieb setzt docker-compose.prod.yml es auf 1"; fi
  if has PORT || has DATA_DIR; then warn "PORT/DATA_DIR in der .env: im Container sind 3000 und /app/data fest eingestellt – nicht ändern, wenn Volume und Traefik-Label dazu passen"; fi

  # Unbekannte Namen (Tippfehler fangen)
  local k unknown=""
  for k in "${!ENVV[@]}"; do case " $KNOWN_VARS " in *" $k "*) ;; *) unknown="$unknown $k" ;; esac; done
  [ -z "$unknown" ] && ok "keine unbekannten Variablen" || warn "unbekannte Variablen (Tippfehler?):$unknown"
}

docker_ok() { [ "${RELEASE_CHECK_SKIP_DOCKER:-}" != "1" ] && command -v docker >/dev/null 2>&1; }

check_image() {
  section "Docker-Image"
  if [ "${RELEASE_CHECK_SKIP_DOCKER:-}" = "1" ]; then info "übersprungen (RELEASE_CHECK_SKIP_DOCKER=1)"; return; fi
  if ! command -v docker >/dev/null 2>&1; then warn "docker nicht gefunden – Image-Prüfung übersprungen"; return; fi
  local ctx; ctx="$(docker context show 2>/dev/null || echo '?')"
  info "Docker-Kontext: $ctx"
  local image; image="$(v IMAGE)"
  if [ -z "$image" ]; then fail "IMAGE ist nicht gesetzt"; return; fi
  if [[ "$image" == *:latest || "$image" != *:* ]]; then warn "IMAGE zeigt auf :latest – für einen sicheren Rückweg besser eine feste Version eintragen (z. B. :3.0.0) und die alte notieren"; else ok "IMAGE hat eine feste Version ($image)"; fi
  if ! docker info >/dev/null 2>&1; then warn "Docker-Dienst nicht erreichbar – Image-Prüfung übersprungen"; return; fi
  if docker image inspect "$image" >/dev/null 2>&1; then
    local created commit
    created="$(docker image inspect --format '{{.Created}}' "$image" 2>/dev/null | cut -c1-19)"
    commit="$(docker image inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$image" 2>/dev/null | sed -n 's/^APP_COMMIT=//p' | head -n 1)"
    ok "Image lokal vorhanden (gebaut $created UTC, Commit ${commit:-unbekannt})"
    local expected; expected="${EXPECTED_VERSION:-$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "$REPO/package.json" 2>/dev/null | head -n 1)}"
    if [ "${RELEASE_CHECK_NO_RUN:-}" != "1" ] && [ -n "$expected" ]; then
      local inside; inside="$(docker run --rm --entrypoint node "$image" -p "require('/app/package.json').version" 2>/dev/null | tr -d '\r')"
      if [ -z "$inside" ]; then warn "Version im Image nicht lesbar"
      elif [ "$inside" = "$expected" ]; then ok "Version im Image: $inside (erwartet $expected)"
      else fail "Version im Image ist $inside, erwartet wird $expected – falsches oder altes Image?"; fi
    fi
    if [ -n "${EXPECTED_COMMIT:-}" ] && [ -n "$commit" ] && [[ "$commit" != "${EXPECTED_COMMIT}"* && "${EXPECTED_COMMIT}" != "$commit"* ]]; then fail "Commit im Image ($commit) passt nicht zu EXPECTED_COMMIT ($EXPECTED_COMMIT)"; fi
  else
    warn "Image $image ist lokal noch nicht vorhanden (es wird beim Aufspielen geladen) – die Version kann erst danach geprüft werden"
  fi
  # Die zusammengesetzte Compose-Konfiguration muss gültig sein (liest nur, startet nichts)
  if [ -f "$REPO/docker-compose.yml" ]; then
    # shellcheck disable=SC2086
    if (cd "$REPO" && docker compose --env-file "$ENV_FILE" $COMPOSE_FILES config -q >/dev/null 2>"${TMPDIR:-/tmp}/release-check-compose.$$"); then ok "Compose-Dateien sind gültig"
    else fail "docker compose config schlägt fehl: $(head -n 1 "${TMPDIR:-/tmp}/release-check-compose.$$" 2>/dev/null)"; fi
    rm -f "${TMPDIR:-/tmp}/release-check-compose.$$"
  fi
  if grep -q 'ports: !reset \[\]' "$REPO/docker-compose.prod.yml" 2>/dev/null; then ok "Produktiv-Compose veröffentlicht keinen Port (nur Traefik erreicht die App)"; else warn "docker-compose.prod.yml: kein 'ports: !reset []' gefunden – Port 3000 könnte ungeschützt offen sein"; fi
}

check_backup() {
  section "Sicherung ($BACKUP_DIR)"
  if [ ! -d "$BACKUP_DIR" ]; then fail "Sicherungsordner $BACKUP_DIR gibt es nicht – scripts/backup.sh einrichten und einmal laufen lassen"; return; fi
  local newest; newest="$(ls -1t "$BACKUP_DIR"/spieleabend-*.tar.gz 2>/dev/null | head -n 1 || true)"
  if [ -z "$newest" ]; then fail "Keine Sicherung (spieleabend-*.tar.gz) gefunden – vor dem Aufspielen scripts/backup.sh ausführen"; return; fi
  local size age_h; size="$(wc -c < "$newest" | tr -d ' ')"
  age_h=$(( ( $(date +%s) - $(stat -c '%Y' "$newest" 2>/dev/null || stat -f '%m' "$newest") ) / 3600 ))
  [ "$size" -gt 100 ] && ok "Neueste Sicherung: $(basename "$newest") ($size Bytes)" || fail "Neueste Sicherung ist leer oder winzig: $(basename "$newest")"
  [ "$age_h" -le "$MAX_BACKUP_AGE_H" ] && ok "Sicherung ist $age_h Stunden alt (erlaubt: $MAX_BACKUP_AGE_H)" || fail "Sicherung ist $age_h Stunden alt (erlaubt: $MAX_BACKUP_AGE_H) – vor dem Aufspielen eine frische ziehen"
  if tar tzf - < "$newest" >/dev/null 2>&1; then
    ok "Archiv lässt sich lesen"
    tar tzf - < "$newest" 2>/dev/null | grep -qE '(^|/)(rooms|leaderboard|accounts)\.json$' && ok "Archiv enthält Datendateien (rooms/leaderboard/accounts)" || warn "Im Archiv fehlen rooms.json, leaderboard.json und accounts.json – frische Installation oder leeres Volume?"
    tar tzf - < "$newest" 2>/dev/null | grep -qE '(^|/)secret\.key$' && ok "secret.key ist gesichert (Cookies bleiben nach einer Wiederherstellung gültig)" || info "secret.key nicht im Archiv (gesetzt SESSION_SECRET? sonst nach Wiederherstellung neue Anmeldung nötig)"
  else fail "Archiv $(basename "$newest") ist beschädigt (tar kann es nicht lesen)"; fi
  info "Ob sich die Sicherung einspielen lässt, prüft scripts/restore-test.sh (nicht Teil dieses Checks)"
}

http_get() { # url -> Body auf stdout, Exit 0 bei HTTP 2xx
  if command -v curl >/dev/null 2>&1; then curl -fsS --max-time 8 "$1" 2>/dev/null
  elif command -v wget >/dev/null 2>&1; then wget -qO- --timeout=8 "$1" 2>/dev/null
  else return 127; fi
}

check_health() { # $1 = streng (nachher): muss gesund und in der erwarteten Version laufen
  local strict="$1"
  section "Healthcheck ($([ "$strict" = 1 ] && echo nachher || echo 'aktueller Stand'))"
  local url="${HEALTH_URL:-}"
  if [ -z "$url" ]; then
    if [ -f "$ENV_FILE" ]; then [ ${#ENVV[@]} -gt 0 ] || load_env; fi
    has DOMAIN && url="https://$(v DOMAIN)/health" || { if [ "$strict" = 1 ]; then fail "Weder HEALTH_URL noch DOMAIN bekannt"; else warn "Keine Health-URL bekannt"; fi; return; }
  fi
  info "URL: $url"
  local expected; expected="${EXPECTED_VERSION:-$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "$REPO/package.json" 2>/dev/null | head -n 1)}"
  local waited=0 body=""
  while :; do
    body="$(http_get "$url" || true)"
    [[ "$body" == *'"ok":true'* ]] && break
    [ "$strict" = 1 ] && [ "$waited" -lt "$HEALTH_WAIT_S" ] || break
    sleep 3; waited=$((waited + 3))
  done
  if [[ "$body" != *'"ok":true'* ]]; then
    if [ "$strict" = 1 ]; then fail "Kein gesunder /health nach ${waited}s – docker compose logs poker ansehen"; else warn "/health antwortet derzeit nicht (läuft der Server schon?)"; fi
    return
  fi
  ok "/health antwortet ok"
  local ver commit; ver="$(printf '%s' "$body" | sed -n 's/.*"version":"\([^"]*\)".*/\1/p')"; commit="$(printf '%s' "$body" | sed -n 's/.*"commit":"\([^"]*\)".*/\1/p')"
  info "läuft: Version ${ver:-?}, Commit ${commit:-?}"
  if [ -n "$expected" ] && [ -n "$ver" ]; then
    if [ "$ver" = "$expected" ]; then ok "Version $ver entspricht der erwarteten"
    elif [ "$strict" = 1 ]; then fail "Es läuft Version $ver, erwartet wird $expected"
    else info "Noch die alte Version ($ver); erwartet nach dem Aufspielen: $expected"; fi
  fi
  if [ -n "${EXPECTED_COMMIT:-}" ] && [ -n "$commit" ] && [[ "$commit" != "${EXPECTED_COMMIT}"* && "${EXPECTED_COMMIT}" != "$commit"* ]]; then
    if [ "$strict" = 1 ]; then fail "Commit $commit passt nicht zu EXPECTED_COMMIT ($EXPECTED_COMMIT)"; else info "Commit $commit (erwartet nach dem Aufspielen: $EXPECTED_COMMIT)"; fi
  fi
  # Container-Gesundheit laut Docker (HEALTHCHECK im Image)
  if [ "$strict" = 1 ] && docker_ok && docker info >/dev/null 2>&1; then
    local cid state
    # shellcheck disable=SC2086
    cid="$(cd "$REPO" && docker compose --env-file "$ENV_FILE" $COMPOSE_FILES ps -q poker 2>/dev/null | head -n 1)"
    if [ -n "$cid" ]; then
      state="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}ohne-healthcheck{{end}}' "$cid" 2>/dev/null)"
      case "$state" in healthy) ok "Container meldet healthy" ;; starting) warn "Container meldet noch starting – in einer Minute erneut prüfen" ;; *) fail "Container-Gesundheit: $state" ;; esac
    else info "Kein Container „poker“ über Compose gefunden (anderer Projektordner?)"; fi
  fi
}

echo "Release-Check Spieleabend ($MODE) – es wird nur gelesen, nichts verändert."
case "$MODE" in
  alles)   check_env; check_image; check_backup; check_health 1 ;;
  vorher)  check_env; check_image; check_backup; check_health 0 ;;
  nachher) [ -f "$ENV_FILE" ] && load_env; check_health 1 ;;
esac

echo
if [ "$ERRORS" -gt 0 ]; then echo "Ergebnis: $ERRORS Fehler, $WARNINGS Warnung(en) – NICHT aufspielen, bevor die Fehler behoben sind."; exit 1; fi
echo "Ergebnis: keine Fehler, $WARNINGS Warnung(en)."
exit 0
