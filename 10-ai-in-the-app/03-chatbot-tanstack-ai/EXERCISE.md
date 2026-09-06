# Übung · Warenkorb-Tools mit TanStack AI

## Ziel

Ergänze denselben Funktionsumfang wie in der Vercel-AI-SDK-Übung: Warenkorb anzeigen, Artikel hinzufügen und entfernen, Resultate im Workspace unter `/chat` darstellen, den Shop aktualisieren und Checkout erst nach Bestätigung ausführen. TanStack AI trennt `toolDefinition()` und `.server()`; die Bestätigung verwendet Interrupts.

Voraussetzungen: Katalog-Mock auf Port 4040, lokaler Provider/API-Key in `.env`, `npm ci` ausgeführt.

## 1. Starten und ausprobieren

Starte `npm run dev` und öffne http://localhost:3033 und für die grafische Übung `/chat`. Wähle ein Demo-Konto, öffne den Chat und sende „Suche Milch“. Produktkarten und Suche auf der Hauptseite funktionieren. „Zeig mir meinen Warenkorb“ liefert zunächst `ok: false` mit „Noch nicht implementiert“. Im Netzwerk-Tab liefert `POST /api/chat` einen AG-UI-SSE-Stream.

## 2. Warenkorb anzeigen

In `src/features/chat/server/chat-route.server.ts` ist `getCartDef.server()` vorbereitet. Ersetze dort `NOT_IMPLEMENTED` durch `toolHandlers.getCart(loginId)`. Die Kontoermittlung mit `currentLoginId()` und der Fehler `LOGIN_REQUIRED` bleiben erhalten: Das Modell bestimmt den Warenkorb nicht selbst.

Prüfung: „Zeig mir meinen Warenkorb“ funktioniert angemeldet; abgemeldet wird die Anmeldung verlangt. Das Resultat wird vorerst als JSON angezeigt.

## 3. Artikel hinzufügen

Implementiere den Callback von `addToCartDef.server()` mit `toolHandlers.addToCart(loginId, input)`. Benenne `_input` in `input` um. Eingabeschema und Beschreibung sind vorhanden.

Prüfung: „Lege zwei Milch in den Warenkorb“. Das Modell soll suchen und danach `addToCart` mit einer gefundenen Artikelnummer ausführen. Prüfe den Warenkorb nach Neuladen der Seite.

## 4. Artikel entfernen

Verbinde `removeFromCartDef.server()` mit `toolHandlers.removeFromCart(loginId, input)`. Erhalte die Session-Prüfung und benenne `_input` um.

Prüfung: „Entferne die Milch“. Ein nicht vorhandener Artikel liefert einen strukturierten Fehler.

## 5. Warenkorb darstellen und Shop aktualisieren

Datei: `src/features/chat/ui/ChatbotWorkspace.tsx`.

1. Ersetze die JSON-Ausgabe in `ToolCallView` für `getCart`, `addToCart` und `removeFromCart` durch eine gemeinsame Warenkorbdarstellung. Verwende `CartResult` bzw. `ToolOutputs['getCart']`, behandle `ok: false` und zeige Artikel, Menge, Positionspreis und Gesamtsumme. Eine Tabelle oder Liste genügt. Bei gefülltem Warenkorb den Button «Bestellen» ergänzen: `actions.checkout()` aufrufen und bei `actions.disabled` deaktivieren. Diese direkte API-Aktion ist im Widget bereits vorbereitet.
2. Erweitere den Effect für abgeschlossene Tool-Aufrufe: Nach erfolgreichem `addToCart`, `removeFromCart` oder `checkout` den React-Query-Cache für `['cart']` invalidieren und `dispatchCartChanged()` aus `src/lib/shop-events.ts` auslösen. Verwende `useQueryClient()` und ergänze die Effect-Abhängigkeiten.
3. Erhalte die Suche und die Deduplizierung über `processedToolCallIds`, damit jeder Tool-Aufruf nur einmal ein Event auslöst.

Prüfung: Der Workspace stellt den Warenkorb dar; Header und Shop-Warenkorb aktualisieren sich nach Chat-Aktionen ohne Neuladen. Fehlgeschlagene Tools lösen keine Aktualisierung aus.

## 6. Checkout mit Bestätigung

Implementiere diese Teile gemeinsam, bevor du Checkout ausprobierst:

1. In `src/features/chat/shared/tools.ts` bei `checkoutDef` die Option `needsApproval: true` setzen.
2. Im Workspace am TODO die `interrupts` rendern. Für `interrupt.kind === 'tool-approval'` Bestätigen und Abbrechen anbieten. Die Buttons rufen `interrupt.resolveInterrupt(true)` bzw. `interrupt.resolveInterrupt(false)` auf und sind bei `!interrupt.canResolve || resuming` deaktiviert. `useChat` liefert die Interrupts bereits; die Route übergibt `resume` bereits an `chat()`.
3. Im Assistant-Modus offene Freigaben zusätzlich in `submitPrompt` mit Ja/Nein beantworten (`resolveInterrupt`). Andere Eingaben zeigen einen Hinweis; keine weitere Modellanfrage senden.
4. Den Callback von `checkoutDef.server()` an `toolHandlers.checkout(loginId)` anschliessen. Erhalte `LOGIN_REQUIRED`. Entferne `NOT_IMPLEMENTED`, sobald kein Callback es mehr verwendet.
5. Im Workspace den erfolgreichen Checkout mit Bestellnummer und Betrag anzeigen. Fehler, ausstehende Freigabe und Abbruch bleiben als eigene Zustände sichtbar.

Prüfung: Vor der Bestätigung entsteht keine Bestellung. Abbrechen erhält den Warenkorb; Bestätigen erstellt genau eine Bestellung und aktualisiert den Shop. Beim nächsten Hinzufügen entsteht ein neuer Warenkorb.

## Abschluss

Führe `npm test`, `npm run typecheck` und `npm run build` aus. Wiederhole Suche → Hinzufügen → Entfernen → Checkout mit Abbruch und Zustimmung im Chat. `npm run test:browser` prüft Shop, beide Chat-Modi und direkte Produktaktionen mit AG-UI-Fixtures ohne LLM. Nach dem Ausfüllen prüft `npm run test:exercise` zusätzlich die Cart-Darstellung und direkte Bestellung. Die Interrupt-Freigabe zusätzlich mit einem echten Provider prüfen.

Vergleiche mit der [TanStack-Musterlösung](../03-chatbot-tanstack-ai-solution/README.md) und der [Vercel-Musterlösung](../02-chatbot-vercel-ai-sdk-solution/README.md): Welche Teile sind Fachlogik, welche SDK-spezifisch?

## Bonus

Wechsle den Provider in `.env` und vergleiche Tool-Aufrufe und Streaming. Ergänze eine detailliertere Fortschrittsanzeige während der Tool-Ausführung.

Die Vorlage verwendet die aktuelle Shop-Grundlage und zwei Modi: Assistant als Text-Fernsteuerung und Workspace mit Widgets. Produkt-Buttons rufen bereits direkt die Web-API auf und dokumentieren die Aktion ohne Modellaufruf. Für die Übung der Tool-Callbacks Texteingaben verwenden. Handler: `src/lib/tools/handlers.server.ts`; Bestellung: `orderId`. Der Cart-Handle wird nicht aus der Session konstruiert; die Session liefert das Demo-Konto.
