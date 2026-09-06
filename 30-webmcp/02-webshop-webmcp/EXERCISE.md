# Übung 4 · WebMCP ergänzen

## Ausgangspunkt

Shop, Chat, HTTP-/stdio-MCP und beide MCP Apps sind fertig. `WebMCPProvider` und Tool-Konsole sind eingebunden; `shopTools` ist leer und `registerShopTools` noch ohne Registrierung. Die Helper für Schema-Validierung und strukturierte Fehler sind vorbereitet.

`npm ci`, `cp .env.example .env`, Katalog-Mock auf 4040 und `npm run dev` starten. Shop: http://localhost:3051. Für native WebMCP-Aufrufe den vorbereiteten Chrome mit `chrome://flags/#enable-webmcp-testing` und Inspector-Extension verwenden. Ohne experimentelle API bleiben alle vorherigen Stufen bedienbar.

## 1. Suche definieren

In `src/features/webmcp/webmcp-tools.ts` `shopTools` ergänzen. `defineTool(name, schema, annotations, run)` ist vorbereitet. Importiere die benötigten Schemas aus `../../lib/tools/contracts.ts`, Web-API-Funktionen aus `../../lib/client-api.ts` und Events aus `../../lib/shop-events.ts`.

Für `searchProducts`: `searchProductsInput`, `{ readOnlyHint: true, untrustedContentHint: true }`, Callback mit `search(term)`. Die ersten fünf Artikel zurückgeben: `{ ok: true, searchTerm, totalCount, shownCount: articles.length, articles }`. Mit `dispatchShopSearch(data.searchTerm)` die sichtbare Suche nachführen.

## 2. Warenkorb lesen und befüllen

`getCart` mit `emptyInput` und `{ readOnlyHint: true }`: `{ ok: true, ...(await getCart()) }` liefern.

`addToCart` mit `addToCartInput` und `{ readOnlyHint: false }`: `addToCart(articleNumber, quantity)` aufrufen, `dispatchCartChanged()` auslösen und `{ ok: true, ...cart, message }` zurückgeben. Die Nachricht soll Menge und Artikelnummer enthalten, z. B. `2 × 022600 wurde in den Warenkorb gelegt.`

**Prüfung nach Schritt 5:** Ohne Konto strukturierter Anmeldefehler; mit Konto sehen Browser und Tool denselben Cart. Kein Tool nimmt eine `loginId` entgegen: die Web-API verwendet den Browser-Cookie.

## 3. Entfernen und bestellen

`removeFromCart`: `removeFromCartInput`, `{ readOnlyHint: false }`, `removeCartItem(articleNumber)`, danach Cart-Event und `{ ok: true, ...cart, message }`.

`checkout`: `emptyInput`, `{ readOnlyHint: false }`, `checkoutCart()`, danach Cart-Event und `{ ok: true, orderId, submittedAt, totalItems, totalAmount }`. Die Rückgabefelder aus der API übernehmen; keine erfundenen Bestellnummern.

## 4. Resultate und Shop-Events prüfen

Alle Callbacks sind asynchron. `defineTool` validiert Eingaben und wandelt API-Fehler um; doppelte Fehlerbehandlung ist nicht nötig. Suche veröffentlicht `dispatchShopSearch`; erfolgreiche Änderungen veröffentlichen `dispatchCartChanged`. Die Seite invalidiert damit Cart und Orders ohne Reload.

## 5. Registrierung und Cleanup

In `registerShopTools` `_modelContext` umbenennen. Einen `AbortController` erstellen und jedes Tool mit `modelContext.registerTool(tool, { signal: controller.signal })` registrieren. Promise-Fehler behandeln: `AbortError` beim Unmount ignorieren, andere Fehler protokollieren. Als Cleanup `() => controller.abort()` zurückgeben. `WebMCPProvider` ruft die Funktion bereits in einem Effect auf und nutzt den Cleanup.

**Prüfung:** `await document.modelContext.getTools()` listet genau fünf Tools. Nach Remount entstehen keine doppelten Registrierungen. In Chrome werden Tool-Argumente für `executeTool` als JSON-String übergeben:

```js
const tool = (await document.modelContext.getTools()).find(
  (t) => t.name === 'searchProducts',
)
await document.modelContext.executeTool(tool, JSON.stringify({ term: 'Milch' }))
```

Die eingebaute Tool-Konsole übernimmt das ebenfalls.

## 6. Abnahme

Vor dem Ausfüllen: `npm test`, `npm run typecheck`, `npm run build`, `npm run test:browser`. Nach Abschluss zusätzlich `npm run test:exercise`: prüft fünf Schemas, Web-API-Aufrufe, Eingabevalidierung, Shop-Events und Abort-Cleanup mit einer API-Testdouble. Die normale Testsuite erlaubt eine noch unvollständige Toolliste; die Acceptance-Datei verlangt alle fünf Tools.

Im nativen Browser zusätzlich Suche → Add → Remove → Checkout ausführen. Warenkorb und Bestellungen müssen sofort nachziehen. Die automatisierten Tests ersetzen die Abnahme der experimentellen Chrome-API nicht. Kein Origin-Trial und kein produktiver Fallback.

Der deklarative Ansatz ist die separate Demo `../01-hello-webmcp`; hier registriert nur der imperative Adapter Tools.

Musterlösung: `../02-webshop-webmcp-solution`.
