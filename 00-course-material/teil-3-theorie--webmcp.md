# Teil 3 · WebMCP: Die Agent-gesteuerte App

Stand: August 2026. WebMCP ist ein Entwurf der W3C Web Machine Learning Community Group und wird laufend geändert; die Angaben hier entsprechen der Spezifikation und der Chromium-Implementierung zu diesem Zeitpunkt.

## Unterlagen dieses Teils

| Schritt                                                            | Ordner                                                                                          |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Demo: deklaratives und imperatives Tool auf einer statischen Seite | [01-hello-webmcp](../30-webmcp/01-hello-webmcp/README.md)                                                    |
| Übung 4: Webshop-Tools per WebMCP exponieren                       | [02-webshop-webmcp](../30-webmcp/02-webshop-webmcp/README.md) · [EXERCISE.md](../30-webmcp/02-webshop-webmcp/EXERCISE.md) |
| Musterlösung                                                       | [02-webshop-webmcp-solution](../30-webmcp/02-webshop-webmcp-solution/README.md)                              |

## 1. Was WebMCP ist

Teil 1 hat die KI in die App geholt (die App ruft das Modell, die App zahlt). Teil 2 hat die App in die KI gebracht (ein MCP-Server, den ein Host wie Claude aufruft). WebMCP ist der dritte Weg: **Die Webseite selbst exponiert ihre Funktionen als Tools, und ein Agent im Browser ruft sie auf.**

- Die Tools sind JavaScript-Funktionen im Tab. Sie laufen mit der Session, den Cookies und dem DOM der Seite.
- Es gibt keinen Transport: kein HTTP, kein stdio, kein JSON-RPC. Der Browser vermittelt zwischen Seite und Agent.
- Das Modell bringt der Agent mit (Browser-Funktion, Extension, Automatisierungs-Framework). Die Seite enthält keinen Modell-Aufruf und keinen API-Key.
- Die Alternative, die WebMCP ablösen soll: Agenten, die Screenshots und DOM parsen und auf Buttons klicken (Computer Use). Tools mit Schema sind schneller, billiger und zuverlässiger als Pixel-Raten.

Einstiegspunkt ist `document.modelContext`, ein `EventTarget` mit drei Methoden:

```ts
document.modelContext.registerTool(tool, { signal }); // Promise<void>
document.modelContext.getTools(); // Promise<RegisteredTool[]>
document.modelContext.executeTool(tool, JSON.stringify(input)); // Promise<string | null>
```

### Verhältnis zu MCP

|                     | MCP (Teil 2)                                     | WebMCP (Teil 3)                                                          |
| ------------------- | ------------------------------------------------- | ------------------------------------------------------------------------- |
| Wo laufen die Tools | Server-Prozess                                    | Browser-Tab der Seite                                                     |
| Transport           | stdio, Streamable HTTP (JSON-RPC)                 | keiner, Browser-API                                                       |
| Wer ruft auf        | MCP-Host (Claude, ChatGPT, IDE)                   | Browser-Agent (Extension, eingebauter Agent)                              |
| Identität / Session | explizite Demo-`loginId` im Tool-Input            | das ausgewählte Demo-Konto im Tab                                         |
| Tool-Definition     | `name`, `description`, `inputSchema`, Annotations | gleich: `name`, `description`, `inputSchema` (JSON Schema), `annotations` |
| Resultat            | `content[]` + `structuredContent`                 | beliebiger JSON-Wert, der Browser serialisiert ihn                        |
| Weitere Primitive   | Resources, Prompts, Elicitation, Tasks            | nur Tools                                                                 |

Die Tool-Definition ist absichtlich MCP-kompatibel (Name, Beschreibung, JSON-Schema, `readOnlyHint`). Deshalb funktionieren die lokalen Contracts unverändert: `toolDescriptions` liefert die Beschreibung, `toJsonSchema(searchProductsInput)` das Schema. Was WebMCP nicht hat: einen Content-Envelope (`{ content: [{ type: 'text', ... }] }`), Resources, Prompts, Elicitation, Sessions. Der Name ist Marketing-Verwandtschaft, kein Protokoll-Subset.

## 2. Die zwei APIs

### Imperativ: `registerTool`

```ts
const controller = new AbortController();

await document.modelContext.registerTool(
  {
    name: "searchProducts", // 1-128 Zeichen: ASCII, Ziffern, _ - .
    description: toolDescriptions.searchProducts, // für das Modell
    inputSchema: toJsonSchema(searchProductsInput), // JSON-Schema-Objekt, kein String
    annotations: { readOnlyHint: true },
    async execute(input, { signal }) {
      const result = await search(input.term);
      return result; // beliebiger JSON-Wert
    },
  },
  { signal: controller.signal }, // Abmelden: controller.abort()
);
```

- `registerTool` liefert ein Promise. Es wird mit `NotAllowedError` abgelehnt, wenn die Permissions Policy `tools` das Feature verbietet; ausserhalb eines Secure Context (`https://` oder `http://localhost`) existiert `document.modelContext` nicht.
- **Kein `unregisterTool()`**: Abgemeldet wird über das `AbortSignal`, das bei der Registrierung mitgegeben wurde. Das passt zu React: Registrierung im `useEffect`, Cleanup ruft `controller.abort()`. Ein erneutes `registerTool` mit demselben Namen ersetzt das Tool.
- `execute(input, { signal })`: `input` ist bereits ein Objekt (kein JSON-String). Das `signal` meldet, wenn der Agent die Ausführung abbricht; es kann an `fetch` weitergegeben werden.
- **Rückgabe**: ein beliebiger JSON-serialisierbarer Wert, synchron oder als Promise. Der Browser ruft `JSON.stringify` auf und übergibt den String an den Agenten. Eine Exception oder ein abgelehntes Promise ist ein Tool-Fehler. Im Workshop liefern die Tools `{ ok: false, error }` als Wert, damit das Modell den Fehler lesen und reagieren kann (derselbe Contract wie in Teil 1 und 2).
- `getTools()` liefert die Tools alphabetisch, mit `inputSchema`, `annotations`, `origin` und `window`. Chrome liefert `inputSchema` dabei als JSON-String; zum Untersuchen des Schemas dient `JSON.parse(tool.inputSchema)`. `executeTool(tool, JSON.stringify(input))` führt ein Tool mit als JSON-String serialisierten Eingaben aus und liefert den JSON-String (oder `null`, wenn das Tool eine Navigation ausgelöst hat). Auch eine leere Eingabe muss als `'{}'` übergeben werden. Beide Methoden sind für seiteneigene Agenten und für Tests gedacht; die Tool-Konsole in den Beispielen baut darauf auf. Siehe die [Chrome-Anleitung zu `executeTool()`](https://developer.chrome.com/docs/ai/webmcp/imperative-api#execute-tool).
- Event `toolchange` auf `document.modelContext`, wenn Tools hinzukommen, ändern oder entfernt werden. Chromium feuert zusätzlich `toolactivated` und `toolcancel` auf `window` (noch nicht in der Spezifikation).

### Deklarativ: `<form toolname>`

Ein gewöhnliches HTML-Formular wird per Attribute zum Tool. Der Browser leitet das JSON-Schema aus den Feldern ab:

```html
<form
  toolname="addTodo"
  tooldescription="Fügt der Liste ein Todo hinzu."
  toolautosubmit
>
  <input name="text" required toolparamdescription="Text des Todos" />
  <select name="priority" toolparamdescription="Priorität">
    <option value="normal">normal</option>
    <option value="hoch">hoch</option>
  </select>
  <button type="submit">Hinzufügen</button>
</form>
```

- `name` wird zum Schema-Parameter, `required` zu `required[]`, `<select>` zu `enum`, `type="number"` zu `number`, `checkbox` zu `boolean`. `<label for>` und `aria-description` dienen ebenfalls als Beschreibung.
- Ohne `toolautosubmit` füllt der Agent nur aus und fokussiert den Submit-Button; der Mensch sendet ab. Mit `toolautosubmit` sendet der Browser im Auftrag des Agenten.
- Resultat, Weg 1: Der `submit`-Handler ruft `event.preventDefault()` und `event.respondWith(promise)`. `event.agentInvoked` ist `true`, wenn ein Agent das Formular ausgelöst hat.
- Resultat, Weg 2 (Navigation): Das erste `<script type="application/ld+json">` der Zielseite gilt als Resultat (in Diskussion).
- CSS-Pseudo-Klassen `form:tool-form-active` und `button:tool-submit-active`, während der Agent das Formular bedient. Lighthouse hat einen WebMCP-Audit (fehlende `toolname`/`tooldescription`/`toolparamdescription`).

**Erkenntnis:** Deklarativ ist der kleinste Eingriff in eine bestehende Seite (Attribute, kein Skript) und hält den Menschen im Loop. Imperativ ist präziser (eigenes Schema, eigene Resultate) und deckt alles ab, was kein Formular ist. Die Hello-WebMCP-Demo zeigt beide Varianten; die Webshop-Musterlösung verwendet für einen eindeutigen Tool-Contract ausschliesslich imperative Tools.

## 3. Annotations, Sichtbarkeit, Berechtigungen

- `annotations.readOnlyHint` (Standard `false`): Das Tool ändert keinen Zustand. Agenten dürfen Read-only-Tools ohne Rückfrage aufrufen; alles andere verdient eine Bestätigung. Es ist ein Hinweis, keine Durchsetzung.
- `annotations.untrustedContentHint`: Das Resultat kann Inhalte aus fremden Quellen enthalten (Suchresultate, Kommentare, E-Mails). Der Agent soll sie als Daten behandeln, nicht als Anweisungen.
- `title`: optionaler Anzeigename für die Browser-Oberfläche.
- Sichtbarkeit: Standardmässig sehen nur same-origin Frames und der eingebaute Browser-Agent die Tools. `registerTool(tool, { exposedTo: ['https://partner.example'] })` gibt sie weiteren Origins frei; `getTools({ fromOrigins })` filtert beim Lesen. Cross-origin iframes brauchen `<iframe allow="tools">`.
- Permissions Policy `tools`: Eine Seite (oder ein Embedder) kann WebMCP per `Permissions-Policy: tools=()` abschalten. `registerTool` lehnt dann mit `NotAllowedError` ab.
- Tool-Namen sind pro Dokument eindeutig.

## 4. Browser-Status

| Browser         | Stand August 2026                                                                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chrome          | Für den Workshop vorbereitet mit `chrome://flags/#enable-webmcp-testing` ("WebMCP for testing") und der Inspector-Extension. Kein Origin-Trial-Token. |
| Edge            | Dieselbe Chromium-Implementierung; im Workshop wird der vorbereitete Chrome verwendet.                                                                |
| Brave           | experimentell in Leo.                                                                                                                                 |
| Firefox, Safari | keine Implementierung; Standards-Positionen offen.                                                                                                    |

`navigator.modelContext` war der Namensraum der Vorschau-Versionen (Chrome 146 bis 149) und ist seit Chrome 150 deprecated. Ebenfalls verschwunden sind `provideContext()`, `clearContext()` und `unregisterTool()`; das Test-Shim `navigator.modelContextTesting` ist durch `getTools()`/`executeTool()` ersetzt.

**Bewusst weggelassen:** Die statische Hello-Demo verwendet ausschliesslich `document.modelContext` und enthält keine Feature-Detection (`if ('modelContext' in document)`) und keinen Fallback auf `navigator.modelContext`. In einem Browser ohne WebMCP endet die Registrierung mit einem Fehler in der Konsole; die Seite selbst funktioniert weiter. Das hält den Code auf dem Stand der Spezifikation und sichtbar kurz. Der kumulative Webshop prüft dagegen in `WebMCPProvider` bereits `document.modelContext` und überspringt die Registrierung, wenn die API fehlt. Die Tool-Konsole zeigt diesen Zustand; Shop, Chat und MCP bleiben bedienbar.

Typen: Das npm-Package `webmcp-types` (0.1.5) deklariert `document.modelContext` als optional und kennt Teile der aktuellen API noch nicht. Die Beispiele verwenden deshalb lokale Deklarationen.

## 5. Wer ruft die Tools heute auf

- **Extension "WebMCP - Model Context Tool Inspector"** (Chrome Web Store, Quelle: github.com/beaufortfrancois/model-context-tool-inspector): Side Panel mit Tool-Liste, JSON-Eingabe und "Execute Tool"; optional ein Chat mit Gemini (eigener API-Key). Das Standard-Werkzeug für Entwicklung und Demo.
- **Die Seite selbst** über `getTools()`/`executeTool()`: die Tool-Konsole der Beispiele, oder ein eigener, in die Seite eingebetteter Agent.
- **Gemini in Chrome**: an der Google I/O 2026 angekündigt ("will soon support WebMCP"), Stand August 2026 nicht in Chrome Stable.
- Automatisierung: Browser-Run-Dienste und Frameworks, die Playwright-ähnlich einen Tab steuern und dort `getTools()` aufrufen.
- Nicht dabei: Claude-in-Chrome-Extension (keine dokumentierte WebMCP-Unterstützung), Copilot in Edge (nur der Origin Trial ist angekündigt), ChatGPT Atlas, Comet.

**Erkenntnis:** Der Standard ist dem Ökosystem voraus. Eine Seite, die heute Tools registriert, bereitet sich auf Agenten vor, die es als Produkt noch kaum gibt. Der Aufwand ist gering, weil die Tool-Schicht dünn ist und die Contracts mit MCP geteilt werden.

## 6. Sicherheit

- **Die Tools laufen als der angemeldete Benutzer.** Ein Agent, der `checkout` aufruft, bestellt wirklich. WebMCP hat keine Elicitation und kein MRTR; die Bestätigung vor Seiteneffekten ist Sache des Agenten (Signal: `readOnlyHint: false`) oder des Tools (eigener Dialog vor dem Aufruf). Ein Tool darf nichts können, was der Benutzer im UI nicht auch könnte: Serverseitige Autorisierung bleibt die Grenze.
- **Prompt Injection über Inhalte.** Suchresultate, Produktbeschreibungen, Kommentare: alles, was ein Tool zurückgibt, kann Anweisungen an den Agenten enthalten. `untrustedContentHint: true` markiert solche Tools; Resultate schlank halten (nur Felder, die das Modell braucht).
- **`agentInvoked` im Submit-Handler** unterscheidet Agent von Mensch. Damit kann die Seite Agent-Aufrufe anders behandeln (protokollieren, limitieren, Bestätigung verlangen) oder `respondWith` nur dann aufrufen.
- **Drittinhalte und Frames.** Skripte und Frames derselben Origin können Tools registrieren; fremde Origins nur mit `allow="tools"` und `exposedTo`. Wer fremde Skripte einbindet, gibt ihnen auch die Tool-Oberfläche.
- **Kein Geheimnis im Tool.** Alles, was im Tab liegt, ist für den Agenten und den Benutzer sichtbar (DevTools). API-Keys und Preislogik gehören auf den Server, wie bisher.
- Permissions Policy `tools` erlaubt, WebMCP für eingebettete Seiten abzuschalten.

## 7. Ausblick

- Offene Punkte der Spezifikation: Schema-Ableitung aus Formularen (Abschnitt noch TODO), Resultat über Navigation (`ld+json`), die Chromium-Events `toolactivated`/`toolcancel`, Streaming-Resultate, Kontext über Tools hinaus (das entfernte `provideContext`).
- Ob WebMCP ausserhalb von Chromium landet, ist offen (Mozilla- und WebKit-Positionen offen). Polyfill: `demos/shared/webmcp-polyfill.js` in GoogleChromeLabs/webmcp-tools.
- Muster über alle drei Teile: Ein Tool-Contract, ein Domain-Core, drei Transportwege. Die Tool-Schicht ist dünn; die Entscheidung, wer das Modell hostet und zahlt, bestimmt die Architektur (App in Teil 1, Host in Teil 2, Browser-Agent in Teil 3).

## Quellen

- Spezifikation (CG Draft): https://webmachinelearning.github.io/webmcp/
- Explainer: https://github.com/webmachinelearning/webmcp/blob/main/README.md
- Deklarative API: https://github.com/webmachinelearning/webmcp/blob/main/declarative-api-explainer.md
- Implementierungsstatus: https://github.com/webmachinelearning/webmcp/blob/main/implementation-status.md
- Typen: https://www.npmjs.com/package/webmcp-types
- Chrome-Dokumentation: https://developer.chrome.com/docs/ai/webmcp (Imperative API: https://developer.chrome.com/docs/ai/webmcp/imperative-api, Declarative API: https://developer.chrome.com/docs/ai/webmcp/declarative-api)
- Chrome Origin Trial: https://developer.chrome.com/blog/ai-webmcp-origin-trial · https://chromestatus.com/feature/5117755740913664
- Google I/O 2026: https://developer.chrome.com/blog/chrome-at-io26
- Edge Origin Trial: https://developer.microsoft.com/en-us/microsoft-edge/origin-trials/trials/0b76fe60-b266-458e-a285-04e375c0c31a
- Tools, Demos, Polyfill: https://github.com/GoogleChromeLabs/webmcp-tools
- Inspector-Extension: https://github.com/beaufortfrancois/model-context-tool-inspector · https://chromewebstore.google.com/detail/webmcp-model-context-tool/gbpdfapgefenggkahomfgkhfehlcenpd
- State of WebMCP (Juli 2026): https://www.spronta.com/blog/state-of-webmcp-july-2026/
