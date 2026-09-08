# Übung 1 · Warenkorb-Tools im Chat

## Ziel und Ausgangspunkt

Der Shop mit Web-API, Demo-Konten, Suche und Bestellhistorie ist fertig. Suche und Chat-Streaming funktionieren. Implementiere die vier Warenkorb-Tools, ihre Workspace-Darstellung, die Aktualisierung des Shops und die Freigabe von Modell-Checkouts.

Die Übung hat zwei Teile. **Teil A** ist Analyse: Du liest die fertige Artikelsuche und verstehst den Weg vom Chat über das Tool zurück in die Shop-Oberfläche. **Teil B** ist die Umsetzung in fünf Schritten, die genau diesem Weg folgen.

Starte den Katalog in `../../01-mock-api` (`npm ci`, `npm start`). Installiere diesen Starter mit `npm ci`, kopiere `.env.example` nach `.env`, trage den Provider-Key ein und starte `npm run dev`. Öffne http://localhost:3031 und wähle ein Demo-Konto. Die Übung verwendet `restaurant-baeren`, `hotel-alpenblick` oder `kantine-campus`; freie Benutzernamen sind nicht vorgesehen.

## Teil A · Verstehen

In diesem Teil wird nichts implementiert. Du machst dir das Zusammenspiel von
Chat, Tools und Shop an der fertigen Artikelsuche klar – dem Muster, dem du in
Teil B für den Warenkorb folgst.

### Die beiden Modi ausprobieren

Der Chat ist auf der Webseite in zwei Ausprägungen eingebaut, die sich in
Zweck und Verhalten unterscheiden. Im Code sind sie als **Modi** derselben
Chat-Komponente umgesetzt, mit den Werten `assistant` und `workspace`
(`ChatMode` in `src/features/chat/shared/chat-config.ts`):

- **Assistant** (`mode="assistant"`): der schwebende Chat unten rechts auf der
  Shop-Seite `/`. Er ist eine Fernsteuerung für den Shop: Das Modell antwortet
  mit kurzem Text, und erfolgreiche Tools steuern die Shop-Oberfläche hinter
  dem Chat – etwa die Suchliste.
- **Workspace** (`mode="workspace"`): die eigene Seite `/chat`. Hier ist der
  Chat selbst die Arbeitsfläche: Tool-Resultate erscheinen als Widgets im
  Verlauf, etwa Produktkarten für die Suche. Die Warenkorb-Tools zeigen im
  Starter noch generische Parts.

Die Suchfunktion ist als Start-Punkt bereits implementiert: Sende in beiden Modi «Suche Milch». 
Im Assistant ändert sich die Suchliste des Shops, im Workspace erscheinen Produktkarten im
Chat. «Zeig mir meinen Warenkorb» liefert angemeldet «Noch nicht
implementiert», abgemeldet die Aufforderung zur Kontoauswahl.

### Die Artikelsuche im Detail

Die Suche ist bereits fertig implementiert. Sie ist die Vorlage für alles, was
in Teil B folgt: derselbe Weg vom Chat über das Tool zum Shop.
Lies diesen Abschnitt mit den genannten Dateien nebeneinander, bevor du die
Warenkorb-Tools ergänzt.

#### Vom Eingabefeld zum Modell

Beide Darstellungen sind dieselbe Komponente `ChatbotWidget.tsx`; die Chat-Route
`/chat` rendert sie nur mit `mode="workspace"`, das Root-Layout mit dem
Standard `mode="assistant"`. Die Eingabe landet in beiden Fällen in
`submitPrompt` und von dort in der Chat-Instanz des AI SDK:

```ts
// src/features/chat/ui/ChatbotWidget.tsx
await sendMessage({ text })
```

Die Chat-Instanz stammt aus `src/features/chat/client/chat-client.ts`. Sie
kennt den Modus und sendet ihn bei jeder Anfrage mit:

```ts
return new Chat<ShopUIMessage>({
  id,
  transport: new DefaultChatTransport({ api: CHAT_API_PATH, body: { mode } }),
  sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
})
```

Jeder Modus erhält über `createChatInstance` eine eigene Instanz mit eigener ID
(`webshop-chat-assistant` bzw. `webshop-chat-workspace`): Assistant und
Workspace haben getrennte Verläufe.

#### Auf dem Server: ein Modellaufruf mit Tools

`src/features/chat/server/chat-route.server.ts` beantwortet `POST /api/chat`.
Die UI-Nachrichten werden in Modell-Nachrichten übersetzt, die Tools werden
mitgegeben, und die Antwort wird als Stream zurückgeschickt:

```ts
const result = streamText({
  model: createModel(),
  instructions: getChatSystemPrompt(guard.mode),
  // UI-Nachrichten (mit Parts) → Modell-Nachrichten (user/assistant/tool)
  messages: await convertToModelMessages(guard.messages, { tools: shopTools }),
  tools: shopTools,
  stopWhen: isStepCount(chatLimits.maxSteps),
  ...
})
```

Wichtig für das Verständnis der beiden Modi: **Der Modus** (`guard.mode`, `assistant` | `workspace`) **ändert nur die Modellanweisung**, nicht die Tools. `getChatSystemPrompt` in
`src/features/chat/shared/chat-config.ts` hängt an den gemeinsamen Prompt einen
Darstellungsteil an. Der Assistant soll nach dem Tool-Aufruf einen kurzen Text
schreiben, der Workspace soll bei einer reinen Suche ohne Text enden, weil die
Widgets die Treffer bereits zeigen.

`stopWhen: isStepCount(...)` erlaubt mehrere Schritte pro Anfrage: Das Modell
ruft ein Tool auf, bekommt das Resultat und darf danach weiterarbeiten – etwa
für den Text im Assistant oder für ein zweites Tool.

#### Das Tool und sein Handler

`src/features/chat/server/ai-tools.server.ts` registriert die Suche als Tool
des AI SDK. Beschreibung und Eingabe-Schema kommen aus den gemeinsamen
Contracts, die Ausführung geht an den Handler:

```ts
searchProducts: tool({
  description: toolDescriptions.searchProducts,
  inputSchema: searchProductsInput,
  execute: (input) => toolHandlers.searchProducts(input),
}),
```

Anders als die Warenkorb-Tools braucht `searchProducts` kein `forSession`: Der
Katalog ist nicht kontogebunden. Das Schema `searchProductsInput` in
`src/lib/tools/contracts.ts` beschreibt genau ein Feld `term`; die Beschreibung
darin ist das «User Interface» des Tools gegenüber dem Modell.

`src/lib/tools/handlers.server.ts` ruft den Shop auf, kürzt das Ergebnis und
liefert den Resultattyp aus `src/lib/tools/results.ts`:

```ts
const result = await shop.searchArticles(term)
const articles = result.articles.slice(0, MAX_SEARCH_RESULTS)
return { ok: true, searchTerm: result.searchTerm, totalCount: result.totalCount, ... }
```

Fehler werden nicht geworfen, sondern als `{ ok: false, error }` zurückgegeben,
damit das Modell sie lesen kann. Genau dieses Muster gilt auch für deine
Warenkorb-Tools.

#### Zurück im Chat: Tool-Parts

Um den Transport musst du dich nicht kümmern: Das AI SDK macht jeden
Tool-Aufruf als eigenen **Part** der Assistenten-Nachricht verfügbar, benannt
nach dem Tool. Aus dem Schlüssel `searchProducts` in `shopTools` wird der
Part-Typ `tool-searchProducts`, aus `getCart` wird `tool-getCart`. Neben den
Tool-Parts gibt es Text-Parts für die Antwort des Modells.

Das Ganze ist typisiert. `ShopUIMessage` in `ai-tools.server.ts` leitet die
Part-Typen aus den Tools ab:

```ts
export type ShopUIMessage = UIMessage<
  never,
  UIDataTypes,
  InferUITools<typeof shopTools>
>
```

Damit kennt TypeScript im Widget zu jedem Part-Typ die passende Ein- und
Ausgabe: Im Fall `tool-searchProducts` ist `part.output` das
`SearchProductsResult`, im Fall `tool-getCart` das `CartResult` – beide aus
`src/lib/tools/results.ts`. Ein falscher Tool-Name oder ein Feld, das es im
Resultat nicht gibt, fällt beim `npm run typecheck` auf.

Welche Parts sichtbar sind, entscheidet `ChatbotWidget.tsx`:

```ts
function isVisiblePart(part: ShopPart, mode: ChatMode): boolean {
  if (part.type === 'text') return Boolean(part.text)
  return mode === 'workspace'
    ? isToolUIPart(part)
    : assistantToolText(part) !== null
}
```

Im **Workspace Modus** rendert `MessagePart` den Part über `ToolPartView.tsx`. Dort
ist der Suchfall vollständig ausimplementiert und zeigt, was in Schritt 4 für
den Warenkorb zu tun ist – erst der Wartezustand, dann der Fehlerfall, dann das
Widget:

```tsx
case 'tool-searchProducts':
  if (part.state !== 'output-available') {
    return <Note text={`Suche läuft${part.input?.term ? ` nach "${part.input.term}"` : ''}...`} />
  }
  if (!part.output.ok) return <Note error text={part.output.error} />
  return <SearchResultCards output={part.output} actions={actions} />
```

Im **Assistant Modus** entscheidet `assistantToolText` in `assistant-mode.ts`. Für ein
erfolgreiches Suchresultat gibt die Funktion `null` zurück; der Part bleibt
unsichtbar. Sichtbar bleibt nur, was der Benutzer beantworten oder wissen muss:
Fehler und die Checkout-Freigabe. Deshalb siehst du im schwebenden Chat nur den
Text des Modells – und deshalb ist die generische JSON-Ausgabe der noch offenen
Warenkorb-Fälle nur unter `/chat` sichtbar.

#### Synchronisation der Shop-Oberfläche

Der Chat aktualisiert den Shop nicht direkt, sondern über Browser-Events. Ein
Effect in `ChatbotWidget.tsx` sieht alle abgeschlossenen Tool-Aufrufe und
verarbeitet jeden `toolCallId` genau einmal:

```ts
for (const part of messages.flatMap((message) => message.parts)) {
  if (!isToolUIPart(part) || part.state !== 'output-available') continue
  if (handledToolCalls.current.has(part.toolCallId)) continue
  handledToolCalls.current.add(part.toolCallId)

  if (part.type === 'tool-searchProducts' && part.output.ok) {
    dispatchShopSearch(part.output.searchTerm)
  }
  // hier ergänzt Schritt 4 dispatchCartChanged()
}
```

`src/lib/shop-events.ts` kapselt die Events. Der Chat kennt den Shop nicht, er
sendet nur ein `CustomEvent` an `window`:

```ts
export function dispatchShopSearch(term: string) {
  window.dispatchEvent(new CustomEvent(SHOP_SEARCH_EVENT, { detail: { term } }))
}
```

Empfänger ist die Shop-Seite `src/routes/index.tsx`:

```ts
const onSearch = (event: Event) =>
  applySearchTerm((event as CustomEvent<{ term?: string }>).detail.term ?? '')
const onCartChanged = () => void invalidate('cart', 'orders')
window.addEventListener(SHOP_SEARCH_EVENT, onSearch)
window.addEventListener(SHOP_CART_CHANGED_EVENT, onCartChanged)
```

`applySearchTerm` setzt `activeSearch`. Das ist der Query-Key der Suche, also
lädt TanStack Query die Trefferliste für die Shop-Anzeige selbst:

```ts
const searchQuery = useQuery({
  queryKey: ['search', activeSearch],
  queryFn: () => api.search(activeSearch),
  enabled: isHydrated && activeSearch.length > 0,
  staleTime: 60_000,
})
```

Damit löst der Client nach der Suche im Chat für diese Demo bewusst eine
**zweite Suche** für die Shop-Anzeige aus, sofern keine frischen Ergebnisse im
Query-Cache liegen. Das hält die Synchronisierung einfach: Das Event überträgt
nur den Suchbegriff, nicht die Trefferliste. Der Chat muss weder den Query-Cache
noch die Datenstruktur der Shop-Anzeige kennen.

Der Preis dafür ist eine zusätzliche Katalogabfrage. Mögliche Optimierungen:
die vollständigen Suchergebnisse an den Query-Cache übergeben oder die
Katalogabfragen serverseitig cachen. Die erste Variante genügt hier allerdings
nicht: Die Chat-Ergebnisse sind auf `MAX_SEARCH_RESULTS` gekürzt und würden den
Shop-Cache mit einer unvollständigen Liste füllen. Derselbe Hinweis steht als
Kommentar im Effect von `index.tsx`.

Zwei Beobachtungen noch:

- **Der Listener lebt nur auf `/`.** Unter `/chat` ist die Shop-Seite nicht
  montiert; das Event läuft dort ins Leere. Die Synchronisation ist die
  Kernidee des Assistant-Modus, der Workspace zeigt seine Resultate selbst.
- **Der Warenkorb funktioniert gleich.** `subscribeToCartChanges` in
  `Header.tsx` invalidiert den Cart-Query, `index.tsx` invalidiert Warenkorb und
  Bestellungen. Es fehlt nur der Auslöser: `dispatchCartChanged()` nach den
  Cart-Tools. Genau das ergänzt du in Schritt 4.

**Prüfung:** Sende im Assistant «Suche Milch» und beobachte, wie sich die
Suchliste im Shop hinter dem Chat ändert. Sende dasselbe unter `/chat`: Dort
erscheinen die Produktkarten im Chat, der Shop bleibt unberührt.

## Teil B · Umsetzen

Fünf Schritte, jeder mit einer eigenen Prüfung. Die offenen Stellen sind im
Quellcode als `TODO Schritt 1` bis `TODO Schritt 5` markiert.

### Schritt 1: Warenkorb anzeigen

Datei: `src/features/chat/server/ai-tools.server.ts`. Die Schemas, Beschreibungen, Resultattypen und `forSession` sind vorbereitet. `forSession` liefert die `loginId` aus `getCurrentAccount()`; das Modell darf sie nicht vorgeben.

Ersetze im `getCart`-Callback `NOT_IMPLEMENTED` durch `toolHandlers.getCart(loginId)` und benenne `_loginId` um. Der Rückgabetyp bleibt `CartResult`. Die Handler stehen in `src/lib/tools/handlers.server.ts`.

**Prüfung:** Angemeldet ein leeres oder gefülltes Resultat; abgemeldet weiterhin `LOGIN_REQUIRED`.

### Schritt 2: Artikel hinzufügen

Verbinde `addToCart` mit dem asynchronen Handler. Benenne die vorbereiteten Parameter um:

```ts
execute: forSession(async (loginId, input): Promise<CartResult> =>
  toolHandlers.addToCart(loginId, input),
),
```

**Prüfung:** «Lege zwei Vollmilch in den Warenkorb» führt Suche und Hinzufügen aus. Nach Neuladen zeigt der Shop die Menge. Ein weiteres Add summiert sie in derselben Position.

### Schritt 3: Artikel entfernen

Verbinde `removeFromCart` mit `toolHandlers.removeFromCart(loginId, input)`; benenne `_loginId` und `_input` um. `forSession` und das Schema bleiben erhalten.

**Prüfung:** Vorhandene Position entfernen; eine unbekannte Artikelnummer liefert `ok: false`.

### Schritt 4: Resultate darstellen und die Seite aktualisieren

In `src/features/chat/ui/ToolPartView.tsx` die generische Ausgabe für `tool-getCart`, `tool-addToCart` und `tool-removeFromCart` ersetzen:

- Solange `part.state !== 'output-available'`: einen Wartehinweis rendern.
- Bei `!part.output.ok`: `Note` mit `error` und `part.output.error` verwenden.
- Sonst Artikelbezeichnung, Menge, `lineTotal`, `totalItems` und `totalAmount` rendern. `formatMoney` ist importiert. Ein gemeinsames `CartTable` kann `Extract<CartResult, { ok: true }>` aus `lib/tools/results.ts` verwenden.
- Bei nicht leerem Warenkorb einen Button «Bestellung abschliessen» anbieten, der `actions.onCheckout()` aufruft und bei `actions.actionsDisabled` deaktiviert ist.

Im markierten Effect in `ChatbotWidget.tsx` nach erfolgreichen `tool-addToCart`, `tool-removeFromCart` und `tool-checkout` `dispatchCartChanged()` aufrufen. Die bestehende Deduplizierung über `handledToolCalls` erhalten. So aktualisieren sich Header, Warenkorb und Orders ohne Reload.

Die Produktkarten-Buttons und die direkten API-Aktionen sind fertige Grundlage: Ein bewusster Klick führt die Aktion aus und ergänzt den Chat-Verlauf, ohne Modellaufruf. Zum Prüfen der zu implementierenden Modell-Tools deshalb Texteingaben verwenden.

### Schritt 5: Modell-Checkout mit Freigabe

Diese Teile gemeinsam implementieren, bevor du den Checkout über den Chat ausprobierst:

1. In `chat-route.server.ts` am TODO `toolApproval: { checkout: 'user-approval' },` setzen.
2. In `ToolPartView.tsx` den `tool-checkout`-Fall ergänzen. Bei `approval-requested` «Abbrechen» und «Bestellung abschicken» anbieten; diese rufen `actions.onApprove(part.approval.id, false)` bzw. `true` auf. `approval-responded` als ausstehend oder abgelehnt darstellen. Bei `output-available` Fehler oder die erfolgreiche Bestellung mit `orderId`, `submittedAt`, `totalItems` und `totalAmount` anzeigen. `output-denied` und `output-error` sind oberhalb des Switch bereits behandelt.
3. In `ai-tools.server.ts` den Checkout-Callback mit `toolHandlers.checkout(loginId)` verbinden. Danach die ungenutzte Konstante `NOT_IMPLEMENTED` entfernen.

Der Assistant verarbeitet offene Freigaben bereits mit **Ja/Nein** (`assistant-mode.ts`). `addToolApprovalResponse` und das automatische Fortsetzen in `client/chat-client.ts` sind ebenfalls vorbereitet.

**Prüfung:** Vor einer Zustimmung entsteht keine Order. Ablehnung erhält den Warenkorb; Zustimmung erstellt genau eine Order. Ein anschliessendes Add erzeugt einen neuen Warenkorb. Der direkte Workspace-Button ist selbst die ausdrückliche Bestellaktion und verwendet keinen Modell-Freigabezyklus.

## Checks

`npm test`, `npm run typecheck`, `npm run build` und `npm run test:browser` prüfen das Starter-Grundgerüst. Nach Abschluss zusätzlich `npm run test:exercise` ausführen: Die Browser-Abnahme erwartet nun Warenkorbtabelle, direkte Aktionen und Checkout-Freigabe. Die Streams in den Browser-Tests sind deterministische Fixtures; den echten Provider zusätzlich mit Suche → Add → Remove → Checkout (Nein/Ja) prüfen.

Musterlösung: `../02-chatbot-vercel-ai-sdk-solution`. Bonus: Provider in `.env` wechseln; Zustand `input-streaming` im Such-Widget genauer darstellen.
