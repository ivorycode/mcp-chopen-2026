# Übung 1 · Warenkorb-Tools im Chat

## Ziel und Ausgangspunkt

Der Shop mit Web-API, Demo-Konten, Suche und Bestellhistorie ist fertig. Suche und Chat-Streaming funktionieren. Implementiere die vier Warenkorb-Tools, ihre Workspace-Darstellung, die Aktualisierung des Shops und die Freigabe von Modell-Checkouts.

Starte den Katalog in `../../01-mock-api` (`npm ci`, `npm start`). Installiere diesen Starter mit `npm ci`, kopiere `.env.example` nach `.env`, trage den Provider-Key ein und starte `npm run dev`. Öffne http://localhost:3031 und wähle ein Demo-Konto. Die Übung verwendet `restaurant-baeren`, `hotel-alpenblick` oder `kantine-campus`; freie Benutzernamen sind nicht vorgesehen.

## 1. Die beiden Modi ausprobieren

Im schwebenden **Assistant** erscheint Text; erfolgreiche Tools steuern die Shop-Oberfläche. Unter **`/chat` (Workspace)** erscheinen Produktkarten und zunächst generische Warenkorb-Parts. Sende in beiden Modi «Suche Milch». Die Suchfunktion ist fertig. «Zeig mir meinen Warenkorb» liefert angemeldet «Noch nicht implementiert», abgemeldet die Aufforderung zur Kontoauswahl.

## 2. Warenkorb anzeigen

Datei: `src/features/chat/server/ai-tools.server.ts`. Die Schemas, Beschreibungen, Resultattypen und `forSession` sind vorbereitet. `forSession` liefert die `loginId` aus `getCurrentAccount()`; das Modell darf sie nicht vorgeben.

Ersetze im `getCart`-Callback `NOT_IMPLEMENTED` durch `toolHandlers.getCart(loginId)` und benenne `_loginId` um. Der Rückgabetyp bleibt `CartResult`. Die Handler stehen in `src/lib/tools/handlers.server.ts`.

**Prüfung:** Angemeldet ein leeres oder gefülltes Resultat; abgemeldet weiterhin `LOGIN_REQUIRED`.

## 3. Artikel hinzufügen

Verbinde `addToCart` mit dem asynchronen Handler. Benenne die vorbereiteten Parameter um:

```ts
execute: forSession(async (loginId, input): Promise<CartResult> =>
  toolHandlers.addToCart(loginId, input),
),
```

**Prüfung:** «Lege zwei Vollmilch in den Warenkorb» führt Suche und Hinzufügen aus. Nach Neuladen zeigt der Shop die Menge. Ein weiteres Add summiert sie in derselben Position.

## 4. Artikel entfernen

Verbinde `removeFromCart` mit `toolHandlers.removeFromCart(loginId, input)`; benenne `_loginId` und `_input` um. `forSession` und das Schema bleiben erhalten.

**Prüfung:** Vorhandene Position entfernen; eine unbekannte Artikelnummer liefert `ok: false`.

## 5. Resultate darstellen und die Seite aktualisieren

In `src/features/chat/ui/ToolPartView.tsx` die generische Ausgabe für `tool-getCart`, `tool-addToCart` und `tool-removeFromCart` ersetzen:

- Solange `part.state !== 'output-available'`: einen Wartehinweis rendern.
- Bei `!part.output.ok`: `Note` mit `error` und `part.output.error` verwenden.
- Sonst Artikelbezeichnung, Menge, `lineTotal`, `totalItems` und `totalAmount` rendern. `formatMoney` ist importiert. Ein gemeinsames `CartTable` kann `Extract<CartResult, { ok: true }>` aus `lib/tools/results.ts` verwenden.
- Bei nicht leerem Warenkorb einen Button «Bestellung abschliessen» anbieten, der `actions.onCheckout()` aufruft und bei `actions.actionsDisabled` deaktiviert ist.

Im markierten Effect in `ChatbotWidget.tsx` nach erfolgreichen `tool-addToCart`, `tool-removeFromCart` und `tool-checkout` `dispatchCartChanged()` aufrufen. Die bestehende Deduplizierung über `handledToolCalls` erhalten. So aktualisieren sich Header, Warenkorb und Orders ohne Reload.

Die Produktkarten-Buttons und die direkten API-Aktionen sind fertige Grundlage: Ein bewusster Klick führt die Aktion aus und ergänzt den Chat-Verlauf, ohne Modellaufruf. Zum Prüfen der zu implementierenden Modell-Tools deshalb Texteingaben verwenden.

## 6. Modell-Checkout mit Freigabe

Diese Teile gemeinsam implementieren, bevor du den Checkout über den Chat ausprobierst:

1. In `chat-route.server.ts` am TODO `toolApproval: { checkout: 'user-approval' },` setzen.
2. In `ToolPartView.tsx` den `tool-checkout`-Fall ergänzen. Bei `approval-requested` «Abbrechen» und «Bestellung abschicken» anbieten; diese rufen `actions.onApprove(part.approval.id, false)` bzw. `true` auf. `approval-responded` als ausstehend oder abgelehnt darstellen. Bei `output-available` Fehler oder die erfolgreiche Bestellung mit `orderId`, `submittedAt`, `totalItems` und `totalAmount` anzeigen. `output-denied` und `output-error` sind oberhalb des Switch bereits behandelt.
3. In `ai-tools.server.ts` den Checkout-Callback mit `toolHandlers.checkout(loginId)` verbinden. Danach die ungenutzte Konstante `NOT_IMPLEMENTED` entfernen.

Der Assistant verarbeitet offene Freigaben bereits mit **Ja/Nein** (`assistant-mode.ts`). `addToolApprovalResponse` und das automatische Fortsetzen in `client/chat-client.ts` sind ebenfalls vorbereitet.

**Prüfung:** Vor einer Zustimmung entsteht keine Order. Ablehnung erhält den Warenkorb; Zustimmung erstellt genau eine Order. Ein anschliessendes Add erzeugt einen neuen Warenkorb. Der direkte Workspace-Button ist selbst die ausdrückliche Bestellaktion und verwendet keinen Modell-Freigabezyklus.

## Checks

`npm test`, `npm run typecheck`, `npm run build` und `npm run test:browser` prüfen das Starter-Grundgerüst. Nach Abschluss zusätzlich `npm run test:exercise` ausführen: Die Browser-Abnahme erwartet nun Warenkorbtabelle, direkte Aktionen und Checkout-Freigabe. Die Streams in den Browser-Tests sind deterministische Fixtures; den echten Provider zusätzlich mit Suche → Add → Remove → Checkout (Nein/Ja) prüfen.

Musterlösung: `../02-chatbot-vercel-ai-sdk-solution`. Bonus: Provider in `.env` wechseln; Zustand `input-streaming` im Such-Widget genauer darstellen.
