# Übung 3 · MCP Apps

## Ausgangspunkt

Der vollständige Shop, beide Chat-Modi und alle sechs MCP-Tools funktionieren. Search- und Cart-Komponenten, Single-File-Build, Resultatparser und Host-Bridge-Gerüst sind vorbereitet. Offen sind Resource-Registrierung, Tool-Metadaten, Kontoübernahme in der Suche und die schreibenden Bridge-Aufrufe.

Katalog-Mock auf 4040 starten. Hier `npm ci`, `cp .env.example .env`, `npm run dev` ausführen. Shop/MCP: http://localhost:3043. `npm run inspector` öffnet den Inspector. Mit `npm run dev:mcp-host` steht zusätzlich ein lokaler Host unter http://127.0.0.1:43552 bereit; dafür ist kein LLM-Key nötig.

## 1. Search-Resource registrieren

In `src/features/mcp-apps/register-ui-resources.ts` die Funktion `registerUiResources` ausfüllen. `_server` in `server` umbenennen. `SEARCH_UI_URI` aus `./resource-meta.ts` importieren und `registerUiResource(server, 'Webshop Produktsuche', SEARCH_UI_URI, 'search-ui.html')` aufrufen. MIME-Type und CSP sind im Helfer fertig; die Factory ruft die Funktion bereits auf.

**Prüfung:** `npm run build:apps`; im Inspector `resources/list` und `resources/read`. Die Resource enthält gebautes HTML mit `text/html;profile=mcp-app`.

## 2. Suchtool mit der UI verbinden

In `src/features/mcp/server.ts` `uiToolMeta` und `SEARCH_UI_URI` aus `../mcp-apps/resource-meta.ts` importieren. Beim Suchtool `_meta: uiToolMeta(SEARCH_UI_URI)` ergänzen. Resultate und Callback bleiben unverändert.

**Prüfung:** Suchaufruf rendert Produktkarten. Nach UI-Änderungen `npm run build:apps` und die Host-App neu laden.

## 3. Konto aus der Konversation übernehmen

In `src/features/mcp-apps/search/SearchApp.tsx` den Setter `setLoginId` wieder in der `useState`-Destrukturierung ergänzen. In `showSearchResult` `data.loginId` übernehmen. Im Callback `ontoolinput` `params.arguments?.loginId` lesen und nur Strings übernehmen, andernfalls `null`. Die Resultatparser und deaktivierten Add-Buttons sind vorbereitet.

**Prüfung:** Suche ohne Konto funktioniert, Add bleibt gesperrt. Mit `loginId: 'hotel-alpenblick'` werden Produktaktionen aktiv. Kein Konto-Dropdown: Das Konto kommt aus dem Gespräch.

## 4. Hinzufügen über die Bridge

In `SearchApp.tsx`, Funktion `addToCart`, das Stub-Resultat ersetzen durch `await app.callServerTool({ name: 'addToCart', arguments: { loginId, articleNumber, quantity } })`. Die folgende Fehlerbehandlung und Warenkorbdarstellung erhalten.

**Prüfung:** Der Shop zeigt für dasselbe Konto den neuen Warenkorb nach Aktualisierung. Die Host-App zeigt das Resultat unmittelbar.

## 5. Cart-App registrieren und verknüpfen

`CART_UI_URI` importieren und `registerUiResource(server, 'Webshop Warenkorb', CART_UI_URI, 'cart-ui.html')` ergänzen. In der MCP-Factory bei allen fünf übrigen Tools `_meta: uiToolMeta(CART_UI_URI)` setzen. `CartApp.tsx` übernimmt Konto, Cart und Orders bereits über `showToolResult` und `ontoolresult`.

**Prüfung:** Cart-Tool-Aufrufe rendern denselben Kontostand samt Bestellanzahl.

## 6. Entfernen und Checkout

In `CartApp.tsx`, `callCartTool`, `_name` und `_args` umbenennen und das Stub-Resultat durch `await app.callServerTool({ name, arguments: { loginId, ...args } })` ersetzen. Gemeinsame Fehler-/Busy-Behandlung, `removeLine`, `checkout` und die Bestellbestätigung bleiben erhalten.

**Prüfung:** Entfernen aktualisiert die App. Checkout erstellt dieselbe Order-ID in App und Webshop. Host-Benachrichtigungen sind bereits capability-geprüft: fehlendes `updateModelContext` oder `message` darf erfolgreiche Shop-Aktionen nicht als Fehler erscheinen lassen.

## 7. Abnahme

`npm test`, `npm run typecheck`, `npm run build`, `npm run test:browser` prüfen vor dem Ausfüllen die gelösten Vorstufen. Nach Abschluss `npm run test:exercise` für Resource-/Metadaten-Abnahme und `npm run test:e2e:mcp-apps` für die Interaktion im lokalen Host ausführen. Den manuellen Host vorher beenden, weil Browser-Tests dieselben Ports nutzen. Die Grundprüfung erlaubt noch fehlende Resources; die Abnahme verlangt beide UIs samt Metadaten.

UI und Tool-Aktionen auch in ChatGPT und Claude mit erreichbarer Remote-URL prüfen; Goose best effort. Externe Hosts brauchen eigene Zugänge. Bonus: Kontextmeldungen in `updateModelContext`/`sendMessage` erweitern und Verhalten ohne Host-Capability prüfen.

Musterlösung: `../03-webshop-mcp-app-solution`.
