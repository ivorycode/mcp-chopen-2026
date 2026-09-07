<details>
<summary>Hinweise zum Foliensatz</summary>
<ul>
<li>Markdown-Foliensatz zum Tagesprogramm in <a href="WORKSHOP.md"><code>WORKSHOP.md</code></a>, Stand 7. September 2026.</li>
<li>Jeder Abschnitt zwischen zwei --- ist eine Folie. Die Blocknummer steht im Titel.</li>
<li>Die Zeitangaben beziehen sich auf den gesamten Block inklusive Demo und Übung.</li>
<li>Quellen und Moderationshinweise stehen in aufklappbaren Speaker Notes.</li>
</ul>
</details>

# 0 · Vom KI-Chatbot zur MCP-App

- CH Open Workshop-Tage 2026
- Erst kommt die KI in die App, dann die App in die KI
- Ein Webshop als durchgehendes Beispiel

<details>
<summary>Speaker Notes</summary>
<ul>
<li>09:00–09:15 · Einstieg, klassische Shop-Demo und kurzer lokaler Check.</li>
</ul>
</details>

---

## 0 · Drei Zugänge zum Webshop

- **KI in der App:** Ein Chatbot bedient Funktionen unseres Shops
- **App in der KI:** Ein externer Assistent nutzt den Shop über MCP
- **MCP Apps:** Produktkarten und Warenkorb erscheinen im Assistenten
- **WebMCP:** Ein Browser-Agent nutzt Tools der geöffneten Shop-Seite
- Die Shop-Regeln bleiben gleich, Anbindung und Darstellung ändern sich

---

## 0 · Demo: unser Webshop ohne KI

- Konto auswählen, Produkte suchen, Warenkorb ändern, Bestellung abschicken
- Demo-Konten und simulierte Bestellungen, keine echte Authentifizierung
- Warenkörbe und Bestellungen liegen im Prozessspeicher und verschwinden beim Neustart
- Jeder nächste Starter enthält die gelösten Vorstufen und startet mit eigenen Daten
- **Jetzt:** [Webshop-Demo](https://mcp-webshop-demo.fly.dev) ansehen, danach lokalen Katalog und Chatbot-Starter prüfen

<details>
<summary>Speaker Notes</summary>
<ul>
<li>Lokaler Ersatz: <a href="../30-webmcp/02-webshop-webmcp-solution/README.md"><code>../30-webmcp/02-webshop-webmcp-solution/README.md</code></a>.</li>
<li>Beim Einstieg nur den klassischen Shop zeigen. Lokaler Starter: <a href="../10-ai-in-the-app/02-chatbot-vercel-ai-sdk/README.md"><code>../10-ai-in-the-app/02-chatbot-vercel-ai-sdk/README.md</code></a>.</li>
</ul>
</details>

---

## 1a · Ein LLM aus TypeScript aufrufen

- **TypeScript:** JavaScript mit Typprüfung, unser Programm läuft mit Node.js
- **Vercel AI SDK:** Eine Bibliothek für Modellaufrufe bei verschiedenen Anbietern

```ts
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

const result = await generateText({
  model: anthropic('claude-haiku-4-5'),
  prompt: 'Nenne zwei Ideen für ein vegetarisches Mittagessen.',
})

console.log(result.text)
```

- `import` lädt Funktionen, `const` speichert das Ergebnis, `await` wartet auf die Antwort
- `model` wählt das Sprachmodell, `prompt` ist unser Auftrag, `result.text` enthält die Antwort
- Das SDK sendet eine API-Anfrage an den Anbieter, der Schlüssel kommt aus `ANTHROPIC_API_KEY`
- **Als Nächstes:** Wie erhält das Modell Zugriff auf aktuelle Shop-Daten und Funktionen?

<details>
<summary>Speaker Notes</summary>
<ul>
<li>09:15–09:50 · SDK-Einstieg, Tool Calling und Tool-Schleife zusammen 5 Minuten.</li>
<li>Das Beispiel zuerst als einfachen Textaufruf erklären. <code>console.log</code> gibt die Antwort im Terminal aus. Das Sprachmodell läuft beim Anbieter, nicht im Node.js-Prozess.</li>
<li>Voraussetzungen: Pakete ai und <code>@ai-sdk/anthropic</code> installiert, API-Key als Umgebungsvariable gesetzt. Den Schlüssel nicht in den Quellcode schreiben.</li>
<li>Modell-ID und Pakete entsprechen der vorbereiteten Wetter-Demo. Dort kapselt <code>createModel()</code> die Provider-Auswahl und das Laden der <code>.env</code> für alle drei Anbieter.</li>
<li>Referenz: <a href="../10-ai-in-the-app/00-tool-calling-demo-solution/src/provider.ts"><code>../10-ai-in-the-app/00-tool-calling-demo-solution/src/provider.ts</code></a>.</li>
<li>SDK-Dokumentation: <a href="https://ai-sdk.dev/docs/ai-sdk-core/generating-text">https://ai-sdk.dev/docs/ai-sdk-core/generating-text</a>.</li>
</ul>
</details>

---

## 1a · Tool Calling

- Ein Tool beschreibt eine Funktion, die das Modell anfordern kann

```ts
import { tool } from 'ai'
import { z } from 'zod'

const getWeather = tool({
  description: 'Liefert das Wetter für einen Ort.',
  inputSchema: z.object({ city: z.string() }),
  execute: ({ city }) => ({
    city, temperature: 18, condition: 'sonnig', // Demo-Daten
  }),
})
```

- `description` erklärt den Zweck, Zod beschreibt und prüft die Eingabe: `city` muss Text sein
- `tools: { getWeather }` bietet das Tool im `generateText`-Aufruf an
- Das Modell liefert etwa `getWeather({ city: "Bern" })`, das SDK führt `execute` aus

<details>
<summary>Speaker Notes</summary>
<ul>
<li>Das Beispiel zeigt nur die Tool-Definition. Den <code>generateText</code>-Aufruf der vorherigen Folie um <code>tools</code> ergänzen und als Prompt «Wie ist das Wetter in Bern?» verwenden. Die Wetterwerte sind fest vorgegebene Demo-Daten, keine Live-Abfrage.</li>
<li>Für die anschliessende Antwort nach dem Tool-Resultat zusätzlich <code>isStepCount</code> aus ai importieren und <code>stopWhen: isStepCount(4)</code> setzen. Das erklärt die nächste Folie.</li>
<li>Die Livedemo variiert ihre simulierte Temperatur anhand des Ortsnamens.</li>
</ul>
</details>

---

## 1a · Die Tool-Schleife

![Tool-Schleife: Die Anwendung sendet Prompt, Tool-Definitionen und Verlauf an das Modell. Bei einem Tool-Aufruf führt das SDK die Funktion aus, ergänzt das Resultat und ruft das Modell erneut auf. Ohne weiteren Tool-Aufruf gibt die Anwendung die Textantwort aus.](slides-assets/tool-schleife.svg)

- Die Schleife läuft in der Anwendung, das SDK übernimmt die einzelnen Schritte
- `stopWhen: isStepCount(4)` begrenzt die Schleife auf höchstens vier Modellaufrufe

<details>
<summary>Speaker Notes</summary>
<ul>
<li>Das Limit kann die Schleife auch vor einer abschliessenden Textantwort beenden.</li>
<li>Das Modell kann mehrere Tools in einer Runde anfordern. Das Diagramm zeigt zur Einführung einen einzelnen Tool-Aufruf. Bearbeitbare Grafik: <a href="slides-assets/tool-schleife.svg"><code>slides-assets/tool-schleife.svg</code></a>.</li>
</ul>
</details>

---

## 1a · Vom Tool-Aufruf zur Geschäftslogik

![Schichten hinter einem Tool-Aufruf: Die Anwendung sendet Auftrag, Verlauf und Tool-Definitionen an das Sprachmodell. Das Modell antwortet mit toolName und input. Die Tool-Schleife prüft die Argumente und ruft execute der Tool-Definition auf, diese ergänzt den Warenkorb-Handle und delegiert an den Tool-Handler. Der Handler nutzt den Warenkorb im Prozessspeicher und den Katalog-Zugriff, der die Katalog-API als eigenen Prozess anfragt. Das Resultat läuft durch alle Schichten zurück in den Verlauf.](slides-assets/tool-call-schichten.svg)

- Das Modell fordert an, die Anwendung validiert, führt aus und antwortet
- Der Warenkorb liegt im Prozessspeicher, der Katalog ist ein eigener Dienst

<details>
<summary>Speaker Notes</summary>
<ul>
<li>Landkarte für die folgende Demo: Die Nummern 1–5 entsprechen den Schritten im Log.</li>
<li>Die Kette Modell → Tool-Definition → Handler → Datenquelle bleibt in Teil 2 und 3 identisch; nur die oberste Schicht wechselt von SDK-Tool zu MCP-Tool zu WebMCP-Tool.</li>
<li>Wichtig für die Mini-Übung: <code>getArticleDetail</code> ergänzt eine Tool-Definition, der Katalog-Zugriff dafür existiert bereits. <code>addToCart</code> ist das Gegenbeispiel zur Frage «API oder Speicher?»: Es holt zuerst das Artikeldetail über HTTP und legt die Position danach in den In-Memory-Warenkorb. Bearbeitbare Grafik: <a href="slides-assets/tool-call-schichten.svg"><code>slides-assets/tool-call-schichten.svg</code></a>.</li>
</ul>
</details>

---

## 1a · Demo und Mini-Übung: Aufrufe sichtbar machen

- **Wetter-Demo:** Tool-Definition, Modell-Argumente und Ausführung live verfolgen
- **Shop-CLI:** Automatische SDK-Schleife mit manueller Schleife vergleichen
- **Mini-Übung:** `getArticleDetail` als viertes Tool ergänzen ([EXERCISE.md](../10-ai-in-the-app/01-tool-calling-basics/EXERCISE.md))
- **Prüfen:** «Welche Allergene enthält die Vollmilch?» und die Tool-Schritte im Log verfolgen
- **Vergleich:** Provider wechseln und denselben Auftrag wiederholen
- **Optional:** Streaming — Antworttext und Tool-Argumente treffen stückweise ein

<details>
<summary>Speaker Notes</summary>
<ul>
<li>Wetter-Demo: <a href="../10-ai-in-the-app/00-tool-calling-demo-solution/DEMO.md"><code>../10-ai-in-the-app/00-tool-calling-demo-solution/DEMO.md</code></a>.</li>
<li>Musterlösung mit Szenarien: <a href="../10-ai-in-the-app/01-tool-calling-basics-solution/README.md"><code>../10-ai-in-the-app/01-tool-calling-basics-solution/README.md</code></a>.</li>
<li>Streaming ist Schritt 5 der Wetter-Demo und Vorgriff auf 1b; bei Zeitdruck zuerst diesen Punkt und dann den Provider-Vergleich kürzen.</li>
</ul>
</details>

---

## 1b · Chatbot im Webshop: Architektur

![Architektur des Webshop-Chatbots: Der Browser sendet Nachrichten mit dem Session-Cookie an die Chat-Route des App-Servers und erhält einen UI-Stream zurück. Der App-Server hält den API-Key, ruft das Sprachmodell beim Anbieter auf und führt angeforderte Tools über die vorhandene Shop-Logik aus.](slides-assets/chatbot-architektur.svg)

- Der Browser sendet Nachrichten an die Chat-Route des App-Servers
- Der Server hält den Provider-Key und steuert die Tool-Schleife
- Die Tools rufen die vorhandene Shop-Logik auf
- Das gewählte Demo-Konto kommt aus der Browser-Session
- Die App stellt den Modellzugang und verantwortet dessen Verbrauch

<details>
<summary>Speaker Notes</summary>
<ul>
<li>10:05–11:25 · Architektur und Demo zusammen 10 Minuten.</li>
<li>Implementierung: <a href="../10-ai-in-the-app/02-chatbot-vercel-ai-sdk-solution/src/features/chat/"><code>../10-ai-in-the-app/02-chatbot-vercel-ai-sdk-solution/src/features/chat/</code></a>.</li>
</ul>
</details>

---

## 1b · Streaming und zwei Chat-Oberflächen

![Ein Tool-Resultat und zwei Wege zur Anzeige: Der Server ändert den Warenkorb mit addToCart und streamt das Resultat an den Browser. useChat stellt es als Tool-Part bereit. Im Workspace entsteht daraus ein Warenkorb-Widget. Ein Effect löst zusätzlich shop:cart-changed aus, worauf aktive Shop-Ansichten ihre Daten über die Web-API neu laden.](slides-assets/tool-resultat-shop-ui.svg)

- **Streaming:** Text und Tool-Status treffen schrittweise ein, die Oberfläche reagiert bereits während der Antwort
- `useChat` setzt den Stream zu Nachrichten mit Text- und Tool-Parts zusammen
- **Workspace:** Ein fertiges Tool-Resultat liefert die Daten für Produktkarten oder Warenkorb-Widgets
- **Assistant im Shop:** Der Dialog zeigt Text, Tool-Aktionen aktualisieren die vorhandene Shop-Oberfläche
- `shop:cart-changed` meldet eine Änderung, aktive Shop-Ansichten laden Warenkorb und Bestellungen neu

<details>
<summary>Speaker Notes</summary>
<ul>
<li>Das Diagramm zeigt einen erfolgreichen <code>addToCart</code>-Aufruf. <code>output-available</code> bedeutet, dass das Tool-Resultat vollständig vorliegt. <code>ToolPartView</code> rendert daraus im Workspace das Widget. Ein separater Effect in <code>ChatbotWidget</code> reagiert auf abgeschlossene Add-/Remove-/Checkout-Parts und ruft <code>dispatchCartChanged()</code> auf.</li>
<li><code>handledToolCalls</code> verhindert, dass derselbe Tool-Aufruf mehrfach Events auslöst.</li>
<li>Das Event enthält keine Warenkorbdaten. Aktive Empfänger invalidieren ihre Queries und lesen die Web-API erneut. Events erreichen nur das aktuelle Browserfenster, keinen separat geöffneten Shop-Tab. Die Workspace-Widgets sind Darstellungen der jeweiligen Tool-Resultate und werden durch das Shop-Event nicht neu geladen.</li>
<li>Bei <code>searchProducts</code> verwendet der Chat stattdessen <code>shop:search</code> mit dem Suchbegriff.</li>
<li>Referenzen in <a href="../10-ai-in-the-app/02-chatbot-vercel-ai-sdk-solution/src/"><code>../10-ai-in-the-app/02-chatbot-vercel-ai-sdk-solution/src/</code></a>: <code>features/chat/ui/ChatbotWidget.tsx</code>, <code>features/chat/ui/ToolPartView.tsx</code>, <code>lib/shop-events.ts</code> und <code>routes/index.tsx</code>.</li>
</ul>
</details>

---

## 1b · Checkout mit Freigabe

![Checkout mit Freigabe: Das Modell fordert checkout an. Das SDK hält die Ausführung zurück und fordert im Browser eine Entscheidung an. Der Browser sendet die Entscheidung an den Server. Bei Nein bleibt der Warenkorb erhalten und es entsteht keine Bestellung. Bei Ja führt der Server den Checkout aus und liefert bei Erfolg die Bestell-ID.](slides-assets/checkout-freigabe.svg)

- Ein vom Modell angeforderter Checkout wartet auf Zustimmung
- `toolApproval: { checkout: 'user-approval' }` aktiviert die Freigabe am `streamText`-Aufruf
- **Nein:** Warenkorb erhalten, keine Bestellung erzeugen
- **Ja:** Bestellung ausführen und Bestell-ID anzeigen
- Ein direkter Bestellbutton ist selbst die bewusste Bestellaktion

<details>
<summary>Speaker Notes</summary>
<ul>
<li>Im Vercel-Projekt: <code>toolApproval</code> am <code>streamText</code>-Aufruf.</li>
<li>Der Browser erhält einen Tool-Part mit <code>approval-requested</code>. Im Workspace antwortet der Benutzer per Button, im Assistant mit Ja/Nein. <code>addToolApprovalResponse</code> verknüpft die Entscheidung über die <code>approval.id</code> mit dem angeforderten Tool-Aufruf.</li>
<li>Der nächste Request setzt den Ablauf auf dem Server fort. Bei Ablehnung führt das SDK <code>checkout</code> nicht aus (<code>output-denied</code>). Bei Zustimmung führt es den Handler aus und liefert das Resultat (<code>output-available</code>). Zustimmung garantiert keinen Erfolg: Ein leerer Warenkorb kann beispielsweise weiterhin einen fachlichen Fehler liefern.</li>
<li>Fachliche Grundlage: <a href="../10-ai-in-the-app/02-chatbot-vercel-ai-sdk/EXERCISE.md"><code>../10-ai-in-the-app/02-chatbot-vercel-ai-sdk/EXERCISE.md</code></a>.</li>
<li>Die Freigabe gehört zum Chat-Ablauf und schützt nicht automatisch andere Adapter.</li>
</ul>
</details>

---

## 1b · Demo und Übung 1: Warenkorb im Chat

- **Demo:** Suche und Warenkorb in Assistant und Workspace vergleichen
- **Schon fertig:** Shop, Suche, Streaming und Produktkarten
- **Ergänzen:** `getCart`, `addToCart`, `removeFromCart` und `checkout`
- **Verbinden:** Warenkorbdarstellung, Shop-Events und Checkout-Freigabe
- **Prüfen:** Über Texteingaben suchen, hinzufügen, entfernen und Checkout mit Nein/Ja testen
- **Übungsanleitung:** [`10-ai-in-the-app/02-chatbot-vercel-ai-sdk/EXERCISE.md`](../10-ai-in-the-app/02-chatbot-vercel-ai-sdk/EXERCISE.md)

<details>
<summary>Speaker Notes</summary>
<ul>
<li>Direkte Widget-Buttons ersetzen den Test der Modell-Tools nicht.</li>
</ul>
</details>

---

## 1c · Vergleich: TanStack AI (Optional - Alternative zu Vercel SDK)

- Gleiche Shop-Funktionen und Chat-Modi, andere SDK-Anbindung
- Vercel verbindet Schema und Ausführung über `tool()`
- TanStack trennt `toolDefinition()` und Server-Handler über `.server()`
- Vercel nutzt Tool-Approval, TanStack unterbricht per Interrupt bis zur Freigabe
- **Jetzt:** Diese Stellen in der fertigen TanStack-Lösung vergleichen

<details>
<summary>Speaker Notes</summary>
<ul>
<li>11:25–11:30 · Eine Folie direkt am Code zeigen.</li>
<li>Demo: <a href="../10-ai-in-the-app/03-chatbot-tanstack-ai-solution/README.md"><code>../10-ai-in-the-app/03-chatbot-tanstack-ai-solution/README.md</code></a>.</li>
<li>Alternative Übung: <a href="../10-ai-in-the-app/03-chatbot-tanstack-ai/EXERCISE.md"><code>../10-ai-in-the-app/03-chatbot-tanstack-ai/EXERCISE.md</code></a>.</li>
<li>Keine zweite Chat-Implementierung im Tagesprogramm. Die MCP-Kette baut auf Vercel auf.</li>
</ul>
</details>

---

## 2a · MCP: die App für externe Assistenten

![MCP verpackt denselben Tool-Aufruf für externe Assistenten: Ohne MCP ruft die Anwendung im selben Prozess direkt Tool-Definition und Handler auf. Mit MCP steckt das Modell im Host eines externen Assistenten, der MCP-Client sendet denselben Aufruf als standardisierte tools/call-Nachricht über eine Prozess- oder Netzwerkgrenze an unseren MCP-Server, der denselben Handler wie links aufruft und das Resultat als MCP-Nachricht zurückschickt.](slides-assets/mcp-wrapper.svg)

- Model Context Protocol standardisiert den Zugriff auf externe Funktionen und Inhalte
- **Host:** KI-Anwendung, in der der Benutzer arbeitet
- **Client:** MCP-Verbindung innerhalb des Hosts
- **Server:** Stellt die Funktionen und Inhalte unserer Anwendung bereit
- Der Host steuert das Modell, unser Server führt die Shop-Funktionen aus

<details>
<summary>Speaker Notes</summary>
<ul>
<li>11:30–12:00 · Theorie insgesamt 10 Minuten.</li>
<li>MCP ist ein Wrapper um denselben Tool-Aufruf aus Teil 1: gleicher Handler, jetzt hinter einer standardisierten Nachricht statt einem In-Process-Funktionsaufruf. Bearbeitbare Grafik: <a href="slides-assets/mcp-wrapper.svg"><code>slides-assets/mcp-wrapper.svg</code></a>.</li>
<li>Quelle: <a href="https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture">MCP-Architektur</a>.</li>
</ul>
</details>

---

## 2a · Tools, Resources und Prompts

![Ein MCP-Server stellt Tools, Resources und Prompts bereit: Tools sind aufrufbare Funktionen wie add(a, b) oder searchProducts, hervorgehoben als Fokus im Workshop. Resources sind abrufbare Inhalte wie hello://about, Prompts sind wiederverwendbare Nachrichtenvorlagen wie greet.](slides-assets/mcp-capabilities.svg)

- **Tools:** Aufrufbare Funktionen, zum Beispiel `add(a, b)`
- **Resources:** Abrufbare Inhalte, zum Beispiel `hello://about`
- **Prompts:** Wiederverwendbare Nachrichtenvorlagen, zum Beispiel `greet`
- Ein Prompt liefert zunächst eine Vorlage, noch keine Modellantwort
- Im Webshop stehen Tools für Suche, Warenkorb und Bestellungen im Mittelpunkt

<details>
<summary>Speaker Notes</summary>
<ul>
<li>Alle drei kommen vom selben MCP-Server; für den Webshop bleiben Tools im Fokus, Resources und Prompts sind hier nur der Vollständigkeit halber abgegrenzt. Bearbeitbare Grafik: <a href="slides-assets/mcp-capabilities.svg"><code>slides-assets/mcp-capabilities.svg</code></a>.</li>
<li>Quelle: <a href="https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture">MCP-Architektur</a>.</li>
<li>Konkrete Beispiele: <a href="../20-app-in-the-ai/01-hello-mcp/EXERCISE.md"><code>../20-app-in-the-ai/01-hello-mcp/EXERCISE.md</code></a>.</li>
</ul>
</details>

---

## 2a · Transport und Protokollstand

- **stdio:** Der Client startet einen lokalen Serverprozess
- **Streamable HTTP:** Der Client erreicht den Server über einen HTTP-Endpunkt
- Das Repository verwendet die MCP-Revision **2026-07-28**
- Diese Revision übermittelt Version und Client-Fähigkeiten pro Anfrage, ohne Initialisierungs-Handshake
- Fachlichen Zustand verwaltet weiterhin die Anwendung

<details>
<summary>Speaker Notes</summary>
<ul>
<li>Quellen: <a href="https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture">MCP-Architektur</a>, <a href="https://modelcontextprotocol.io/specification/2026-07-28/changelog">Änderungen 2026-07-28</a>.</li>
<li>Header-Details und Migrationen gehören in die Übungsunterlagen.</li>
</ul>
</details>

---

## 2a · Demo und Mini-Übung: Hello MCP

- **Demo:** SDK-Client verbindet sich, listet Angebote auf und ruft sie ab
- **Erkunden:** `add`, `hello://about` und `greet` im Inspector ausprobieren
- **Verbinden:** Im vorbereiteten Host einen echten Tool-Aufruf nachvollziehen
- Der Server ist fertig, es ist kein Code zu ergänzen
- **Optional:** `confirm-demo` zeigt eine Rückfrage über mehrere Request-Runden (MRTR)
- **Übungsanleitung:** [`20-app-in-the-ai/01-hello-mcp/EXERCISE.md`](../20-app-in-the-ai/01-hello-mcp/EXERCISE.md)

<details>
<summary>Speaker Notes</summary>
<ul>
<li>Inspector und SDK-Client benötigen für diese Beispiele keinen Modellaufruf.</li>
<li>MRTR: <a href="https://modelcontextprotocol.io/specification/2026-07-28/changelog">Änderungen 2026-07-28</a>.</li>
<li>Nach diesem Block Mittagspause.</li>
</ul>
</details>

---

## 2b · Der Webshop als MCP-Server

![Der Webshop als MCP-Server: Links der Host eines externen Assistenten mit Sprachmodell und MCP-Client. Rechts unser App-Server als ein Node-Prozess ohne eigenes Sprachmodell. Der MCP-Client sendet tools/call über Streamable HTTP an POST /mcp, unser MCP-Server registriert sechs Tools und delegiert an bestehende Shop-Handler. Diese Handler und ihr In-Memory-Zustand für Warenkorb und Bestellungen werden im selben Prozess sowohl vom MCP-Server als auch von der Web-UI genutzt.](slides-assets/webshop-mcp-server-architektur.svg)

- Der MCP-Adapter verbindet externe Tool-Aufrufe mit vorhandenen Shop-Handlern
- Fünf bekannte Tools für Suche und Warenkorb, zusätzlich `getOrders`
- Der Server liefert lesbaren Text in `content` und Daten in `structuredContent`
- Fachliche Fehler sollen für den Aufrufer auswertbar bleiben
- Der externe Assistent bringt seinen Modellzugang mit

<details>
<summary>Speaker Notes</summary>
<ul>
<li>13:00–14:05 · Einstieg und Demo zusammen 10 Minuten.</li>
<li>Das Sprachmodell steckt im Host, nie in unserem Prozess — unser Server bleibt reine Tool-Ausführung. Web-UI und MCP-Server teilen sich im selben Prozess denselben In-Memory-Zustand. Bearbeitbare Grafik: <a href="slides-assets/webshop-mcp-server-architektur.svg"><code>slides-assets/webshop-mcp-server-architektur.svg</code></a>.</li>
<li>Grundlage: <a href="../20-app-in-the-ai/02-webshop-mcp-server/EXERCISE.md"><code>../20-app-in-the-ai/02-webshop-mcp-server/EXERCISE.md</code></a>.</li>
</ul>
</details>

---

## 2b · Konto und Zustand

- Suche erlaubt eine optionale `loginId`, Cart- und Order-Tools verlangen eine gültige ID
- `loginId` wählt ein Demo-Konto und bietet keinen Zugriffsschutz
- Web-UI und HTTP-MCP teilen innerhalb derselben Shop-Instanz den Zustand
- stdio und andere Projektinstanzen haben eigene Warenkörbe und Bestellungen
- Nach externen MCP-Aktionen den Browser neu laden oder Daten erneut abfragen

---

## 2b · Tool-Vertrag und Freigaben

- Beschreibung und Schema erklären Bedeutung und erlaubte Argumente
- Der Callback prüft das Konto und delegiert an die Shop-Logik
- `cartPayload` ergänzt Warenkorbresultate um Konto und Bestellhistorie
- Der MCP-Shop-Checkout führt einen gültigen Aufruf direkt aus
- Hinweise wie `destructiveHint` ersetzen keine technisch erzwungene Freigabe

<details>
<summary>Speaker Notes</summary>
<ul>
<li>Freigaben: <a href="../20-app-in-the-ai/02-webshop-mcp-server/EXERCISE.md"><code>../20-app-in-the-ai/02-webshop-mcp-server/EXERCISE.md</code></a>, Abschnitt 4.1.</li>
<li><code>confirm-demo</code> aus Hello MCP ist ein separates Rückfragebeispiel.</li>
</ul>
</details>

---

## 2b · Demo und Übung 2: Shop im Assistenten

- **Demo:** Suche und Warenkorb über MCP, danach dasselbe Konto im Browser ansehen
- **Schon fertig:** Tool-Registrierungen, Schemas, Transport und Shop-Logik
- **Ergänzen:** Sechs Callbacks und `cartPayload` in `server.ts`
- **Prüfen:** Suche, Add, Remove, Checkout und `getOrders`, einschliesslich Kontotrennung
- **Ergebnis:** HTTP-MCP und Browser zeigen nach Reload dieselbe Bestellung
- **Übungsanleitung:** [`20-app-in-the-ai/02-webshop-mcp-server/EXERCISE.md`](../20-app-in-the-ai/02-webshop-mcp-server/EXERCISE.md)

<details>
<summary>Speaker Notes</summary>
<ul>
<li>Im Termin mindestens ein echter Host-Aufruf. Manuelles stdio ist optional.</li>
</ul>
</details>

---

## 2c · MCP Apps: Oberfläche im Assistenten

- MCP Apps ergänzen Tool-Resultate um interaktive HTML-Oberflächen
- Der Server stellt die Oberfläche als `ui://`-Resource bereit
- `_meta.ui.resourceUri` verknüpft ein Tool mit seiner Oberfläche
- Ein UI-fähiger Host lädt die Resource und zeigt sie in einer Sandbox
- Im Webshop: Search-App mit Produktkarten und Cart-App mit Warenkorb

<details>
<summary>Speaker Notes</summary>
<ul>
<li>14:20–15:30 · Einstieg und Demo zusammen 10 Minuten.</li>
<li>Quelle: <a href="https://modelcontextprotocol.io/extensions/apps/overview">MCP Apps</a>.</li>
</ul>
</details>

---

## 2c · Daten und Aktionen über die Host-Bridge

1. Der Host ruft ein Tool auf und lädt die zugehörige HTML-Resource
2. Die eingebettete App erhält Tool-Eingaben und Resultate über die Bridge
3. Ein Button ruft mit `callServerTool` über den Host ein weiteres Tool auf
4. Die App zeigt den zurückgegebenen Zustand an

- Ein Button kann damit eine Shop-Aktion ohne weiteren Modellaufruf auslösen

<details>
<summary>Speaker Notes</summary>
<ul>
<li>Quelle: <a href="https://modelcontextprotocol.io/extensions/apps/overview">MCP Apps</a>.</li>
<li>Workshop-Ablauf: <a href="../20-app-in-the-ai/03-webshop-mcp-app/EXERCISE.md"><code>../20-app-in-the-ai/03-webshop-mcp-app/EXERCISE.md</code></a>.</li>
</ul>
</details>

---

## 2c · Zwei Apps, dasselbe Konto

- **Search-App:** Produkte suchen, Menge wählen, Artikel hinzufügen
- **Cart-App:** Warenkorb anzeigen, Position entfernen, Bestellung abschicken
- Die Search-App übernimmt das Konto aus Tool-Eingaben bzw. Resultaten
- Schreibende Bridge-Aufrufe geben die `loginId` ausdrücklich weiter
- Die eingebettete App übernimmt keine Browser-Session des separat geöffneten Shops

---

## 2c · Demo und Übung 3: Produktkarten und Warenkorb

- **Demo:** Suchen im Gespräch, hinzufügen in der Search-App, bestellen in der Cart-App
- **Schon fertig:** MCP-Tools, React-Oberflächen und Bridge-Gerüst
- **Ergänzen:** Zwei Resources mit `registerUiResource` registrieren, sechs Tools zuordnen
- **Verbinden:** Kontoübernahme sowie Add, Remove und Checkout über die Bridge
- **Prüfen:** Lokal beide Apps bedienen, dann im verfügbaren UI-Host und Webshop vergleichen
- **Übungsanleitung:** [`20-app-in-the-ai/03-webshop-mcp-app/EXERCISE.md`](../20-app-in-the-ai/03-webshop-mcp-app/EXERCISE.md)

<details>
<summary>Speaker Notes</summary>
<ul>
<li>Nach UI-Änderungen <code>npm run build:apps</code>. Konto, Mengen und Order-ID vergleichen.</li>
<li>Ein Host mit reiner Tool-Unterstützung belegt noch keine funktionierende App-Darstellung.</li>
</ul>
</details>

---

## 3 · WebMCP: Tools in der geöffneten Seite

- Die Webseite stellt strukturierte Funktionen für Browser-Agenten bereit
- Der Tool-Code läuft im Dokument der Seite
- WebMCP ist eine Browser-API in Entwicklung, unabhängig vom MCP-Transportprotokoll
- Der Agent stellt den Modellzugang, die Seite ihre Funktionen
- Im Workshop prüfen wir die API im vorbereiteten Chrome

<details>
<summary>Speaker Notes</summary>
<ul>
<li>15:40–16:50 · Konzept und Hello-Demo 10 Minuten, Webshop-Demo weitere 10 Minuten.</li>
<li>Quelle: <a href="https://webmachinelearning.github.io/webmcp/">WebMCP-Spezifikation</a>.</li>
<li>Browser-Voraussetzungen: <a href="../30-webmcp/02-webshop-webmcp/docs/WEBMCP-TESTING.md"><code>../30-webmcp/02-webshop-webmcp/docs/WEBMCP-TESTING.md</code></a>.</li>
</ul>
</details>

---

## 3 · Deklarative und imperative Tools

- **Deklarativ:** HTML-Formular mit `toolname` und `tooldescription`
- Formularfelder beschreiben die Eingaben, der Submit-Handler verarbeitet die Aktion
- **Imperativ:** JavaScript registriert Schema und Funktion über `document.modelContext.registerTool`
- **Hello-Demo:** Todo hinzufügen per Formular, Todos auflisten und entfernen per JavaScript
- **Im Webshop:** Fünf imperative Tools verwenden den vorhandenen API-Client

<details>
<summary>Speaker Notes</summary>
<ul>
<li>Demo: <a href="../30-webmcp/01-hello-webmcp/README.md"><code>../30-webmcp/01-hello-webmcp/README.md</code></a>. Keine eigene Teilnehmerübung.</li>
<li>Quelle: <a href="https://webmachinelearning.github.io/webmcp/">WebMCP-Spezifikation</a>.</li>
</ul>
</details>

---

## 3 · WebMCP im Webshop

![WebMCP im Webshop: Im Browser laufen ein Browser-Agent mit eigenem Sprachmodell und die geöffnete Webshop-Seite mit den über document.modelContext.registerTool() registrierten WebMCP-Tools getrennt nebeneinander. Der Aufruf vom Agent zu den Tools bleibt im Browser, kein Netzwerk nötig. Erst der Tool-Aufruf gegen die Web-API unseres App-Servers per fetch() mit Session-Cookie ist ein echter Netzwerk-Request. Das Tool-Resultat löst im Browser das Event shop:cart-changed aus, worauf die Shop-UI neu lädt.](slides-assets/webmcp-architektur.svg)

- Der Browser-Agent ruft ein registriertes Tool der Seite auf
- Das Tool verwendet die bestehende Web-API mit der Session des Tabs
- Die Konto-ID kommt aus der Session, ohne `loginId` als Tool-Argument
- Serialisierbare Resultate melden Erfolg oder Fehler zurück
- Shop-Events aktualisieren die sichtbare Suche, den Warenkorb und die Bestellungen

<details>
<summary>Speaker Notes</summary>
<ul>
<li>Das Sprachmodell steckt im Browser-Agent, die Tools stecken in der geöffneten Seite — beides ausserhalb unseres Servers. Nur der Aufruf gegen die Web-API ist ein echter Netzwerk-Request, der Aufruf vom Agent zu den Tools bleibt im Browser. Bearbeitbare Grafik: <a href="slides-assets/webmcp-architektur.svg"><code>slides-assets/webmcp-architektur.svg</code></a>.</li>
<li>Grundlage: <a href="../30-webmcp/02-webshop-webmcp/EXERCISE.md"><code>../30-webmcp/02-webshop-webmcp/EXERCISE.md</code></a>.</li>
<li>Der Shop benötigt weiterhin sein Backend und den Katalogdienst.</li>
</ul>
</details>

---

## 3 · Verfügbarkeit und Lebenszyklus

- Vor der Registrierung prüfen, ob `document.modelContext` verfügbar ist
- Der klassische Shop bleibt auch ohne WebMCP bedienbar
- Tools beim Einbinden registrieren, beim Unmount über ein Abort-Signal abmelden
- Der WebMCP-Checkout hat keinen eigenen Freigabedialog
- Die Freigabe im eingebauten Chat gilt nur für dessen Modell-Aufrufe

<details>
<summary>Speaker Notes</summary>
<ul>
<li>Grundlage: <a href="../30-webmcp/02-webshop-webmcp/EXERCISE.md"><code>../30-webmcp/02-webshop-webmcp/EXERCISE.md</code></a>.</li>
<li>Abort-Signal: <a href="https://webmachinelearning.github.io/webmcp/">WebMCP-Spezifikation</a>.</li>
</ul>
</details>

---

## 3 · Demo und Übung 4: den sichtbaren Shop bedienen

- **Demo:** Browser-API prüfen, Tools auflisten und Shop-Aktionen ausführen
- **Schon fertig:** Shop, Chat, MCP Apps, API-Client und Provider-Gerüst
- **Ergänzen:** Fünf Tools, Shop-Events, Registrierung und Abort-Cleanup in `webmcp-tools.ts`
- **Prüfen:** Suche, Add, Remove und Checkout mit dem sichtbaren Shop vergleichen
- **Abnahme:** Übungstest und native Chrome-Tests, zusätzlich manueller Browser-Durchlauf
- **Übungsanleitung:** [`30-webmcp/02-webshop-webmcp/EXERCISE.md`](../30-webmcp/02-webshop-webmcp/EXERCISE.md)

<details>
<summary>Speaker Notes</summary>
<ul>
<li>Node-Tests mit Testdoubles ersetzen die native Browser-Prüfung nicht.</li>
<li>Tool-Konsole und native Tests benötigen keinen Modellaufruf.</li>
</ul>
</details>

---

## 4 · Die drei Zugänge im Vergleich

![Aufrufwege der drei Zugänge: Mensch, Browser-Agent, Chat-Widget, externer Agent und MCP Apps als fünf Einstiege oben. Mensch und Browser-Agent nutzen beide die Web-API. Das Chat-Widget ruft /api/chat auf, das mit einem Sprachmodell im Wechsel steht und AI-SDK-Tools ausführt. Der externe Agent und MCP Apps rufen beide den MCP-Endpunkt auf. AI-SDK-Tools und der MCP-Endpunkt rufen beide dieselbe Tool-Handler-Schicht auf. Web-API und Tool-Handler münden beide im selben Shop-Modul mit Katalogdienst und In-Memory-Zustand. Gelb hervorgehobene Boxen sind die drei Stellen, an denen ein Sprachmodell entscheidet, welches Tool aufgerufen wird.](slides-assets/drei-zugaenge-architektur.svg)

| | Chat in der App | MCP / MCP Apps | WebMCP |
|---|---|---|---|
| Einstieg | Unser Chat | Externer KI-Host | Agent im geöffneten Tab |
| Tool-Anbindung | SDK am App-Server | MCP-Server | Browser-API der Seite |
| Konto im Workshop | Browser-Session | Explizite `loginId` | Session des Tabs |
| Darstellung | Shop und Chat-Widgets | Host, optional eingebettete Apps | Bestehende Shop-Seite |
| Modellzugang | App-Provider-Key | Host bzw. Benutzer | Browser-Agent bzw. Benutzer |

<details>
<summary>Speaker Notes</summary>
<ul>
<li>16:50–17:00 · Auswertung und Fragen.</li>
<li>Modellzugang beschreibt die Zuständigkeit, nicht ein bestimmtes Bezahlmodell.</li>
<li>Aufrufweg-Diagramm nachgezeichnet aus <a href="../30-webmcp/02-webshop-webmcp-solution/docs/ARCHITECTURE.md"><code>../30-webmcp/02-webshop-webmcp-solution/docs/ARCHITECTURE.md</code></a>. Bearbeitbare Grafik: <a href="slides-assets/drei-zugaenge-architektur.svg"><code>slides-assets/drei-zugaenge-architektur.svg</code></a>.</li>
<li>Grundlage: <a href="WORKSHOP.md"><code>WORKSHOP.md</code></a>, Patterns für die gemeinsame Auswertung.</li>
</ul>
</details>

---

## 4 · Gemeinsame Leitplanken

- Beschreibung und Schema machen Funktionen für das Modell verständlich
- Shop-Regeln gehören in die Fachlogik, Adapter verbinden sie mit dem jeweiligen Zugang
- Konto, Zustand und UI-Aktualisierung müssen pro Zugang zusammenpassen
- Freigaben brauchen eine durchgesetzte Ausführungsgrenze, ein Prompt allein genügt nicht
- Fremde Tool-Inhalte können Modelle beeinflussen, Rechte und Limits gehören in Anwendungscode

---

## 4 · Auswertung und nächste Schritte

- Wo passt ein eigener Chat, wo MCP mit UI, wo die geöffnete Webseite?
- Bei welchen Aktionen braucht unsere Anwendung eine verbindliche Freigabe?
- Welche eigenen Übungen und Host-/Browser-Prüfungen sind noch offen?
- **Ausblick:** Echte Authentifizierung, dauerhafte Datenspeicherung und Betriebsgrenzen
- **Vertiefung:** Tasks für lange Abläufe und Distribution an Benutzer

<details>
<summary>Speaker Notes</summary>
<ul>
<li>Übungen: <a href="EXERCISES.md"><code>EXERCISES.md</code></a>. Hintergrund: <a href="teil-1-theorie--ki-in-der-app.md"><code>teil-1-theorie--ki-in-der-app.md</code></a>, <a href="teil-2-theorie--app-in-der-ki.md"><code>teil-2-theorie--app-in-der-ki.md</code></a> und <a href="teil-3-theorie--webmcp.md"><code>teil-3-theorie--webmcp.md</code></a>.</li>
<li>Offene Abnahmen festhalten. Eine gezeigte Musterlösung ersetzt die eigene Prüfung nicht.</li>
</ul>
</details>
