# Vom KI-Chatbot zur MCP-App

Workshop an den CH Open Workshop-Tagen 2026. Erst kommt die KI in die App – dann die App in die KI.

Der Einstieg zeigt die [Abschlusslösung](../30-webmcp/02-webshop-webmcp-solution/README.md) zunächst nur als klassischen Webshop mit Kontoauswahl, Suche, Warenkorb und Bestellungen. Dafür ist die [öffentliche Demo](https://mcp-webshop-demo.fly.dev) vorgesehen; die lokal vorbereitete Musterlösung dient als Ersatz. Danach erschliessen wir dieselbe Shop-Funktionalität in drei Teilen:

1. **KI in der App** – Tool Calling und ein Chatbot im Webshop mit dem Vercel AI SDK; TanStack AI als Vergleich und alternative Übung.
2. **App in der KI** – der Webshop wird über einen MCP-Server und zwei MCP Apps in einen externen KI-Assistenten eingebunden.
3. **Agent-gesteuerte App** – die geöffnete Webseite stellt ihre Funktionen über WebMCP als Browser-Tools bereit.

Den gemeinsamen fachlichen Kern bilden `searchProducts`, `getCart`, `addToCart`, `removeFromCart` und `checkout`. Ab der MCP-Stufe kommt `getOrders` hinzu. Die Adapter unterscheiden sich bei Transport, Kontoübergabe, Ergebnisformat und Darstellung; die Shop-Regeln bleiben gleich. Jede Webshop-Kopie enthält ihre benötigte Logik lokal.

## Vorbereitung

Führe vorab den [Setup-Check](../00-setup-check/README.md) aus: Er prüft Node.js/npm und einen echten Modell-Aufruf. Dort stehen auch die Schritte für API-Keys. Die allgemeine Vorbereitung für Software, Konten und Repository steht in [README_SETUP.md](../README_SETUP.md).

Damit die unten geplanten Übungszeiten für Implementierung und Prüfung verfügbar sind, gehört zusätzlich vor den Workshop:

- **Projekte vorbereiten:** `npm ci` jeweils in den benötigten Projektordnern ausführen; es gibt keine gemeinsame Installation im Repository-Root. Lokale `.env` anhand der jeweiligen Vorlage einrichten und vorhandene Einstellungen erhalten. Den Katalog-Mock und den Vercel-Chatbot-Starter einmal starten, Demo-Konto auswählen und die Suche prüfen. Für Teil 1 zusätzlich den echten Chat-Aufruf testen.
- **Node-Version abstimmen:** Für den gesamten Workshop Node.js ab **22.19** verwenden, wie in den MCP-Übungen verlangt. Der minimale Shop-/Setup-Check ab 22.18 allein deckt diese Voraussetzung nicht ab.
- **MCP-Zugang vorbereiten:** Einen der in den Übungen beschriebenen Hosts samt Anmeldung bereithalten. Übung 2 beschreibt Claude Desktop und ChatGPT über HTTPS; Übung 3 beschreibt dieselben Hosts mit eingebetteter UI. Für den beschriebenen Remote-Zugang ngrok samt Konto vorbereiten. Einrichtung und Verfügbarkeit stehen in den jeweiligen Übungsanleitungen.
- **Browser und Tests vorbereiten:** Playwright-Chromium für die Shop-/MCP-App-Tests installieren. Für WebMCP zusätzlich den in der [WebMCP-Testanleitung](../30-webmcp/02-webshop-webmcp/docs/WEBMCP-TESTING.md) beschriebenen Chrome vorbereiten und die API-Verfügbarkeit gemäss [Übung 4](../30-webmcp/02-webshop-webmcp/EXERCISE.md) prüfen. Die native Suite benötigt Google Chrome, nicht nur Playwright-Chromium. Die Inspector-Extension ist ein zusätzlicher Prüfweg.

Die Workshop-Leitung bereitet die Demo-Projekte, Musterlösungen, den lokalen MCP-App-Host und den Chrome-Durchlauf ebenfalls vor. Installationen und erstmalige Konto-/Tunnel-Einrichtung sind keine verlässliche Fünf-Minuten-Aufgabe während eines Übungsteils.

## Unterlagen nach Teil

Alle Übungen in Workshop-Reihenfolge mit Kurzbeschreibung: [EXERCISES.md](EXERCISES.md). Für konkrete Implementierungsschritte und Abnahme gelten die `EXERCISE.md` der Starter und die README-Dateien der Projekte. Die Theorieunterlagen liefern den Hintergrund; diese Übersicht legt den Tagesablauf fest.

| Zeit | Teil | Unterlagen |
|---|---|---|
| 09:00 | Einstieg und Ausgangslage | [Abschlusslösung](../30-webmcp/02-webshop-webmcp-solution/README.md) · [Chatbot-Starter](../10-ai-in-the-app/02-chatbot-vercel-ai-sdk/README.md) |
| 09:15 | Teil 1 · KI in der App | [Theorieunterlagen](teil-1-theorie--ki-in-der-app.md) · [Tool-Calling-Livedemo](../10-ai-in-the-app/00-tool-calling-demo-solution/DEMO.md) |
| 11:30 | Teil 2a · MCP-Grundlagen | [Theorieunterlagen](teil-2-theorie--app-in-der-ki.md) · [Hello-MCP-Mini-Übung](../20-app-in-the-ai/01-hello-mcp/EXERCISE.md) |
| 12:00 | Mittagspause | |
| 13:00 | Teil 2b/2c · MCP-Server und MCP Apps | [Übung 2](../20-app-in-the-ai/02-webshop-mcp-server/EXERCISE.md) · [Übung 3](../20-app-in-the-ai/03-webshop-mcp-app/EXERCISE.md) |
| 15:40 | Teil 3 · WebMCP | [Theorieunterlagen](teil-3-theorie--webmcp.md) · [Übung 4](../30-webmcp/02-webshop-webmcp/EXERCISE.md) |
| 16:50 | Zusammenfassung und Fragen | [Slides für alle Workshop-Blöcke](slides.md) |

## Didaktisches Grundmuster

Wir wiederholen **Mechanismus zeigen → am Webshop nachvollziehen → selbst ergänzen → Ergebnis prüfen**. Die Zeiten richten sich nach den tatsächlichen Lücken der Starter; nicht jeder Abschnitt erhält nochmals eine vollständige Theorie- und Demo-Einführung.

- **Kleine Beispiele:** Die Wetter-Tool-Livedemo führt Tool Calling ohne Shop ein. `01-tool-calling-basics` vertieft es mit drei fertigen Shop-Tools und einer Mini-Übung. Hello MCP ist eine Erkundungs- und Verbindungsübung an einem fertigen Server. Hello WebMCP bleibt eine Trainer-Demo ohne eigene `EXERCISE.md`.
- **Vier Hauptübungen:** Chat, MCP-Server, MCP Apps und WebMCP werden schrittweise ergänzt. Die Trainer-Demo verwendet jeweils die Musterlösung; die Teilnehmer arbeiten im Starter.
- **Unabhängig weiterarbeiten:** Jeder nächste Starter enthält die gelösten Vorstufen. Es werden weder Dateien noch Laufzeitdaten aus der eigenen vorherigen Lösung übernommen. Eine offene Übung blockiert dadurch den nächsten Teil nicht.
- **TanStack AI:** Der Starter ist eine Alternative zur Vercel-Übung mit vergleichbarem Umfang. Im gemeinsamen Tagesablauf wird nur die fertige Lösung kurz verglichen; eine zweite vollständige Chat-Implementierung ist nicht eingeplant. Die MCP-Hauptkette baut auf Vercel auf.
- **Prüfung gehört zur Übung:** Toolliste oder grünes `npm test` allein belegen keinen gelösten Starter. Nach den Implementierungsschritten folgen die jeweilige Übungsabnahme und ein sichtbarer fachlicher Durchlauf.

## Tagesprogramm (09:00–17:00)

Die Planung umfasst **380 Minuten Inhalt und Arbeit**, **60 Minuten Mittag** und **40 Minuten Kurzpausen**, insgesamt 480 Minuten. Sie setzt das vorbereitete Setup und angeleitetes Arbeiten mit den vorhandenen Schrittanleitungen voraus. Die Minutenaufteilung innerhalb der Teile dient der Moderation; Prüfungen und Besprechung sind darin enthalten.

| Zeit | Dauer | Teil | Ablauf und erreichbares Ergebnis |
|---|---|---|---|
| 09:00–09:15 | 15 min | **0 · Einstieg** | Tagesziel und drei Architekturen; Abschlusslösung als klassischen Shop zeigen. Lokal Katalog und Chatbot-Starter kurz prüfen. Demo-Konten und simulierte Bestellungen erklären. |
| 09:15–09:50 | 35 min | **1a · Tool Calling Basics** | **5 min** Konzept, **10 min** Wetter-Tool live gemäss `00-tool-calling-demo-solution/DEMO.md`, **5 min** automatische/manuelle Schleife der Shop-CLI, **10 min** Mini-Übung: das vierte Tool `getArticleDetail` ergänzen und Provider-Wechsel vergleichen, **5 min** Auswertung. Das Modell erzeugt Aufruf-Argumente; Anwendung und SDK führen aus. |
| 09:50–10:05 | 15 min | Pause | |
| 10:05–11:25 | 80 min | **1b · Chatbot in der App / Übung 1** | **10 min** Architektur und Demo beider Chat-Modi, **50 min** Implementierung, **15 min** Prüfungen, **5 min** Debrief. Suche, Streaming und Produktkarten sind fertig. Ergänzt werden `getCart`, `addToCart`, `removeFromCart`, `checkout`, Warenkorbdarstellung im Workspace, Shop-Events und Checkout-Freigabe. Zustimmung und Ablehnung gehören zur Pflichtübung. |
| 11:25–11:30 | 5 min | **1c · TanStack-AI-Vergleich** | An der fertigen TanStack-Lösung Tool-Definition/Server-Handler und Interrupt-Freigabe den Vercel-Bausteinen gegenüberstellen. Auf die alternative Übung verweisen; kein erneutes Implementieren. |
| 11:30–12:00 | 30 min | **2a · MCP-Grundlagen / Mini-Übung** | **10 min** Rollen, Tools/Resources/Prompts sowie HTTP und stdio, **5 min** Hello-MCP-Demo mit SDK-Client, **10 min** angeleitete Erkundung und Verbindung im vorbereiteten Inspector/Host, **5 min** Auswertung. Der Server enthält `add`, `confirm-demo`, `hello://about` und `greet`. Kein Server-Code ist zu ergänzen. Die im Repository verwendete MCP-Revision 2026-07-28 einordnen; MRTR anhand von `confirm-demo` bei Bedarf vertiefen. |
| 12:00–13:00 | 60 min | Mittag | |
| 13:00–14:05 | 65 min | **2b · Webshop als MCP-Server / Übung 2** | **10 min** Demo und Callback-/Kontovertrag, **30 min** sechs Callbacks plus `cartPayload` in `server.ts`, **20 min** Abnahme und HTTP-/Host-Durchlauf, **5 min** Debrief. Suche mit optionaler `loginId`, alle Cart-/Order-Tools mit gültiger ID. Suche → Add → Remove → Checkout → `getOrders` prüfen und nach Browser-Reload Zustand vergleichen. Manuelles stdio ist eine optionale Vertiefung. |
| 14:05–14:20 | 15 min | Pause | |
| 14:20–15:30 | 70 min | **2c · MCP Apps / Übung 3** | **10 min** Demo und Resource-/Bridge-Ablauf, **35 min** Implementierung, **20 min** Build, Tests und UI-Durchlauf, **5 min** Debrief. Beide HTML-Resources über den vorbereiteten Helfer `registerUiResource` registrieren, sechs Tools per `_meta.ui.resourceUri` zuordnen, Konto in der Search-App übernehmen und Hinzufügen, Entfernen sowie Checkout über `callServerTool` verbinden. React-Oberflächen und Bridge-Gerüst sind vorbereitet. Zuerst lokal prüfen, danach in einem verfügbaren UI-fähigen Host. |
| 15:30–15:40 | 10 min | Pause | |
| 15:40–16:50 | 70 min | **3 · WebMCP / Übung 4** | **10 min** Konzept und Hello-Demo mit deklarativem Todo-Formular sowie imperativen Tools, **10 min** Webshop-Demo und `document.modelContext` prüfen, **30 min** fünf Tools, Shop-Events, Registrierung und Abort-Cleanup in `webmcp-tools.ts` ergänzen, **15 min** Node-Abnahme, native Browser-Tests und sichtbaren Shop-Durchlauf prüfen, **5 min** Debrief. Der Browser-Adapter nutzt den bestehenden API-Client mit der Session des Tabs. |
| 16:50–17:00 | 10 min | **4 · Abschluss** | Gemeinsamkeiten und Unterschiede der drei Zugänge, Zuständigkeit für Modellkosten und Freigaben, offene Prüfungen, Fragen und nächste Schritte. Authentifizierung, Tasks und Distribution als Ausblick. |





## Aufbau des Repositories

```text
00-course-material/                 Zentrale Workshop-Unterlagen
  WORKSHOP.md                       Überblick, Tagesprogramm und Didaktik
  EXERCISES.md                      Übungsindex
  slides.md                         Theorie-Einstiege und Übergänge zu Demo/Übung
  teil-1-theorie--ki-in-der-app.md  Teil 1: Theorie und Verweise
  teil-2-theorie--app-in-der-ki.md  Teil 2: Theorie und Verweise
  teil-3-theorie--webmcp.md         Teil 3: Theorie und Verweise
00-setup-check/                     Vorab-Check: Node.js, npm und AI-Provider
01-mock-api/                       Gemeinsamer lokaler Katalogdienst
10-ai-in-the-app/
  00-tool-calling-demo-solution/    Wetter-Tool-Livedemo; Anleitung in DEMO.md
  01-tool-calling-basics/           Shop-CLI und Mini-Übung: Artikeldetails
  01-tool-calling-basics-solution/  Musterlösung der Mini-Übung; Szenarien in README.md
  02-chatbot-vercel-ai-sdk/         Übung 1: Warenkorb-Tools und Chat-UI
  02-chatbot-vercel-ai-sdk-solution/
  03-chatbot-tanstack-ai/           Alternative zu Übung 1
  03-chatbot-tanstack-ai-solution/  Musterlösung und Vergleichsdemo
20-app-in-the-ai/
  01-hello-mcp/                    Fertiger Server und Erkundungsübung
  02-webshop-mcp-server/           Übung 2: sechs MCP-Callbacks
  02-webshop-mcp-server-solution/
  03-webshop-mcp-app/              Übung 3: Search- und Cart-App anbinden
  03-webshop-mcp-app-solution/
30-webmcp/
  01-hello-webmcp/                 Statische Todo-Demo, keine eigene Übung
  02-webshop-webmcp/               Übung 4: fünf Browser-Tools und Cleanup
  02-webshop-webmcp-solution/      Kumulative Abschlusslösung inkl. Deployment
README_SETUP.md                    Allgemeine Vorbereitung
```

Die Hauptkette lautet **Vercel-Chatbot → MCP-Server → MCP Apps → WebMCP**, jeweils mit Starter und Musterlösung. Alle acht Projekte sind eigenständig installierbare Kopien; die letzte Musterlösung enthält den vollständigen Funktionsumfang. TanStack ist ein paralleles Starter-/Lösungspaar. Setup-Check, Katalogdienst, Wetter-Livedemo, Shop-CLI, Hello MCP und Hello WebMCP stehen ausserhalb der Hauptkette.

Die Übungs-Starter dokumentieren in ihrer `README.md` knapp, wie das Projekt gestartet wird; die Aufgabe selbst steht in der `EXERCISE.md`. Die Wetter-Livedemo verwendet `DEMO.md`. Bei den beiden Mini-Übungen `01-tool-calling-basics` und `01-hello-mcp` enthält die `EXERCISE.md` auch Start und Konfiguration; sie haben deshalb keine eigene `README.md`. Die vier Hauptübungen und die TanStack-Alternative haben jeweils eine Lösung im benachbarten `-solution`-Ordner. Hello MCP und Tool Calling Basics werden direkt im bereits lauffähigen Beispiel erkundet bzw. erweitert; für Tool Calling Basics liegt der fertige Stand zusätzlich in `01-tool-calling-basics-solution/`, dessen `README.md` die Szenarien erklärt.

Die Webshop-Stufen verwenden die Demo-Konten `restaurant-baeren`, `hotel-alpenblick` und `kantine-campus`. Ein Browser-Cookie hält die Kontoauswahl; der Shop hält Warenkörbe und Bestellungen im Prozessspeicher. Checkout macht die aktive `cartId` zur `orderId`; das nächste Hinzufügen erzeugt einen neuen Warenkorb. Ein Shop-Neustart setzt den Zustand zurück. Zwischen Starter und Musterlösung werden keine Daten geteilt.

## Ports und laufende Dienste

| Anwendung | Port |
|---|---|
| Katalog-Mock-API | 4040 |
| Teil 1 · Chatbot Vercel AI SDK (Starter / Lösung) | 3031 / 3032 |
| Teil 1 · Chatbot TanStack AI (Starter / Lösung) | 3033 / 3034 |
| Teil 2 · Hello MCP (HTTP) | 3040 |
| Teil 2 · Webshop MCP-Server (Starter / Lösung) | 3041 / 3042 |
| Teil 2 · Webshop MCP Apps (Starter / Lösung) | 3043 / 3044 |
| Teil 3 · Hello WebMCP | 3050 |
| Teil 3 · Webshop WebMCP (Starter / Lösung) | 3051 / 3052 |
| Lokaler MCP-App-Host / Sandbox | 43552 / 43553 |
| Automatische Shop-/MCP-App-Browser-Tests: Shop / Katalog | 43554 / 43555 |
| Native WebMCP-Tests: Shop / Katalog | 43556 / 43557 |

Bei den Webshops liegen `/`, `/chat` und ab der MCP-Stufe `/mcp` auf demselben Projektport. stdio und die Tool-Calling-CLI öffnen keinen HTTP-Port. Für den MCP Inspector gilt die beim Start ausgegebene Adresse.

Den Katalog auf 4040 kann die Gruppe durch alle Shop-Übungen weiterverwenden. Lokale Hosts der verschiedenen Projektkopien verwenden dieselben Ports 43552/43553: nur einen gleichzeitig starten und vor den entsprechenden Browser-Tests beenden. Diese Tests starten ihre eigenen Dienste; die native WebMCP-Suite verwendet separat 43556/43557. Tests verschiedener Projekte mit denselben Ports nacheinander ausführen. Entwicklungs-Tunnel nach dem Host-Test beenden.
