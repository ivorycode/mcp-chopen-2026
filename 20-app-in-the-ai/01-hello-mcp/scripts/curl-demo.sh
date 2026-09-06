#!/bin/sh
# Rohe HTTP-Requests nach MCP 2026-07-28 gegen den laufenden Server.
# Es gibt keinen initialize-Handshake und keine Session: Jeder Request ist
# vollständig, trägt den _meta-Envelope (Protokollversion, Client-Capabilities)
# und die Pflicht-Header Mcp-Method (und Mcp-Name bei name/uri-Parametern).
#
# Voraussetzung: `npm run dev` läuft (Port 3040). Optional: jq für lesbare Ausgabe.

URL="${1:-http://localhost:3040/mcp}"
META='"_meta":{"io.modelcontextprotocol/protocolVersion":"2026-07-28","io.modelcontextprotocol/clientCapabilities":{"elicitation":{}}}'

pretty() { if command -v jq >/dev/null 2>&1; then jq .; else cat; echo; fi; }

post() {
  # $1 = Methode, $2 = JSON-Body, $3 = optionaler Mcp-Name
  if [ -n "$3" ]; then NAME_HEADER="Mcp-Name: $3"; else NAME_HEADER="X-None: 1"; fi
  curl -s -X POST "$URL" \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json, text/event-stream' \
    -H 'MCP-Protocol-Version: 2026-07-28' \
    -H "Mcp-Method: $1" \
    -H "$NAME_HEADER" \
    -d "$2" | pretty
}

echo "### 1. server/discover (ersetzt initialize; liefert Capabilities und unterstuetzte Versionen)"
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
curl -s -X POST "$URL" -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
  -d "{\"jsonrpc\":\"2.0\",\"id\":6,\"method\":\"tools/list\",\"params\":{$META}}" | pretty

echo "### 7. SDK-Kompatibilität: 2025-era initialize wird unterstützt"
curl -s -X POST "$URL" -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":7,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"old","version":"1"}}}' | pretty
