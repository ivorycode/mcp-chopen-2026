#!/bin/sh
# Rohe HTTP-Requests nach MCP 2026-07-28 gegen den laufenden Server.
# Das Skript gibt vor jeder Antwort den kompletten Request aus: Methode, URL,
# alle Header und den JSON-Body.
#
# Es gibt keinen initialize-Handshake und keine Session: Jeder Request ist
# vollständig, trägt den _meta-Envelope (Protokollversion, Client-Capabilities)
# und die Pflicht-Header Mcp-Method (und Mcp-Name bei name/uri-Parametern).
#
# Protokoll-Facts, die man an der Ausgabe sieht:
#
# * Alles ist POST. MCP kennt keine REST-artigen Pfade und keine GET/PUT/DELETE-
#   Semantik: Jeder Aufruf geht als HTTP POST an denselben Endpoint (/mcp).
#   Was geschehen soll, steht im Body (`method`) und im Header `Mcp-Method`,
#   nicht in HTTP-Verb und URL. HTTP ist reiner Transport.
#
# * JSON-RPC 2.0 ist das Nachrichtenformat im Body. JSON-RPC ist ein sehr
#   schlankes, transportunabhängiges Protokoll für entfernte Methodenaufrufe:
#   Ein Request ist ein JSON-Objekt mit
#     - "jsonrpc": "2.0"  Versionskennung des Formats
#     - "method"          Name der aufgerufenen Methode, z. B. "tools/call"
#     - "params"          Argumente der Methode
#     - "id"              frei gewählte Nummer/ID des Aufrufs
#   Die Antwort trägt dieselbe "id" zurück und enthält entweder "result" oder
#   "error" mit numerischem Fehlercode (siehe Request 6: -32020). Über die "id"
#   lassen sich Antworten den Aufrufen zuordnen, auch wenn mehrere gleichzeitig
#   unterwegs sind. Ein Request ohne "id" ist eine Notification: keine Antwort.
#
# Voraussetzung: `npm run dev` läuft (Port 3040). Optional: jq für lesbare Ausgabe.

URL="${1:-http://localhost:3040/mcp}"
META='"_meta":{"io.modelcontextprotocol/protocolVersion":"2026-07-28","io.modelcontextprotocol/clientCapabilities":{"elicitation":{}}}'

# Gibt JSON lesbar aus. Der Server antwortet je nach Protokollversion als
# reines JSON oder als SSE-Stream (Content-Type: text/event-stream, siehe
# Request 7). Ein SSE-Stream besteht aus Zeilen wie "event: message" und
# "data: {...}"; hier interessiert nur die JSON-Nutzlast der data:-Zeilen.
pretty() {
  OUT=$(cat | tr -d '\r')
  if printf '%s\n' "$OUT" | grep -q '^data: '; then
    OUT=$(printf '%s\n' "$OUT" | sed -n 's/^data: //p')
  fi
  if command -v jq >/dev/null 2>&1; then
    printf '%s\n' "$OUT" | jq . 2>/dev/null || printf '%s\n' "$OUT"
  else
    printf '%s\n' "$OUT"
  fi
}

# Gibt den kompletten Request aus und schickt ihn ab.
# $1 = JSON-Body, danach die curl-Header-Argumente (-H "Name: Wert" ...)
send() {
  BODY="$1"; shift
  echo "--- Request ---"
  echo "POST $URL"
  for ARG in "$@"; do
    case "$ARG" in -H) continue ;; esac
    echo "$ARG"
  done
  echo
  printf '%s' "$BODY" | pretty
  echo "--- Response ---"
  curl -s -X POST "$URL" "$@" -d "$BODY" | pretty
  echo
}

# MCP-Request mit den Pflicht-Headern.
# $1 = Methode, $2 = JSON-Body, $3 = optionaler Mcp-Name
post() {
  METHOD="$1"; BODY="$2"; NAME="$3"
  set -- -H 'Content-Type: application/json' \
         -H 'Accept: application/json, text/event-stream' \
         -H 'MCP-Protocol-Version: 2026-07-28' \
         -H "Mcp-Method: $METHOD"
  if [ -n "$NAME" ]; then set -- "$@" -H "Mcp-Name: $NAME"; fi
  send "$BODY" "$@"
}

echo "### 1. server/discover (liefert Capabilities und unterstuetzte Versionen)"
post server/discover "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"server/discover\",\"params\":{$META}}"

echo "### 2. tools/list (Listen-Resultat mit ttlMs/cacheScope)"
post tools/list "{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/list\",\"params\":{$META}}"

echo "### 3. tools/call add (Mcp-Name muss params.name entsprechen)"
post tools/call "{\"jsonrpc\":\"2.0\",\"id\":3,\"method\":\"tools/call\",\"params\":{\"name\":\"add\",\"arguments\":{\"a\":1,\"b\":2},$META}}" add

echo "### 4. tools/call confirm-demo, Runde 1 -> resultType input_required"
post tools/call "{\"jsonrpc\":\"2.0\",\"id\":4,\"method\":\"tools/call\",\"params\":{\"name\":\"confirm-demo\",\"arguments\":{\"action\":\"Licht einschalten\"},$META}}" confirm-demo

echo "### 5. tools/call confirm-demo, Runde 2 mit inputResponses -> resultType complete"
post tools/call "{\"jsonrpc\":\"2.0\",\"id\":5,\"method\":\"tools/call\",\"params\":{\"name\":\"confirm-demo\",\"arguments\":{\"action\":\"Licht einschalten\"},\"inputResponses\":{\"confirm\":{\"action\":\"accept\",\"content\":{\"confirm\":true}}},$META}}" confirm-demo

echo "### 6. Fehlerfall: Mcp-Method-Header fehlt -> -32020"
send "{\"jsonrpc\":\"2.0\",\"id\":6,\"method\":\"tools/list\",\"params\":{$META}}" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream'

echo "### 7. SDK-Kompatibilität: 2025-era initialize wird unterstützt"
send '{"jsonrpc":"2.0","id":7,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"old","version":"1"}}}' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream'
