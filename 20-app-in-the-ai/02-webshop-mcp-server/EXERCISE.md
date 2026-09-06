# Übung 2 · Webshop über MCP bedienen

## Ausgangspunkt

Webshop, Web-API und beide Chat-Modi sind fertig. Die MCP-Factory in `src/features/mcp/server.ts` deklariert bereits sechs Tools mit Schemas und Annotationen. Ihre Callbacks liefern absichtlich «Noch nicht implementiert». HTTP (`src/routes/mcp.tsx`) und stdio (`src/features/mcp/stdio.ts`) verwenden dieselbe Factory. MCP Apps gehören erst zur nächsten Stufe.

## 1. Starten

Katalog-Mock auf Port 4040 starten. Hier `npm ci`, `cp .env.example .env`, `npm run dev` ausführen. Shop: http://localhost:3041, Endpunkt: http://localhost:3041/mcp. `npm run inspector` verwendet die lokale `inspector.json`; `npm run start:stdio` startet einen separaten Prozess. Den AI-Key brauchst du nur für den Chat.

**Prüfung:** Klassische Suche, Demo-Konto, Warenkorb und Checkout funktionieren. Inspector listet sechs Tools; Aufrufe liefern strukturierte Fehler.

## 2. Suche implementieren

In `src/features/mcp/server.ts` `toolHandlers` aus `../../lib/tools/handlers.server.ts` importieren. Im Callback von `searchProducts` auch `term` destrukturieren. Die optionale `loginId` weiterhin validieren. `await toolHandlers.searchProducts({ term })` aufrufen und mit `toolResult` zurückgeben: Daten `{ ...data, loginId: loginId ?? null }`, Text bei Erfolg aus `shownCount` und `searchTerm`, sonst `data.error`.

**Prüfung:** Suche ohne Konto funktioniert; eine unbekannte ID liefert `isError: true`, `ok: false` und gültige Demo-Konten.

## 3. Warenkorb-Tools verbinden

`withAccount` validiert die verpflichtende `loginId`. Benenne `_loginId` um. Verbinde `getCart`, `addToCart` und `removeFromCart` mit den gleichnamigen lokalen Handlern. Für Add/Remove nimmt der Callback zusätzlich die Schema-Eingaben entgegen; Add ist asynchron. Es gibt kein `createCart`: das erste Add legt den Warenkorb an.

Für ein einheitliches Kontoresultat ergänze einen Helfer `cartPayload(loginId, data)`, der `{ ...data, loginId, orders: shop.getOrders(loginId) }` liefert. Importiere `* as shop` aus `../../lib/shop.server.ts` und bei Bedarf `CartResult` aus `../../lib/tools/results.ts`. Liefere diesen Payload als `structuredContent` über `toolResult`; der Text fasst das Ergebnis zusammen. Fehler dürfen keine Erfolgsmeldung erhalten.

**Prüfung:** Zweimal dieselbe Artikelnummer addieren ergibt eine Position mit summierter Menge. Browser und HTTP-MCP desselben Kontos zeigen denselben Warenkorb. Ein anderes Konto bleibt unverändert.

## 4. Checkout und Orders

`checkout`: `toolHandlers.checkout(loginId)` aufrufen. Fehler als `cartPayload` mit Fehlertext zurückgeben. Bei Erfolg den neuen, leeren Warenkorb über `cartPayload(loginId, toolHandlers.getCart(loginId))` lesen und `{ ...data, loginId, cart }` liefern; der Text enthält `data.orderId`.

`getOrders`: `cartPayload(loginId, toolHandlers.getCart(loginId))` liefern, einschliesslich `orders`. Der Text nennt die Anzahl Bestellungen.

**Prüfung:** Browser und MCP sehen dieselbe Order-ID; das nächste Add erzeugt eine neue Cart-ID. stdio hat eigenen Prozessspeicher und teilt seinen Zustand nicht mit HTTP.

## 5. Automatisch und im Host prüfen

- `npm test`, `npm run typecheck`, `npm run build`, `npm run test:browser`: lauffähige Grundlage und vorbereitete Lücken.
- Nach dem Ausfüllen `npm run test:exercise`: echter MCP-SDK-Client gegen HTTP und stdio; prüft Schemas, Kontoisolation, Mehrfach-Add, gemeinsamen Browserzustand und Checkout. Die Grundprüfungen tolerieren teilweise ausgefüllte Callbacks; die Abnahme verlangt alle fertigen Tools.
- Im Inspector alle sechs Tools aufrufen. Für eine erreichbare Remote-URL Toolliste, Suche, Cart und Checkout in ChatGPT und Claude prüfen; Goose best effort. Zugang und Hosting sind separate Voraussetzungen; keinen Sondertransport implementieren.

Bonus: Cart als Resource; Human-in-the-loop über einen MCP-Request. Der optionale öffentliche Guard liegt in `src/features/mcp/public-demo-guard.server.ts`; lokal bleibt er aus.

Musterlösung: `../02-webshop-mcp-server-solution`.
