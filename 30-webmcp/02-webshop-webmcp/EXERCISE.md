# Übung 4 · WebMCP ergänzen

## Ziel der Übung

Du machst den geöffneten Webshop über fünf **WebMCP-Tools** bedienbar:
Ein Browser-Agent kann Produkte suchen, den Warenkorb lesen, Artikel hinzufügen
und entfernen sowie eine Bestellung abschicken. Die Aktionen verwenden das im
Browser ausgewählte Demo-Konto und werden unmittelbar in der Shop-Oberfläche
sichtbar. Zum Entwickeln und Testen übernimmst du selbst die Rolle des Agenten:
Du rufst die Tools in der Chrome-DevTools-Konsole auf. Dafür brauchst du keinen
LLM-API-Key.

Am Ende kannst du erklären, wie ein Tool aus Name, Beschreibung, Eingabeschema
und Ausführungsfunktion entsteht, wie Browser-Session und Shop-Events die
Oberfläche mit den Tools verbinden und weshalb Registrierungen einen Cleanup
brauchen.

| Tool             | Eingabe                               | Wirkung                                                                           |
| ---------------- | ------------------------------------- | --------------------------------------------------------------------------------- |
| `searchProducts` | `{ term: 'Milch' }`                   | Liefert höchstens fünf Treffer und aktualisiert die sichtbare Suche.              |
| `getCart`        | `{}`                                  | Liest den Warenkorb des aktiven Demo-Kontos.                                      |
| `addToCart`      | `{ articleNumber: '…', quantity: 2 }` | Fügt Verkaufseinheiten hinzu und aktualisiert den Warenkorb.                      |
| `removeFromCart` | `{ articleNumber: '…' }`              | Entfernt die ganze Position und aktualisiert den Warenkorb.                       |
| `checkout`       | `{}`                                  | Erstellt eine Demo-Bestellung, leert den Warenkorb und aktualisiert die Aufträge. |

Der Ablauf eines Aufrufs ist:

```text
DevTools-Konsole / Browser-Agent
  → document.modelContext.executeTool(...)
  → registriertes WebMCP-Tool: Eingabe validieren
  → client-api.ts: Web-API mit dem Session-Cookie aufrufen
  → Server: gemeinsamen Shop-Zustand lesen oder ändern
  → Shop-Event: sichtbare Oberfläche aktualisieren
  → strukturiertes Resultat an den Aufrufer zurückgeben
```

Die vorausgehende MCP-App-Übung stellt Search- und Cart-Oberflächen für einen
MCP-Host bereit. Hier kommt eine weitere Anbindung hinzu: JavaScript-Tools der
geöffneten Webseite. Der WebMCP-Bereich der Chrome DevTools untersucht diese
Browser-Tools; die Search- und Cart-App testest du weiterhin im MCP-App-Host.

## Ausgangspunkt: Was ist bereits fertig?

Dieser Starter ist eine eigenständig installierbare Kopie mit den gelösten
Funktionen der vorherigen Workshop-Stufen. Du musst vorherige Übungen nicht in
diesen Ordner kopieren.

- **Webshop und Web-API:** Katalogsuche, Artikeldetails, Kontoauswahl, Warenkorb,
  Mengenänderungen, Checkout und Bestellhistorie funktionieren bereits.
- **Chat:** Der Assistant im Shop und der Workspace unter `/chat` sind fertig.
  Echte Chat-Anfragen benötigen einen konfigurierten Provider mit API-Key.
- **MCP-Server:** HTTP unter `/mcp` und stdio über `npm run start:stdio` sind
  implementiert. HTTP verwendet denselben Shop-Prozess wie die Web-Oberfläche;
  stdio hat als eigener Prozess einen eigenen Zustand.
- **MCP Apps:** Search- und Cart-App, HTML-Resources und lokaler Testhost sind
  vorbereitet und implementiert.
- **WebMCP-Gerüst:** `WebMCPProvider` und die eingebaute Tool-Konsole sind bereits
  eingebunden. Der Provider prüft im React-Effect, ob `document.modelContext`
  vorhanden ist, ruft `registerShopTools` auf und verwendet dessen Cleanup.
- **Gemeinsame Bausteine:** Eingabeschemas, Beschreibungen, API-Client,
  Shop-Events, Resultat-Typen sowie Validierung und Fehlerbehandlung sind fertig.

**Deine Änderung findet in genau einer Datei statt:**
[`src/features/webmcp/webmcp-tools.ts`](src/features/webmcp/webmcp-tools.ts).
Dort ist `shopTools` noch leer und `registerShopTools` enthält noch keine
Registrierung. Diese beiden Lücken füllst du in den Schritten 1–5.

| Vorbereitete Datei                       | Wofür du sie verwendest                                                   |
| ---------------------------------------- | ------------------------------------------------------------------------- |
| `src/lib/tools/contracts.ts`             | Zod-Eingabeschemas, Tool-Namen, Beschreibungen und `toJsonSchema`.        |
| `src/lib/tools/results.ts`               | Typen für erfolgreiche Resultate und `{ ok: false, error }`.              |
| `src/lib/client-api.ts`                  | Browser-Funktionen wie `search`, `getCart` und `checkoutCart`.            |
| `src/lib/shop-events.ts`                 | `dispatchShopSearch` und `dispatchCartChanged` zur Aktualisierung der UI. |
| `src/features/webmcp/WebMCPProvider.tsx` | Bereits eingebundene Registrierung im React-Lebenszyklus.                 |
| `src/features/webmcp/ToolConsole.tsx`    | Bereits eingebautes Panel zum Auflisten und Ausführen der Tools.          |
| `src/webmcp.d.ts`                        | Lokale TypeScript-Deklarationen für die experimentelle Browser-API.       |

## Vorbereitung: Installieren und starten

### A. Voraussetzungen prüfen

Du benötigst Node.js **ab 22.18**, npm, einen Editor und den für den Workshop
vorbereiteten Chrome mit WebMCP-Unterstützung. Prüfe im Terminal:

```bash
node --version
npm --version
```

Alle folgenden `cd`-Befehle mit `01-mock-api` oder `30-webmcp` als erstem
Pfadbestandteil gehen vom **Repository-Hauptverzeichnis `mcp-chopen-2026`** aus.
Öffne für jeden Dienst ein eigenes Terminal in diesem Hauptverzeichnis.
Die Befehle setzen eine Bash-/Zsh-kompatible Shell voraus.

### B. Terminal 1: Katalog-Mock starten

```bash
cd 01-mock-api
npm ci
npm start
```

Lass dieses Terminal laufen. Der Mock liefert die Workshop-Produkte und deren
Bilder auf **http://localhost:4040**. Ein separates Konto oder eine Verbindung
zur echten Katalog-API ist dafür nicht nötig.

### C. Terminal 2: Webshop starten

```bash
cd 30-webmcp/02-webshop-webmcp
npm ci
cp -n .env.example .env
npm run dev
```

`npm ci` installiert die im Lockfile festgelegten Abhängigkeiten. `cp -n`
erstellt die lokale Konfiguration, sofern noch keine `.env` existiert. Prüfe
bei einer vorhandenen Konfiguration im Editor, dass diese Werte gesetzt sind:

```dotenv
CATALOG_MODE=mock
MOCK_CATALOG_ORIGIN=http://localhost:4040
```

`npm run dev` baut zuerst die beiden bereits fertigen MCP Apps und startet dann
Vite auf **http://localhost:3051**. Lass auch dieses Terminal laufen. Änderungen
an TypeScript-Dateien lädt Vite während der Übung nach. Nach Änderungen an `.env`
startest du den Shop mit `Ctrl+C` und `npm run dev` neu.

Für Shop und WebMCP-Tests darf der Modell-Key leer bleiben. Möchtest du zusätzlich
den vorhandenen Chat ausprobieren, konfiguriere einen Provider gemäss
[Setup-Anleitung](../../00-setup-check/README.md).

### D. Den vorhandenen Shop ausprobieren

Öffne **http://localhost:3051** und führe zunächst ohne WebMCP Folgendes aus:

1. Suche nach `Milch` und öffne ein Artikeldetail. Die Suche funktioniert auch
   ohne Anmeldung.
2. Klicke auf **Anmelden** und wähle ein Demo-Konto, beispielsweise
   `restaurant-baeren`. Weitere Konten sind `hotel-alpenblick` und
   `kantine-campus`.
3. Lege einen Artikel per Shop-Button in den Warenkorb, ändere seine Menge und
   entferne ihn wieder.
4. Lege erneut einen Artikel hinein und schicke eine Demo-Bestellung ab. Prüfe,
   dass der Warenkorb leer wird und der Auftrag in der Bestellhistorie erscheint.

Warenkörbe und Aufträge liegen pro Konto im Prozessspeicher des Shops. Ein
Seiten-Reload erhält sie; ein Neustart des Shop-Servers setzt sie zurück.

Optional kannst du die fertigen MCP Apps in einem dritten Terminal starten:

```bash
cd 30-webmcp/02-webshop-webmcp
npm run dev:mcp-host
```

Öffne dann **http://127.0.0.1:43552**. Der Host verbindet sich mit
`http://localhost:3051/mcp` und verwendet zusätzlich Sandbox-Port `43553`.
Für die WebMCP-Übung genügt der Shop auf Port `3051`. Beende diesen optionalen
Host vor `npm run test:browser`, damit die Testports frei sind.

### E. Chrome und DevTools vorbereiten

1. Öffne `chrome://flags/#enable-webmcp-testing` in der Chrome-Adressleiste.
2. Setze **WebMCP for testing** auf **Enabled** und starte Chrome über
   **Relaunch** neu.
3. Öffne wieder **http://localhost:3051**.
4. Öffne die DevTools mit `F12` bzw. `Ctrl+Shift+I` unter Windows/Linux oder
   `Cmd+Option+I` unter macOS und wähle **Console**.
5. Wähle als Ausführungskontext die Shop-Seite (`top`), falls die Konsole mehrere
   Frames oder Extension-Kontexte anbietet.

Für die lokale Entwicklung verwendet diese Übung das Flag; ein Origin-Trial-Token
ist dafür nicht erforderlich. Die Aktivierung beschreibt auch die
[offizielle Chrome-WebMCP-Anleitung](https://developer.chrome.com/docs/ai/webmcp).

**In der Browser-Konsole**, nicht im Terminal, ausführen:

```js
console.table({
  url: location.href,
  modelContext: typeof document.modelContext,
  registerTool: typeof document.modelContext?.registerTool,
  getTools: typeof document.modelContext?.getTools,
  executeTool: typeof document.modelContext?.executeTool,
})
```

Erwartet: die Shop-URL, `object` für `modelContext` und dreimal `function`.
Bei `undefined` prüfe Flag, Browser-Neustart und Workshop-Chrome-Version.
Die Beispiele verwenden die im Starter typisierte API `document.modelContext`.

```js
await document.modelContext.getTools()
```

**Vor der Implementierung ist `[]` richtig.** Die eingebaute Schaltfläche unten
rechts zeigt dann **WebMCP Tool-Konsole (0)**. Ohne verfügbare Browser-API steht
hier **WebMCP nicht verfügbar**; die bisherigen Shop-Funktionen bleiben bedienbar.

### F. Terminal 3: Ausgangszustand optional prüfen

Öffne ein weiteres Terminal im Repository-Hauptverzeichnis:

```bash
cd 30-webmcp/02-webshop-webmcp
npm test
npm run typecheck
npm run build
npx playwright install chromium
npm run test:browser
```

Die Chromium-Installation wird nur beim ersten Einrichten bzw. nach einem
Playwright-Update benötigt. Die Browser-Tests starten eigene Dienste auf
`43554` (Shop), `43555` (Katalog) und `43552`/`43553` (MCP-App-Host/Sandbox).
Die manuell gestarteten Dienste auf `3051` und `4040` dürfen weiterlaufen.

Diese optionalen Prüfungen sollen bereits beim unveränderten Starter erfolgreich
sein. Sie prüfen vor allem die aus früheren Stufen übernommene Funktionalität;
die genaue Abgrenzung zu den neuen WebMCP-Tests steht im Abschlussabschnitt.
`npm run test:exercise` ist dagegen **bis zum Ausfüllen absichtlich rot**, weil
es die fünf fertigen Tools und ihre Registrierung verlangt.

## Schritt 1: Imports ergänzen und Suche definieren

Öffne `src/features/webmcp/webmcp-tools.ts` im Editor. Ersetze den bisherigen
Importblock durch diesen Block. `toToolError` und `defineTool` darunter bleiben
erhalten. Einige Imports werden erst in den nächsten Schritten verwendet;
führe den vollständigen Typecheck nach Schritt 5 aus.

```ts
import type { z } from 'zod'
import {
  ApiRequestError,
  addToCart,
  checkoutCart,
  getCart,
  removeCartItem,
  search,
} from '../../lib/client-api.ts'
import {
  dispatchCartChanged,
  dispatchShopSearch,
} from '../../lib/shop-events.ts'
import {
  addToCartInput,
  emptyInput,
  removeFromCartInput,
  searchProductsInput,
  toJsonSchema,
  toolDescriptions,
} from '../../lib/tools/contracts.ts'
import type { ToolName } from '../../lib/tools/contracts.ts'
import type {
  CartResult,
  CheckoutToolResult,
  SearchProductsResult,
  ToolError,
} from '../../lib/tools/results.ts'
```

Ergänze direkt unter den Imports:

```ts
const MAX_SEARCH_RESULTS = 5
```

Der vorhandene Helper `defineTool(name, schema, annotations, run)` erledigt vier
Dinge für dich: Er übernimmt die gemeinsame Beschreibung, erzeugt JSON Schema,
validiert die Eingabe mit Zod und wandelt Fehler in `{ ok: false, error }` um.
Dein asynchroner Callback erhält somit bereits validierte Eingaben.

Ersetze das leere `shopTools`-Array durch den ersten Eintrag:

```ts
export const shopTools: Array<WebMCPModelContextTool> = [
  defineTool(
    'searchProducts',
    searchProductsInput,
    { readOnlyHint: true, untrustedContentHint: true },
    async ({ term }): Promise<SearchProductsResult> => {
      const data = await search(term)
      dispatchShopSearch(data.searchTerm)
      const articles = data.articles.slice(0, MAX_SEARCH_RESULTS)
      return {
        ok: true,
        searchTerm: data.searchTerm,
        totalCount: data.totalCount,
        shownCount: articles.length,
        articles,
      }
    },
  ),
]
```

`search(term)` ruft `/api/search` auf. Das Event übernimmt den Suchbegriff in die
sichtbare Shop-Suche. `totalCount` bleibt die Gesamtzahl der Treffer aus der API;
`shownCount` zählt nur die höchstens fünf im Tool-Resultat enthaltenen Artikel.
Die Shop-Oberfläche kann deshalb mehr Treffer anzeigen als das kompakte Resultat.

`readOnlyHint: true` beschreibt eine lesende Katalogaktion.
`untrustedContentHint: true` kennzeichnet die gelieferten Produktdaten als Inhalte,
die ein Agent nicht als Anweisungen behandeln soll. Annotationen sind Hinweise;
die Eingabevalidierung übernimmt weiterhin `defineTool`.

**Zwischenstand:** Ein Tool ist definiert, aber noch keines im Browser
registriert. Dass `getTools()` weiterhin leer ist, ist bis Schritt 5 zu erwarten.

## Schritt 2: Warenkorb lesen und Artikel hinzufügen

Füge die folgenden **zwei Einträge innerhalb von `shopTools`** direkt nach dem
Such-Tool und vor der schliessenden `]` ein. Erstelle kein zweites Array.
Die Einträge sind jeweils durch ein Komma getrennt.

```ts
  defineTool(
    'getCart',
    emptyInput,
    { readOnlyHint: true },
    async (): Promise<CartResult> => ({
      ok: true,
      ...(await getCart()),
    }),
  ),
  defineTool(
    'addToCart',
    addToCartInput,
    { readOnlyHint: false },
    async ({ articleNumber, quantity }): Promise<CartResult> => {
      const cart = await addToCart(articleNumber, quantity)
      dispatchCartChanged()
      return {
        ok: true,
        ...cart,
        message: `${quantity} × ${articleNumber} wurde in den Warenkorb gelegt.`,
      }
    },
  ),
```

`emptyInput` beschreibt ein leeres Eingabeobjekt: Der Aufrufer übergibt `{}`.
`getCart()` liefert unter anderem `items`, `totalItems` und `totalAmount`.
Durch `...` übernimmst du diese Felder in das Resultat und ergänzt `ok: true`.

`addToCartInput` erwartet eine Artikelnummer als String und eine positive ganze
Menge innerhalb der Shop-Limite. Ohne Mengenangabe setzt das Schema `quantity`
auf `1`. Verwende Artikelnummern aus Suchresultaten, damit führende Nullen erhalten
bleiben. Erst nach dem erfolgreichen API-Aufruf löst du `dispatchCartChanged()`
aus; die Oberfläche lädt daraufhin den aktuellen Zustand nach.

Keines dieser WebMCP-Tools nimmt eine `loginId` entgegen. Der API-Client sendet
bei den Aufrufen an denselben Origin den Browser-Cookie mit. Ohne gewähltes Konto
antwortet die Web-API mit HTTP 401; der vorbereitete `toToolError` erzeugt daraus
einen verständlichen Anmeldefehler. Du brauchst weder einen weiteren
Session-Speicher noch zusätzliche Fehlerbehandlung in jedem Callback.

## Schritt 3: Artikel entfernen und Bestellung abschicken

Ergänze die letzten beiden Einträge direkt nach `addToCart`, wieder innerhalb
desselben Arrays:

```ts
  defineTool(
    'removeFromCart',
    removeFromCartInput,
    { readOnlyHint: false },
    async ({ articleNumber }): Promise<CartResult> => {
      const cart = await removeCartItem(articleNumber)
      dispatchCartChanged()
      return {
        ok: true,
        ...cart,
        message: `Artikel ${articleNumber} entfernt.`,
      }
    },
  ),
  defineTool(
    'checkout',
    emptyInput,
    { readOnlyHint: false },
    async (): Promise<CheckoutToolResult> => {
      const { orderId, submittedAt, totalItems, totalAmount } =
        await checkoutCart()
      dispatchCartChanged()
      return { ok: true, orderId, submittedAt, totalItems, totalAmount }
    },
  ),
```

`removeCartItem(articleNumber)` entfernt die **gesamte Position**, unabhängig von
ihrer Menge. Das Tool benötigt deshalb keinen `quantity`-Parameter.

`checkoutCart()` erstellt die Bestellung auf dem Server und leert den Warenkorb.
Übernimm Bestellnummer, Zeitpunkt, Menge und Betrag aus der API-Antwort. Das
anschliessende Cart-Event lässt die Oberfläche sowohl Warenkorb als auch Aufträge
neu laden.

Die gemeinsame Tool-Beschreibung verlangt eine ausdrückliche Bestätigung vor
einem Agenten-Checkout. Der hier implementierte Callback selbst öffnet keinen
Bestätigungsdialog: Beim manuellen Test löst du den Demo-Checkout bewusst aus.
Die Freigabe-UI des vorhandenen Modell-Chats gehört zu dessen eigenem Ablauf.

## Schritt 4: Resultate und Shop-Events nachvollziehen

Du hast jetzt diese Reihenfolge in `shopTools`:
`searchProducts`, `getCart`, `addToCart`, `removeFromCart`, `checkout`.
Prüfe deine Implementierung anhand dieser Zuordnung:

| Tool             | Vorhandene API-Funktion              | Event nach erfolgreichem Aufruf       |
| ---------------- | ------------------------------------ | ------------------------------------- |
| `searchProducts` | `search(term)`                       | `dispatchShopSearch(data.searchTerm)` |
| `getCart`        | `getCart()`                          | Keines; der Aufruf liest nur.         |
| `addToCart`      | `addToCart(articleNumber, quantity)` | `dispatchCartChanged()`               |
| `removeFromCart` | `removeCartItem(articleNumber)`      | `dispatchCartChanged()`               |
| `checkout`       | `checkoutCart()`                     | `dispatchCartChanged()`               |

Alle Callbacks sind `async` und warten mit `await` auf die Web-API. Schlägt diese
fehl, fängt `defineTool` den Fehler ab. Weil das Event **nach** `await` steht,
wird bei einem Fehler keine erfolgreiche Änderung signalisiert.

Lies ergänzend die Event-Listener in `src/routes/index.tsx`: `shop:search`
aktualisiert die Suche; `shop:cart-changed` invalidiert die Query-Daten für
Warenkorb und Aufträge. Du musst dort nichts ergänzen.

## Schritt 5: Tools registrieren und beim Unmount abmelden

Ersetze die vorbereitete Funktion `registerShopTools` am Dateiende vollständig:

```ts
export function registerShopTools(
  modelContext: WebMCPModelContext,
): () => void {
  const controller = new AbortController()
  for (const tool of shopTools) {
    modelContext
      .registerTool(tool, { signal: controller.signal })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        console.error(
          `WebMCP: registerTool(${tool.name}) fehlgeschlagen`,
          error,
        )
      })
  }
  return () => controller.abort()
}
```

Der Parameter heisst nun `modelContext`, weil du ihn verwendest. Jeder Aufruf von
`registerShopTools` erzeugt einen eigenen `AbortController`. Alle fünf
Registrierungen erhalten dasselbe Signal; die zurückgegebene Funktion bricht
beim Cleanup den gesamten Registrierungssatz ab.

`registerTool` liefert ein Promise. Beim React-Cleanup ist ein `AbortError`
erwartet und wird ignoriert. Andere Registrierungsfehler erscheinen mit dem
betroffenen Tool-Namen in der Konsole. Die Funktion selbst bleibt synchron,
damit React ihre Rückgabe direkt als Cleanup verwenden kann.

Der schon vorhandene `WebMCPProvider` ruft diese Funktion ausschliesslich im
Browser-Effect auf. Beim Unmount führt React den Cleanup aus. Beim erneuten
Mounten können die Tools dadurch wieder registriert werden. Registriere sie
nicht zusätzlich in der Browser-Konsole.

Speichere die Datei und führe in Terminal 3 im Starter-Verzeichnis aus:

```bash
npm run typecheck
npm run test:exercise
```

Beide Befehle sollen jetzt erfolgreich sein. Der Übungstest prüft die fünf
Schemas, die API-Aufrufe, ungültige Eingaben, Cart-Events und den gemeinsamen
Abort-Cleanup mit Testdoubles. Er verwendet noch keine native Chrome-API.

## Schritt 6: Im Browser testen und verifizieren

### 6.1 Tools auflisten und Eingabeschema ansehen

Lade **http://localhost:3051** nach Abschluss der Implementierung einmal neu.
Führe die folgenden `js`-Blöcke nacheinander in **DevTools → Console** aus.
Die Beispiele verwenden `var`, damit du sie in derselben Konsole wiederholen
kannst. Nach einem Seiten-Reload musst du die Variablen und Helper erneut anlegen.

```js
var webmcpTools = await document.modelContext.getTools()
console.table(
  webmcpTools.map(({ name, description }) => ({ name, description })),
)
console.assert(webmcpTools.length === 5, 'Es müssen genau fünf Tools sein.')
console.assert(
  new Set(webmcpTools.map((tool) => tool.name)).size === 5,
  'Jeder Tool-Name muss genau einmal vorkommen.',
)
```

Erwartet sind die fünf Namen aus der Zieltabelle. Die Reihenfolge der vom Browser
zurückgegebenen Liste ist für die Prüfung nicht relevant. Die eingebaute
Tool-Konsole sollte nun ebenfalls fünf Tools anzeigen.

```js
var searchTool = webmcpTools.find((tool) => tool.name === 'searchProducts')
var searchSchema =
  typeof searchTool.inputSchema === 'string'
    ? JSON.parse(searchTool.inputSchema)
    : searchTool.inputSchema
console.log(searchSchema)
```

Prüfe, dass das Schema das Pflichtfeld `term` vom Typ `string` enthält. Der
Schemawert aus `getTools()` kann serialisiert vorliegen; deshalb liest das
Beispiel beide Darstellungen.

### 6.2 Einen Aufruf ausführen und den Helper vorbereiten

Ein direkter Aufruf besteht aus dem **Tool-Deskriptor aus `getTools()`** und der
als JSON-String serialisierten Eingabe. Auch das Resultat kommt als JSON-String zurück:

```js
var rawSearch = await document.modelContext.executeTool(
  searchTool,
  JSON.stringify({ term: 'Milch' }),
)
console.log(rawSearch)
console.log(JSON.parse(rawSearch))
```

Diese String-Eingabe wurde mit der nativen API in Chrome 152 geprüft. Sie
entspricht `src/webmcp.d.ts`, der eingebauten Tool-Konsole und der
[Chrome-Anleitung zur imperativen API](https://developer.chrome.com/docs/ai/webmcp/imperative-api#execute-tool).
Der aktuelle [WebMCP-Spezifikationsentwurf](https://webmachinelearning.github.io/webmcp/#dom-modelcontext-executetool)
beschreibt bereits eine Objekt-Eingabe; diese ist im getesteten Chrome noch nicht
verwendbar. Die native Testsuite erkennt solche Versionsunterschiede. Verwende
für den Workshop die hier getestete Signatur; das erste Argument ist ein
Deskriptor und kein Tool-Name als String.

Definiere für die weiteren Aufrufe diesen Helper:

```js
var callShopTool = async (name, input = {}) => {
  var tools = await document.modelContext.getTools()
  var tool = tools.find((candidate) => candidate.name === name)
  if (!tool) throw new Error(`Tool ${name} fehlt. Schritte 1–5 prüfen.`)
  var raw = await document.modelContext.executeTool(tool, JSON.stringify(input))
  return raw === null ? null : JSON.parse(raw)
}
```

Der Helper holt bei jedem Aufruf den aktuellen Deskriptor, serialisiert die
Eingabe und wandelt das Resultat in ein JavaScript-Objekt um. Er führt jedes Tool
einmal aus und wiederholt mutierende Aufrufe nicht automatisch.

### 6.3 Suche ohne Anmeldung testen

Melde dich im Shop über **Konto wechseln → Abmelden** ab, falls noch ein Konto
aktiv ist. Führe aus:

```js
var searchResult = await callShopTool('searchProducts', { term: 'Milch' })
console.log(searchResult)
console.table(searchResult.articles)
console.assert(searchResult.ok === true, 'Die Suche muss erfolgreich sein.')
console.assert(searchResult.shownCount === searchResult.articles.length)
console.assert(searchResult.shownCount <= 5)
var articleNumber = searchResult.articles[0]?.articleNumber
console.assert(
  typeof articleNumber === 'string',
  'Ein Suchtreffer wird benötigt.',
)
```

Erwartet: Produktdaten mit Artikelnummern, höchstens fünf Artikel im Resultat und
`Milch` als sichtbarer Suchbegriff im Shop. Bewahre `articleNumber` für die
folgenden Aufrufe auf. Bei fehlenden Treffern prüfe den Katalog-Mock.

### 6.4 Anmeldefehler prüfen, dann ein Konto auswählen

Noch abgemeldet ausführen:

```js
var loggedOutCart = await callShopTool('getCart', {})
console.log(loggedOutCart)
console.assert(loggedOutCart.ok === false)

var loggedOutAdd = await callShopTool('addToCart', {
  articleNumber,
  quantity: 2,
})
console.log(loggedOutAdd)
console.assert(loggedOutAdd.ok === false)
```

Beide Resultate sollen `ok: false` und den Hinweis enthalten, zuerst ein
Demo-Konto auszuwählen. Ein zugehöriger HTTP-401-Eintrag in DevTools ist bei
diesem Test erwartet.

Wähle nun im Shop **Anmelden → Restaurant Bären** (`restaurant-baeren`). Warte,
bis das aktive Konto angezeigt wird. Leere für einen reproduzierbaren Durchlauf
einen eventuell noch vorhandenen Warenkorb über die Shop-Oberfläche.

```js
var initialCart = await callShopTool('getCart', {})
console.log(initialCart)
console.assert(initialCart.ok === true)
console.assert(
  initialCart.totalItems === 0,
  'Vor diesem Test den Warenkorb leeren.',
)
```

### 6.5 Hinzufügen und gemeinsame Session prüfen

```js
var added = await callShopTool('addToCart', { articleNumber, quantity: 2 })
console.log(added)
console.assert(added.ok === true)
console.assert(added.totalItems === 2)
console.log(await callShopTool('getCart', {}))
```

Erwartet: zwei Verkaufseinheiten im Resultat und nach dem Nachladen im sichtbaren
Warenkorb, ohne Seiten-Reload. Die Nachricht enthält Menge und Artikelnummer.
**Wiederholtes Ausführen fügt erneut zwei Einheiten hinzu.**

Ändere jetzt die Menge manuell im Shop auf `3` und warte auf die Aktualisierung:

```js
var manuallyChangedCart = await callShopTool('getCart', {})
console.log(manuallyChangedCart)
console.assert(manuallyChangedCart.totalItems === 3)
```

Damit prüfst du beide Richtungen: Tool-Aktionen werden im Shop sichtbar und
manuelle Shop-Aktionen sind beim nächsten Tool-Aufruf lesbar.

### 6.6 Ganze Position entfernen

```js
var removed = await callShopTool('removeFromCart', { articleNumber })
console.log(removed)
console.assert(removed.ok === true)
console.assert(removed.totalItems === 0)
console.assert((await callShopTool('getCart', {})).items.length === 0)
```

Die Position mit ihren drei Einheiten muss vollständig verschwinden. Auch die
sichtbare Warenkorbsumme muss ohne Reload aktualisiert werden.

### 6.7 Demo-Bestellung abschicken und Ergebnis kontrollieren

Fülle den Warenkorb wieder. Ein Checkout nach dem Entfernen aller Positionen
würde nur den Fehlerfall eines leeren Warenkorbs testen.

```js
console.log(await callShopTool('addToCart', { articleNumber, quantity: 2 }))
var beforeCheckout = await callShopTool('getCart', {})
console.log(beforeCheckout)
```

Prüfe die zwei Einheiten im Shop. Mit dem nächsten Aufruf bestätigst du für
diesen Test bewusst das Abschicken der **Demo-Bestellung**:

```js
var order = await callShopTool('checkout', {})
console.log(order)
console.assert(order.ok === true)
console.assert(typeof order.orderId === 'string' && order.orderId.length > 0)
console.assert(!Number.isNaN(Date.parse(order.submittedAt)))
console.assert(order.totalItems === beforeCheckout.totalItems)
console.assert(order.totalAmount === beforeCheckout.totalAmount)

var afterCheckout = await callShopTool('getCart', {})
console.log(afterCheckout)
console.assert(afterCheckout.totalItems === 0)
console.assert(afterCheckout.items.length === 0)
```

Erwartet: Der Warenkorb wird leer und unter den Aufträgen erscheint ohne Reload
die Bestellung mit derselben `orderId` und demselben Betrag. Es gibt keinen fest
vorgegebenen Beispielwert für die serverseitig erzeugte Bestellnummer.

### 6.8 Ungültige Eingaben und leeren Checkout prüfen

```js
try {
  console.log(await callShopTool('addToCart', { articleNumber, quantity: 0 }))
} catch (error) {
  console.log('Der Browser hat die ungültige Eingabe abgewiesen:', error)
}
console.assert((await callShopTool('getCart', {})).totalItems === 0)

var emptyCheckout = await callShopTool('checkout', {})
console.log(emptyCheckout)
console.assert(emptyCheckout.ok === false)
```

Eine Menge von `0` darf keine Position erzeugen. Je nach Chrome-Version weist
bereits die Browser-Schemavalidierung die Eingabe ab; erreicht sie den Callback,
liefert `defineTool` `{ ok: false, error: 'Ungültige Eingabe: …' }`.
Der zweite Checkout liefert einen fachlichen Fehler für den leeren Warenkorb
und darf keine weitere Bestellung erzeugen.

### 6.9 Registrierung bei erneuter Einbindung prüfen

Öffne `src/features/webmcp/WebMCPProvider.tsx`, ergänze vorübergehend einen
Kommentar und speichere. Vite/React kann damit den Effect erneut ausführen.
Entferne den Kommentar anschliessend wieder. Prüfe im Browser erneut:

```js
var registeredAgain = await document.modelContext.getTools()
console.table(registeredAgain.map(({ name }) => ({ name })))
console.assert(registeredAgain.length === 5)
console.assert(new Set(registeredAgain.map((tool) => tool.name)).size === 5)
```

Es sollen weiterhin genau fünf Tools und keine Fehler wegen doppelter Namen
auftreten. Falls Vite dabei einen vollständigen Reload ausführt, prüft dieser
Versuch nur den Neustart. Den gezielten Abort-Cleanup und das Ignorieren von
`AbortError` prüft zusätzlich `npm run test:exercise` mit einem Testdouble.

## Zusätzlich: WebMCP in DevTools und der Inspector-Extension

### Eingebaute Integration: Application → WebMCP

Öffne in den Chrome DevTools **Application → WebMCP**. Unter **Available Tools**
siehst du die registrierten Tools. Wähle `searchProducts`, trage `Milch` als
`term` ein und klicke **Run tool**. Unter **Invoked Tools** kannst du anschliessend
Status, Eingabe und Ausgabe untersuchen. Wiederhole dort beispielsweise `getCart`
mit leerer Eingabe. Vergleiche die Resultate mit den Konsolentests.
Die [DevTools-Anleitung](https://developer.chrome.com/docs/devtools/application/webmcp)
beschreibt dieses Panel und seine Aufrufhistorie.

Falls das Panel fehlt, prüfe den verwendeten Chrome-Build und das aktivierte
Flag `chrome://flags/#enable-webmcp-testing`. Für die Konsolentests müssen die
in der Vorbereitung geprüften API-Methoden verfügbar sein. Die MCP Apps aus der
vorherigen Übung bleiben über den separaten lokalen Host zugänglich.

### Chrome-Extension „WebMCP - Model Context Tool Inspector“

Installiere die Extension aus dem
[Chrome Web Store](https://chromewebstore.google.com/detail/webmcp-model-context-tool/gbpdfapgefenggkahomfgkhfehlcenpd).
Öffne sie über das Erweiterungssymbol, während der Shop-Tab auf
**http://localhost:3051** aktiv ist. Lade die Shop-Seite nach der Installation
gegebenenfalls neu.

Lass dir die registrierten Tools anzeigen, untersuche das Schema von
`searchProducts` und führe es manuell mit `term: Milch` aus. Teste anschliessend
`getCart` ohne Parameter. Auch hier sollen dieselben Daten und Shop-Änderungen
wie bei den Konsolenaufrufen sichtbar sein. Die Extension unterstützt das
Prüfen der Registrierung, Schemas, Resultate und Fehler; weitere Informationen
stehen im [offiziellen WebMCP-Tools-Repository](https://github.com/GoogleChromeLabs/webmcp-tools).

Für diesen zusätzlichen Extension-Test genügt die manuelle Tool-Ausführung.
Ein optionaler Agenten-Chat in der Extension hat seine eigene Modellkonfiguration.
Die automatisierte WebMCP-Abnahme folgt im nächsten Abschnitt.

## Abschluss: Automatisierte Checks und Abnahmekriterien

**Für deine neue WebMCP-Implementierung gibt es zwei zentrale Prüfungen:
`npm run test:exercise` für die Tool-Logik in Node und
`npm run test:webmcp:native` für den echten Browser-Aufruf samt Shop-Oberfläche.** Die umfangreicheren Shop-, Chat-, MCP- und
MCP-App-Tests stammen aus den vorherigen Workshop-Stufen und prüfen, ob deren
bereits funktionierende Abläufe weiterhin funktionieren. Diese zusätzlichen
Regressionstests sind für den Abschluss dieser Übung **optional**.

Alle folgenden Befehle führst du in Terminal 3 im Verzeichnis
`30-webmcp/02-webshop-webmcp` aus. Testbefehle prüfen den Code; sie ergänzen keine
fehlenden Tools und starten keinen dauerhaft nutzbaren Entwicklungsserver.

### Neue WebMCP-Funktionalität: Übungstest ausführen

```bash
npm run test:exercise
```

Dieser Befehl führt ausschliesslich
[`src/features/webmcp/webmcp-tools.acceptance.ts`](src/features/webmcp/webmcp-tools.acceptance.ts)
mit dem eingebauten Node.js-Test-Runner aus. Du kannst denselben Test auch direkt
starten:

```bash
node --test src/features/webmcp/webmcp-tools.acceptance.ts
```

**Erwartet nach Schritt 5: sechs erfolgreiche Tests, keine Fehler.** Beim noch
leeren Starter schlägt diese Prüfung absichtlich fehl. Du brauchst dafür weder
einen laufenden Shop noch den Katalog-Mock, Chrome, das WebMCP-Flag oder einen
LLM-API-Key.

So prüft die Datei deine Implementierung automatisiert:

1. **Registrierung und Schemas:** Der Test importiert deine echten `shopTools`
   und `registerShopTools`. Ein Testdouble für `modelContext` zeichnet auf,
   welche Tools mit welchen Abort-Signalen registriert werden. Geprüft werden
   die fünf erwarteten Namen in der vorgesehenen Reihenfolge, die Schemafelder
   und die Annotationen der Suche. Nach Aufruf des zurückgegebenen Cleanups
   müssen alle aufgezeichneten Signale abgebrochen sein.
2. **Erwarteter Abbruch:** Ein weiteres Registrierungs-Testdouble weist sein
   Promise bei Abbruch mit `AbortError` zurück. Der Test ruft den Cleanup auf
   und prüft, dass dieser erwartete Fehler nicht mit `console.error` protokolliert
   wird. Dafür ist kein tatsächlicher React-Unmount nötig.
3. **Artikel hinzufügen:** Der Test ruft direkt
   `shopTools.find(...).execute({ articleNumber: '022600', quantity: 2 })` auf.
   Dein echter API-Client läuft dabei mit, aber ein ersetztes `fetch` prüft
   URL, HTTP-Methode und JSON-Body und liefert eine vorbereitete Warenkorbantwort.
   Assertions prüfen `ok: true`, die Nachricht mit Menge und Artikelnummer sowie
   genau ein Cart-Event.
4. **Suche:** Ein `fetch`-Testdouble erwartet `/api/search?term=Milch` und liefert
   eine leere Trefferliste. Der Test prüft das vollständige Suchresultat mit
   `ok`, `searchTerm`, `totalCount`, `shownCount` und `articles`. Der Aufruf erfolgt
   ohne zusätzliche Execute-Optionen.
5. **Ungültige Eingabe:** Der Test übergibt eine leere Artikelnummer und eine
   ungültige Menge. Er erwartet `{ ok: false, error: 'Ungültige Eingabe: …' }`.
   Das ersetzte `fetch` würde den Test sofort scheitern lassen, wenn trotz
   ungültiger Eingabe eine Netzwerkanfrage versucht würde.
6. **Lesen, Entfernen und Checkout:** Der Test prüft die passenden URLs und
   HTTP-Methoden für `getCart`, `removeFromCart` und `checkout`, die übernommenen
   Bestellfelder und die beiden Cart-Events nach Entfernen und Checkout.

Ein **Testdouble** ist hier ein kontrollierter Ersatz für eine externe
Schnittstelle. Statt eines Browserfensters stellt der Test ein `EventTarget`
als `window` bereit und zählt die ausgelösten Cart-Events. Statt echter
HTTP-Antworten liefert `fetch` feste Testdaten; nach jedem Test wird das
ursprüngliche `fetch` wiederhergestellt. Die eigentliche Tool-Implementierung,
die Zod-Validierung und der Browser-API-Client werden dabei ausgeführt.

**Grenze dieser Tests:** Sie rufen die Tool-Callbacks direkt auf, nicht
`document.modelContext.executeTool` in Chrome. Sie prüfen weder die native
Registrierung noch reale Session-Cookies oder die sichtbare UI-Aktualisierung.
Auch die Begrenzung auf fünf Treffer und das Such-Event werden vom vorhandenen
Suchtest mit leerer Trefferliste nicht gesondert nachgewiesen. Deshalb bleiben
die native E2E-Suite und die Konsolentests aus Schritt 6 wichtig: Sie prüfen
diese Abläufe über die echte Browser-API.

### Neue WebMCP-Funktionalität: echte native E2E-Tests

**Diese Suite prüft den vollständigen Aufrufweg durch Chrome und den Shop.**
Führe nach Schritt 5 aus:

```bash
# Falls Google Chrome noch nicht installiert ist:
npx playwright install chrome
npm run test:webmcp:native
```

Erwartet: **vier erfolgreiche Tests**. Beim unausgefüllten Starter schlägt die
Suite absichtlich fehl, weil die fünf Tools fehlen. Eine fehlende native API
führt ebenfalls zu einem klaren Fehler und nicht zum Überspringen der Tests.

Die Suite startet das installierte Google Chrome mit
`--enable-features=WebMCPTesting`. Das Flag musst du für diesen automatisierten
Browser nicht manuell setzen. Shop und Katalog-Mock werden auf `43556` und `43557`
automatisch gestartet und beendet. Diese Ports müssen frei sein; deine manuell
gestarteten Workshop-Dienste dürfen weiterlaufen. Die native Suite braucht keine
Extension und keinen LLM-Key. `npx playwright install chromium` aus der
Vorbereitung ersetzt die Installation des hier verwendeten Chrome-Kanals nicht.

So laufen die vier Tests ab:

1. **Registrierung, Suche und Anmeldefehler:** Playwright wartet auf genau fünf
   native Tools, prüft ihre Schemas und führt die Suche über
   `document.modelContext.executeTool()` aus. Die mehr als fünf Milch-Treffer des
   Katalogs ergeben fünf Artikel im Tool-Resultat und die vollständige sichtbare
   Trefferliste. Ohne Anmeldung liefern die vier Cart-/Checkout-Tools Fehler.
2. **Tool-Konsole nach Reload:** Nach dem Neuladen sind wieder fünf Tools
   registriert. Playwright bedient die eingebaute Tool-Konsole und prüft, dass
   deren nativer Suchaufruf erfolgreich ist und die Shop-Suche aktualisiert.
3. **Gemeinsame Session, Warenkorb und Checkout:** Playwright meldet sich über
   die UI an, fügt per Tool Artikel hinzu, ändert eine Menge manuell und liest sie
   per Tool zurück. Ein Kontowechsel prüft die Trennung der Warenkörbe. Entfernen
   und Checkout aktualisieren die UI ohne Reload; Bestellnummer und Beträge
   stammen aus dem echten Test-Shop. Ein leerer Checkout erzeugt keinen Auftrag.
4. **Fehler ohne Änderung:** Menge `0` und eine unbekannte Artikelnummer werden
   abgewiesen. Der Warenkorb bleibt unverändert.

Die Tests entdecken den Tool-Deskriptor und führen ihn innerhalb desselben
`page.evaluate`-Aufrufs aus. Dadurch bleibt seine `Window`-Referenz im Browser.
Die Eingabe wird als JSON-String übergeben und das Resultat für die Assertions
wieder geparst. Anschliessend wartet Playwright auf die sichtbaren Shop-Änderungen.
**`modelContext`, `fetch` und die Tool-Callbacks bleiben echt.** Nur der externe
Katalogdienst ist der vorhandene Workshop-Mock.

Zum sichtbaren Mitverfolgen:

```bash
npm run test:webmcp:native -- --headed
```

Die Suite verwendet eine eigene Konfiguration und ist nicht in `npm test` oder
`npm run test:browser` enthalten. Der native Reload-Test ersetzt nicht den
Node-Test des gezielten Abort-Cleanups im selben Dokument. Die DevTools-Oberfläche,
die Inspector-Extension und Agentenentscheidungen werden weiterhin manuell geprüft.
Dateien, Voraussetzungen, Browser-Version und Fehlerdiagnose stehen in
[docs/WEBMCP-TESTING.md](docs/WEBMCP-TESTING.md).

### Weitere Prüfungen des WebMCP-Gerüsts

Für das neue WebMCP-Gerüst gibt es ausserdem diesen kurzen Node-Test:

```bash
node --test src/features/webmcp/webmcp-tools.test.ts
```

Er prüft, dass das Modul ohne native Browser-API geladen werden kann, keine
Tool-Namen doppelt vorkommen und eine aufrufbare Cleanup-Funktion zurückgegeben
wird. **Er darf bereits beim leeren Starter grün sein** und ersetzt daher den
Übungstest nicht. Dieser Gerüsttest läuft auch innerhalb von `npm test`.

Zwei WebMCP-bezogene Browser-Tests lassen sich gezielt ausführen:

```bash
npx playwright test test/e2e/webshop/classic-webshop.spec.ts --project=webshop-desktop --project=webshop-mobile
```

Diese Datei prüft auf Desktop und Mobile, dass React bei schon vorhandener
WebMCP-API ohne Konsolenfehler startet und der klassische Shop ohne experimentelle
API weiterhin bedienbar ist. Im ersten Test wird `document.modelContext` vor dem
Seitenstart durch ein Testdouble ersetzt: `getTools()` liefert immer `[]` und
`executeTool()` nur `'{}'`. **Es wird dabei kein echter WebMCP-Tool-Aufruf getestet.**
Diese Tests sichern die Einbindung und das Verhalten ohne API ab; die sechs
Übungstests sichern deine Tool-Logik ab.

Für diesen Browser-Check muss Playwright-Chromium installiert sein
(`npx playwright install chromium`, siehe Vorbereitung). Die vorhandene
Playwright-Konfiguration startet auch bei dieser Dateiauswahl ihre Testdienste
auf `43554`, `43555` und `43552`/`43553`; beende vorher einen manuell gestarteten
MCP-App-Host. Ein Chrome-WebMCP-Flag und Modell-API-Keys werden nicht benötigt.

### Typecheck und Build: technische Checks, keine Verhaltenstests

Prüfe nach der Implementierung die TypeScript-Verträge und Imports:

```bash
npm run typecheck
```

Dieser Check umfasst das ganze Projekt und damit auch deine neuen WebMCP-Tools.
Er führt keine Tools aus. Ein erfolgreicher Typecheck allein belegt daher noch
kein korrektes Laufzeitverhalten.

Optional kannst du zusätzlich die Build-Fähigkeit prüfen:

```bash
npm run build
```

Der Befehl erzeugt den Produktionsbuild des Shops und der bereits vorhandenen
MCP Apps. Er ist ein Build-Check, kein Funktionstest und kein Deployment.

### Optional: übernommene Funktionen aus früheren Stufen prüfen

Diese Regressionstests sind sinnvoll, wenn du zusätzlich sicherstellen möchtest,
dass die WebMCP-Ergänzung keine vorhandenen Abläufe beeinträchtigt hat:

| Optionaler Befehl      | Herkunft und geprüfte bestehende Funktionalität                                                                                                                                                                                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`             | Node-Tests der Shop-/Chat-Grundlage sowie der MCP-Stufe: unter anderem Warenkorbregeln, Checkout, Kontotrennung, Katalogkonfiguration, Chat-Verarbeitung und MCP-Aufrufe über HTTP und stdio. Dazu kommt der oben beschriebene WebMCP-Gerüsttest.                                      |
| `npm run test:browser` | Vollständige Playwright-Suite: übernommene Shop-Abläufe wie Suche, Mengenänderung, Entfernen und Checkout, direkte Widget-Aktionen aus der Chat-Stufe sowie Search- und Cart-App-Abläufe im MCP-App-Host. Zusätzlich laufen die beiden oben beschriebenen WebMCP-Einbindungstests mit. |

```bash
# Optional: bestehende Shop-, Chat- und MCP-Funktionalität prüfen
npm test

# Optional: sämtliche vorhandenen Browser-Abläufe prüfen
npm run test:browser
```

`npm test` baut zuerst die MCP-App-Resources für seine Prüfungen. Es führt
**nicht** `webmcp-tools.acceptance.ts` aus: Diese Datei endet absichtlich auf
`.acceptance.ts` und wird ausschliesslich über `npm run test:exercise` geprüft.
Ein grünes `npm test` bedeutet deshalb nicht, dass die WebMCP-Übung gelöst ist.

Die übernommenen Tests verwenden je nach Ebene lokale Testserver, Testdoubles
und deterministische Modellantworten. Die Browser-Suite startet die isolierten
Dienste wie in der Vorbereitung beschrieben. Kostenpflichtige Modellaufrufe
gehören nicht zu diesen beiden Befehlen.

### Abnahmekriterien für diese Übung

Die Übung ist abgeschlossen, wenn:

- genau fünf WebMCP-Tools registriert sind und ihre Schemas zu den Aufrufen passen;
- Suche ohne Konto funktioniert und die sichtbare Suche aktualisiert;
- Cart-Tools ohne Konto einen verständlichen Fehler liefern;
- Browser und Tools nach der Anmeldung denselben Warenkorb verwenden;
- Hinzufügen, Entfernen und Checkout die Oberfläche ohne Reload aktualisieren;
- der Checkout echte Werte der Demo-API zurückgibt und eine Bestellung sichtbar ist;
- ungültige Eingaben keine unerwünschten Zustandsänderungen auslösen;
- Cleanup und erneute Registrierung funktionieren;
- `npm run test:exercise`, `npm run test:webmcp:native` und `npm run typecheck`
  erfolgreich sind. Die optionalen
  Regressionstests der früheren Workshop-Stufen sind keine Voraussetzung für die
  Abnahme dieser WebMCP-Übung.

Zum Beenden drückst du in den laufenden Server-Terminals jeweils `Ctrl+C`.
Die Musterlösung zum Vergleichen liegt unter
[`../02-webshop-webmcp-solution`](../02-webshop-webmcp-solution).
Den deklarativen WebMCP-Ansatz mit HTML-Formularen zeigt die eigenständige Demo
[`../01-hello-webmcp`](../01-hello-webmcp); in dieser Übung ergänzt du den
imperativen Adapter.
