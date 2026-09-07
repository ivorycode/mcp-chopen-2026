<!--
Markdown-Foliensatz zum Tagesprogramm in WORKSHOP.md, Stand 7. September 2026.
Jeder Abschnitt zwischen zwei --- ist eine Folie. Die Blocknummer steht im Titel.
Die Zeitangaben beziehen sich auf den gesamten Block inklusive Demo und Übung.
Quellen und Moderationshinweise stehen in HTML-Kommentaren.
-->

# 0 · Vom KI-Chatbot zur MCP-App

- CH Open Workshop-Tage 2026
- Erst kommt die KI in die App, dann die App in die KI
- Ein Webshop als durchgehendes Beispiel

<!-- 09:00–09:15 · Einstieg, klassische Shop-Demo und kurzer lokaler Check. -->

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

<!-- Lokaler Ersatz: ../30-webmcp/02-webshop-webmcp-solution/README.md.
Beim Einstieg nur den klassischen Shop zeigen. Lokaler Starter:
../10-ai-in-the-app/02-chatbot-vercel-ai-sdk/README.md. -->

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

<!-- 09:15–09:50 · SDK-Einstieg, Tool Calling und Tool-Schleife zusammen 5 Minuten.
Das Beispiel zuerst als einfachen Textaufruf erklären. console.log gibt die Antwort
im Terminal aus. Das Sprachmodell läuft beim Anbieter, nicht im Node.js-Prozess.
Voraussetzungen: Pakete ai und @ai-sdk/anthropic installiert, API-Key als
Umgebungsvariable gesetzt. Den Schlüssel nicht in den Quellcode schreiben.
Modell-ID und Pakete entsprechen der vorbereiteten Wetter-Demo. Dort kapselt
createModel() die Provider-Auswahl und das Laden der .env für alle drei Anbieter.
Referenz: ../10-ai-in-the-app/00-tool-calling-demo-solution/src/provider.ts.
SDK-Dokumentation: https://ai-sdk.dev/docs/ai-sdk-core/generating-text. -->

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

<!-- Das Beispiel zeigt nur die Tool-Definition. Den generateText-Aufruf der
vorherigen Folie um tools ergänzen und als Prompt «Wie ist das Wetter in Bern?»
verwenden. Die Wetterwerte sind fest vorgegebene Demo-Daten, keine Live-Abfrage.
Für die anschliessende Antwort nach dem Tool-Resultat zusätzlich isStepCount aus
ai importieren und stopWhen: isStepCount(4) setzen. Das erklärt die nächste Folie.
Die Livedemo variiert ihre simulierte Temperatur anhand des Ortsnamens. -->

---

## 1a · Die Tool-Schleife

![Tool-Schleife: Die Anwendung sendet Prompt, Tool-Definitionen und Verlauf an das Modell. Bei einem Tool-Aufruf führt das SDK die Funktion aus, ergänzt das Resultat und ruft das Modell erneut auf. Ohne weiteren Tool-Aufruf gibt die Anwendung die Textantwort aus.](slides-assets/tool-schleife.svg)

- Die Schleife läuft in der Anwendung, das SDK übernimmt die einzelnen Schritte
- `stopWhen: isStepCount(4)` begrenzt die Schleife auf höchstens vier Modellaufrufe

<!-- Das Limit kann die Schleife auch vor einer abschliessenden Textantwort beenden.
Das Modell kann mehrere Tools in einer Runde anfordern. Das Diagramm zeigt zur
Einführung einen einzelnen Tool-Aufruf. Bearbeitbare Grafik: assets/tool-schleife.svg. -->

---

## 1a · Demo und Mini-Übung: Aufrufe sichtbar machen

- **Wetter-Demo:** Tool-Definition, Modell-Argumente und Ausführung live verfolgen
- **Shop-CLI:** Automatische SDK-Schleife mit manueller Schleife vergleichen
- **Mini-Übung:** `getArticleDetail` als viertes Tool ergänzen
- **Prüfen:** «Welche Allergene enthält die Vollmilch?» und die Tool-Schritte im Log verfolgen
- **Vergleich:** Provider wechseln und denselben Auftrag wiederholen
- **Optional:** Streaming — Antworttext und Tool-Argumente treffen stückweise ein

<!-- Wetter-Demo: ../10-ai-in-the-app/00-tool-calling-demo-solution/DEMO.md.
Mini-Übung: ../10-ai-in-the-app/01-tool-calling-basics/EXERCISE.md.
Streaming ist Schritt 5 der Wetter-Demo und Vorgriff auf 1b; bei Zeitdruck
zuerst diesen Punkt und dann den Provider-Vergleich kürzen. -->

---

## 1b · Chatbot im Webshop

- Der Browser sendet Nachrichten an die Chat-Route des App-Servers
- Der Server hält den Provider-Key und steuert die Tool-Schleife
- Die Tools rufen die vorhandene Shop-Logik auf
- Das gewählte Demo-Konto kommt aus der Browser-Session
- Die App stellt den Modellzugang und verantwortet dessen Verbrauch

<!-- 10:05–11:25 · Architektur und Demo zusammen 10 Minuten.
Implementierung: ../10-ai-in-the-app/02-chatbot-vercel-ai-sdk-solution/src/features/chat/. -->

---

## 1b · Streaming und zwei Chat-Oberflächen

- Das Vercel AI SDK streamt Text, Tool-Aufrufe, Resultate und Freigabeanfragen
- `useChat` stellt diese Nachrichten im Browser als typisierte Parts bereit
- **Assistant im Shop:** Textdialog, Tools aktualisieren die Shop-Oberfläche
- **Workspace unter `/chat`:** Produktkarten und Warenkorb direkt im Gespräch
- Shop-Events sorgen nach Änderungen für aktuelle Warenkorb- und Bestelldaten

---

## 1b · Checkout mit Freigabe

- Ein vom Modell angeforderter Checkout wartet auf Zustimmung
- Die SDK-Freigabe unterbricht die Ausführung bis zur Antwort
- **Nein:** Warenkorb erhalten, keine Bestellung erzeugen
- **Ja:** Bestellung ausführen und Bestell-ID anzeigen
- Ein direkter Bestellbutton ist selbst die bewusste Bestellaktion

<!-- Im Vercel-Projekt: toolApproval am streamText-Aufruf.
Fachliche Grundlage: ../10-ai-in-the-app/02-chatbot-vercel-ai-sdk/EXERCISE.md.
Die Freigabe gehört zum Chat-Ablauf und schützt nicht automatisch andere Adapter. -->

---

## 1b · Demo und Übung 1: Warenkorb im Chat

- **Demo:** Suche und Warenkorb in Assistant und Workspace vergleichen
- **Schon fertig:** Shop, Suche, Streaming und Produktkarten
- **Ergänzen:** `getCart`, `addToCart`, `removeFromCart` und `checkout`
- **Verbinden:** Warenkorbdarstellung, Shop-Events und Checkout-Freigabe
- **Prüfen:** Über Texteingaben suchen, hinzufügen, entfernen und Checkout mit Nein/Ja testen

<!-- Starter und Abnahme: ../10-ai-in-the-app/02-chatbot-vercel-ai-sdk/EXERCISE.md.
Direkte Widget-Buttons ersetzen den Test der Modell-Tools nicht. -->

---

## 1c · Vergleich: TanStack AI

- Gleiche Shop-Funktionen und Chat-Modi, andere SDK-Anbindung
- Vercel verbindet Schema und Ausführung über `tool()`
- TanStack trennt `toolDefinition()` und Server-Handler über `.server()`
- Vercel nutzt Tool-Approval, TanStack unterbricht per Interrupt bis zur Freigabe
- **Jetzt:** Diese Stellen in der fertigen TanStack-Lösung vergleichen

<!-- 11:25–11:30 · Eine Folie direkt am Code zeigen.
Demo: ../10-ai-in-the-app/03-chatbot-tanstack-ai-solution/README.md.
Alternative Übung: ../10-ai-in-the-app/03-chatbot-tanstack-ai/EXERCISE.md.
Keine zweite Chat-Implementierung im Tagesprogramm. Die MCP-Kette baut auf Vercel auf. -->

---

## 2a · MCP: die App für externe Assistenten

- Model Context Protocol standardisiert den Zugriff auf externe Funktionen und Inhalte
- **Host:** KI-Anwendung, in der der Benutzer arbeitet
- **Client:** MCP-Verbindung innerhalb des Hosts
- **Server:** Stellt die Funktionen und Inhalte unserer Anwendung bereit
- Der Host steuert das Modell, unser Server führt die Shop-Funktionen aus

<!-- 11:30–12:00 · Theorie insgesamt 10 Minuten.
Quelle: [MCP-Architektur](https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture). -->

---

## 2a · Tools, Resources und Prompts

- **Tools:** Aufrufbare Funktionen, zum Beispiel `add(a, b)`
- **Resources:** Abrufbare Inhalte, zum Beispiel `hello://about`
- **Prompts:** Wiederverwendbare Nachrichtenvorlagen, zum Beispiel `greet`
- Ein Prompt liefert zunächst eine Vorlage, noch keine Modellantwort
- Im Webshop stehen Tools für Suche, Warenkorb und Bestellungen im Mittelpunkt

<!-- Quelle: [MCP-Architektur](https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture).
Konkrete Beispiele: ../20-app-in-the-ai/01-hello-mcp/EXERCISE.md. -->

---

## 2a · Transport und Protokollstand

- **stdio:** Der Client startet einen lokalen Serverprozess
- **Streamable HTTP:** Der Client erreicht den Server über einen HTTP-Endpunkt
- Das Repository verwendet die MCP-Revision **2026-07-28**
- Diese Revision übermittelt Version und Client-Fähigkeiten pro Anfrage, ohne Initialisierungs-Handshake
- Fachlichen Zustand verwaltet weiterhin die Anwendung

<!-- Quellen: [MCP-Architektur](https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture),
[Änderungen 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/changelog).
Header-Details und Migrationen gehören in die Übungsunterlagen. -->

---

## 2a · Demo und Mini-Übung: Hello MCP

- **Demo:** SDK-Client verbindet sich, listet Angebote auf und ruft sie ab
- **Erkunden:** `add`, `hello://about` und `greet` im Inspector ausprobieren
- **Verbinden:** Im vorbereiteten Host einen echten Tool-Aufruf nachvollziehen
- Der Server ist fertig, es ist kein Code zu ergänzen
- **Optional:** `confirm-demo` zeigt eine Rückfrage über mehrere Request-Runden (MRTR)

<!-- Anleitung: ../20-app-in-the-ai/01-hello-mcp/EXERCISE.md.
Inspector und SDK-Client benötigen für diese Beispiele keinen Modellaufruf.
MRTR: [Änderungen 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/changelog).
Nach diesem Block Mittagspause. -->

---

## 2b · Der Webshop als MCP-Server

- Der MCP-Adapter verbindet externe Tool-Aufrufe mit vorhandenen Shop-Handlern
- Fünf bekannte Tools für Suche und Warenkorb, zusätzlich `getOrders`
- Der Server liefert lesbaren Text in `content` und Daten in `structuredContent`
- Fachliche Fehler sollen für den Aufrufer auswertbar bleiben
- Der externe Assistent bringt seinen Modellzugang mit

<!-- 13:00–14:05 · Einstieg und Demo zusammen 10 Minuten.
Grundlage: ../20-app-in-the-ai/02-webshop-mcp-server/EXERCISE.md. -->

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

<!-- Freigaben: ../20-app-in-the-ai/02-webshop-mcp-server/EXERCISE.md, Abschnitt 4.1.
confirm-demo aus Hello MCP ist ein separates Rückfragebeispiel. -->

---

## 2b · Demo und Übung 2: Shop im Assistenten

- **Demo:** Suche und Warenkorb über MCP, danach dasselbe Konto im Browser ansehen
- **Schon fertig:** Tool-Registrierungen, Schemas, Transport und Shop-Logik
- **Ergänzen:** Sechs Callbacks und `cartPayload` in `server.ts`
- **Prüfen:** Suche, Add, Remove, Checkout und `getOrders`, einschliesslich Kontotrennung
- **Ergebnis:** HTTP-MCP und Browser zeigen nach Reload dieselbe Bestellung

<!-- Starter und Abnahme: ../20-app-in-the-ai/02-webshop-mcp-server/EXERCISE.md.
Im Termin mindestens ein echter Host-Aufruf. Manuelles stdio ist optional. -->

---

## 2c · MCP Apps: Oberfläche im Assistenten

- MCP Apps ergänzen Tool-Resultate um interaktive HTML-Oberflächen
- Der Server stellt die Oberfläche als `ui://`-Resource bereit
- `_meta.ui.resourceUri` verknüpft ein Tool mit seiner Oberfläche
- Ein UI-fähiger Host lädt die Resource und zeigt sie in einer Sandbox
- Im Webshop: Search-App mit Produktkarten und Cart-App mit Warenkorb

<!-- 14:20–15:30 · Einstieg und Demo zusammen 10 Minuten.
Quelle: [MCP Apps](https://modelcontextprotocol.io/extensions/apps/overview). -->

---

## 2c · Daten und Aktionen über die Host-Bridge

1. Der Host ruft ein Tool auf und lädt die zugehörige HTML-Resource
2. Die eingebettete App erhält Tool-Eingaben und Resultate über die Bridge
3. Ein Button ruft mit `callServerTool` über den Host ein weiteres Tool auf
4. Die App zeigt den zurückgegebenen Zustand an

- Ein Button kann damit eine Shop-Aktion ohne weiteren Modellaufruf auslösen

<!-- Quelle: [MCP Apps](https://modelcontextprotocol.io/extensions/apps/overview).
Workshop-Ablauf: ../20-app-in-the-ai/03-webshop-mcp-app/EXERCISE.md. -->

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

<!-- Starter und Abnahme: ../20-app-in-the-ai/03-webshop-mcp-app/EXERCISE.md.
Nach UI-Änderungen npm run build:apps. Konto, Mengen und Order-ID vergleichen.
Ein Host mit reiner Tool-Unterstützung belegt noch keine funktionierende App-Darstellung. -->

---

## 3 · WebMCP: Tools in der geöffneten Seite

- Die Webseite stellt strukturierte Funktionen für Browser-Agenten bereit
- Der Tool-Code läuft im Dokument der Seite
- WebMCP ist eine Browser-API in Entwicklung, unabhängig vom MCP-Transportprotokoll
- Der Agent stellt den Modellzugang, die Seite ihre Funktionen
- Im Workshop prüfen wir die API im vorbereiteten Chrome

<!-- 15:40–16:50 · Konzept und Hello-Demo 10 Minuten, Webshop-Demo weitere 10 Minuten.
Quelle: [WebMCP-Spezifikation](https://webmachinelearning.github.io/webmcp/).
Browser-Voraussetzungen: ../30-webmcp/02-webshop-webmcp/docs/WEBMCP-TESTING.md. -->

---

## 3 · Deklarative und imperative Tools

- **Deklarativ:** HTML-Formular mit `toolname` und `tooldescription`
- Formularfelder beschreiben die Eingaben, der Submit-Handler verarbeitet die Aktion
- **Imperativ:** JavaScript registriert Schema und Funktion über `document.modelContext.registerTool`
- **Hello-Demo:** Todo hinzufügen per Formular, Todos auflisten und entfernen per JavaScript
- **Im Webshop:** Fünf imperative Tools verwenden den vorhandenen API-Client

<!-- Demo: ../30-webmcp/01-hello-webmcp/README.md. Keine eigene Teilnehmerübung.
Quelle: [WebMCP-Spezifikation](https://webmachinelearning.github.io/webmcp/). -->

---

## 3 · WebMCP im Webshop

- Der Browser-Agent ruft ein registriertes Tool der Seite auf
- Das Tool verwendet die bestehende Web-API mit der Session des Tabs
- Die Konto-ID kommt aus der Session, ohne `loginId` als Tool-Argument
- Serialisierbare Resultate melden Erfolg oder Fehler zurück
- Shop-Events aktualisieren die sichtbare Suche, den Warenkorb und die Bestellungen

<!-- Grundlage: ../30-webmcp/02-webshop-webmcp/EXERCISE.md.
Der Shop benötigt weiterhin sein Backend und den Katalogdienst. -->

---

## 3 · Verfügbarkeit und Lebenszyklus

- Vor der Registrierung prüfen, ob `document.modelContext` verfügbar ist
- Der klassische Shop bleibt auch ohne WebMCP bedienbar
- Tools beim Einbinden registrieren, beim Unmount über ein Abort-Signal abmelden
- Der WebMCP-Checkout hat keinen eigenen Freigabedialog
- Die Freigabe im eingebauten Chat gilt nur für dessen Modell-Aufrufe

<!-- Grundlage: ../30-webmcp/02-webshop-webmcp/EXERCISE.md.
Abort-Signal: [WebMCP-Spezifikation](https://webmachinelearning.github.io/webmcp/). -->

---

## 3 · Demo und Übung 4: den sichtbaren Shop bedienen

- **Demo:** Browser-API prüfen, Tools auflisten und Shop-Aktionen ausführen
- **Schon fertig:** Shop, Chat, MCP Apps, API-Client und Provider-Gerüst
- **Ergänzen:** Fünf Tools, Shop-Events, Registrierung und Abort-Cleanup in `webmcp-tools.ts`
- **Prüfen:** Suche, Add, Remove und Checkout mit dem sichtbaren Shop vergleichen
- **Abnahme:** Übungstest und native Chrome-Tests, zusätzlich manueller Browser-Durchlauf

<!-- Starter und Abnahme: ../30-webmcp/02-webshop-webmcp/EXERCISE.md.
Node-Tests mit Testdoubles ersetzen die native Browser-Prüfung nicht.
Tool-Konsole und native Tests benötigen keinen Modellaufruf. -->

---

## 4 · Die drei Zugänge im Vergleich

| | Chat in der App | MCP / MCP Apps | WebMCP |
|---|---|---|---|
| Einstieg | Unser Chat | Externer KI-Host | Agent im geöffneten Tab |
| Tool-Anbindung | SDK am App-Server | MCP-Server | Browser-API der Seite |
| Konto im Workshop | Browser-Session | Explizite `loginId` | Session des Tabs |
| Darstellung | Shop und Chat-Widgets | Host, optional eingebettete Apps | Bestehende Shop-Seite |
| Modellzugang | App-Provider-Key | Host bzw. Benutzer | Browser-Agent bzw. Benutzer |

<!-- 16:50–17:00 · Auswertung und Fragen.
Modellzugang beschreibt die Zuständigkeit, nicht ein bestimmtes Bezahlmodell.
Grundlage: WORKSHOP.md, Patterns für die gemeinsame Auswertung. -->

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

<!-- Übungen: EXERCISES.md. Hintergrund: teil-1-theorie--ki-in-der-app.md,
teil-2-theorie--app-in-der-ki.md und teil-3-theorie--webmcp.md.
Offene Abnahmen festhalten. Eine gezeigte Musterlösung ersetzt die eigene Prüfung nicht. -->
