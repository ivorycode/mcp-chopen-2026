# Vom KI-Chatbot zur MCP-App

Workshop an den CH Open Workshop-Tagen 2026. Erst kommt die KI in die App – dann die App in die KI.

Der Einstieg beginnt auf der [deployten Abschlusslösung](https://mcp-webshop-demo.fly.dev): zunächst nur mit Login, Suche, Warenkorb und Bestellungen. Danach entsteht dieselbe Lösung kumulativ in drei Blöcken:

1. **KI in der App** – ein Chatbot im Webshop macht die Funktionalität über ein Chat-Interface zugänglich (Tool Calling, Vercel AI SDK, TanStack AI).
2. **App in der KI** – der Webshop wird als MCP-Server und als MCP-App in einen KI-Assistenten (Claude, ChatGPT, ...) eingebunden (MCP-Spezifikation 2026-07-28).
3. **Agent-gesteuerte App** – die Web-Applikation exponiert ihre Funktionalität clientseitig über WebMCP für Browser-Agenten.

Alle drei Szenarien verwenden dieselben lokal enthaltenen Tools (`searchProducts`, `getCart`, `addToCart`, `removeFromCart`, `checkout`). Der Unterschied liegt im Transportweg zum Modell.

## Vorbereitung: minimaler Durchstich

Führe vorab den [Setup-Check](../00-setup-check/README.md) aus: Er prüft Node.js/npm und einen echten API-Aufruf mit einem günstigen Modell. Dort stehen auch die Schritte für API-Keys und die Installation eines KI-Assistenten für Teil 2. Der zusätzliche Webshop-Funktionstest steht in [README_SETUP.md](../README_SETUP.md).

## Unterlagen nach Block

Alle Übungen in Workshop-Reihenfolge mit Kurzbeschreibung: [EXERCISES.md](EXERCISES.md).

| Zeit | Block | Unterlagen |
|---|---|---|
| 09:00 | Einstieg und Ausgangslage | [Chatbot-Starter](../10-ai-in-the-app/02-chatbot-vercel-ai-sdk/README.md) |
| 09:30 | Block 1 · KI in der App | [Blockunterlagen](10-ai-in-the-app.md) |
| 12:15 | Mittagspause | |
| 13:15 | Block 2 · App in der KI (MCP, MCP Apps) | [Blockunterlagen](20-app-in-the-ai.md) |
| 16:00 | Block 3 · WebMCP | [Blockunterlagen](30-webmcp.md) |
| 16:45 | Zusammenfassung und Patterns | [slides.md](../slides.md) |

## Didaktisches Grundmuster

Jeder der drei Blöcke hat dieselbe Dramaturgie – das macht die Gemeinsamkeiten sichtbar:

1. **Theorie (15–20 min)** – Konzept, Architekturbild, wo die Grenze zwischen App und KI liegt.
2. **Hello World (Demo, 10 min)** – ein minimales, webshop-freies Beispiel (< 100 Zeilen), das nur den Mechanismus zeigt.
3. **Webshop-Demo (Trainer, 15 min)** – der Mechanismus am «echten» Webshop, fertig implementiert.
4. **Übung (45–60 min)** – Teilnehmer bauen den Webshop-Teil selbst, mit Starter, TODOs und Lösung.
5. **Debrief (10 min)** – was war gleich, was anders als im letzten Block → Patterns sammeln.

Roter Faden über alle Blöcke: **ein Tool-Contract, ein Domain-Core, drei Transportwege.** `searchProducts`, `addToCart`, `getCart`, `checkout` sind in allen drei Blöcken dieselben Tools – einmal als Vercel-AI-Tool, einmal als MCP-Tool, einmal als WebMCP-Tool. Jedes eigenständige Projekt enthält die dafür benötigte Shop-Logik lokal.

---

## Tagesprogramm (09:00–17:00)

| Zeit | Block | Inhalt |
|---|---|---|
| 09:00–09:30 | **0 · Einstieg** | Story («AI in die App / App in die AI / Agent-gesteuerte App»), Ziel des Tages, Architekturbild mit den 3 Szenarien. Die deployte Abschlusslösung wird zunächst nur als klassischer Webshop gezeigt. Danach Prüfung des minimalen Vorab-Setups aus Mock-API und 1b-Starter, ohne zwingenden LLM-Aufruf. |
| 09:30–10:00 | **1a · Tool Calling Basics** | Theorie: Tool Calling = das Fundament aller drei Szenarien. Hello World: `01-tool-calling-basics` – Node-Skript mit `generateText` + `tools` + `stopWhen`, Agent-Loop sichtbar gemacht (Log jedes Steps). Mini-Übung (10 min): ein zweites Tool hinzufügen, Provider per ENV wechseln. |
| 10:00–10:15 | Pause | |
| 10:15–11:45 | **1b · Chatbot in der App** | Theorie: Streaming, UI-Messages, Tool-Results als UI, Sicherheits-/Kosten-Aspekte («App pays for LLM»). Demo: `02-chatbot-vercel-ai-sdk` (Chat-Route + `useChat` + Tool-Rendering im Widget). **Übung 1:** Starter hat Chat-Route und Widget, aber leere Tools → Teilnehmer implementieren `searchProducts` und `addToCart` mit `lokalen Shop-Core`, rendern Tool-Results als Produktkarten, fügen `getCart` hinzu. Bonus: `checkout` mit Bestätigung (Human-in-the-loop Tool). |
| 11:45–12:15 | **1c · TanStack AI** | Demo/Vergleich: `03-chatbot-tanstack-ai-solution` – dieselben Tools, gleiches Widget, anderes SDK. Debrief Block 1: was ist SDK-spezifisch, was ist Pattern? |
| 12:15–13:15 | Mittag | |
| 13:15–13:45 | **2a · MCP Grundlagen** | Theorie: Was ist MCP, Hosts/Clients/Server, stdio vs. Streamable HTTP, **Spec 2026-07-28: stateless**, was das für Server bedeutet (Handles statt Sessions, Skalierung). Hello World: `01-hello-mcp` – ein Tool, ein Resource, ein Prompt; mit MCP Inspector und Claude/Claude Code anbinden. |
| 13:45–14:30 | **2b · Webshop als MCP-Server** | Demo: `02-webshop-mcp-server`. **Übung 2:** Cart-Tools verlangen die explizite `loginId`; erstes Add erzeugt Cart, Checkout erzeugt Order mit derselben ID. Test mit Inspector, ChatGPT und Claude; Goose best effort. |
| 14:30–14:45 | Pause | |
| 14:45–15:45 | **2c · MCP Apps** | Theorie: Tools mit UI, `ui://`-Resources, iframe-Host-Bridge, Entstehung (MCP-UI → OpenAI Apps SDK → MCP Apps Extension), Distribution/«App-Stores». Demo: `03-webshop-mcp-app` (Search-UI + Cart-UI in React). **Übung 3:** Starter hat Search-App fertig; Teilnehmer bauen die Cart-App: `registerAppResource` + `registerAppTool` mit `_meta.ui`, `useApp`/`ontoolresult`, `callServerTool` aus der UI. Bonus: deklarieren, welche Tools die UI vom Host braucht. Debrief Block 2. |
| 15:45–16:00 | Pause | |
| 16:00–16:45 | **3 · WebMCP** | Theorie: clientseitige Tools, kein Transport, Agent im Browser (Atlas, Comet, Claude-Extension), Stand des Standards, `document.modelContext`. Hello World: `01-hello-webmcp` – deklaratives `<form toolname>` und imperatives `registerTool` auf einer statischen Seite, testen mit Chrome-Extension/`modelContextTesting`. **Übung 4 (kurz):** Webshop-Tools per `registerTool` exponieren, wieder aus `lokalen Shop-Core`-Contracts; Bonus: Suchformular deklarativ annotieren. |
| 16:45–17:00 | **4 · Abschluss** | Patterns-Übersicht (siehe unten), «Who pays for the LLM», Produktionsreife, Ausblick (Tasks, MRTR, Auth). Q&A. |

Zeitliche Reserve: Block 1c und die Bonus-Aufgaben sind streichbar. Wenn die Gruppe schnell ist, in 2b zusätzlich MRTR zeigen (`checkout` fordert per `input_required` eine Bestätigung an – der Ersatz für Elicitation).

### Patterns, die am Ende an der Wand stehen sollen
- Tool = Beschreibung + Schema + Funktion; das Schema ist UI für das LLM.
- Business-Logik gehört in einen Core, die Tool-Schicht ist dünn (3× denselben Core gesehen).
- Demo-Identität: Browser-Session in Block 1/3, explizite `loginId` in MCP; keine Authentifizierung.
- Ergebnisse sind dual: `structuredContent` für Code/UI + `content` (Text) für das Modell.
- Human-in-the-loop bei Seiteneffekten (Checkout): UI-Bestätigung, MRTR, oder Tool-Annotations.
- Wer hostet das Modell / wer zahlt: App (Block 1) vs. User/Host (Block 2, 3).

## Aufbau des Repositories

```
00-course-material/           Zentrale Workshop-Unterlagen
  WORKSHOP.md                 Überblick, Tagesprogramm und Didaktik
  EXERCISES.md                Alle Übungen in Workshop-Reihenfolge
  10-ai-in-the-app.md         Block 1
  20-app-in-the-ai.md         Block 2
  30-webmcp.md                Block 3
00-setup-check/               Vorab-Check: Node.js, npm und AI-Provider
01-mock-api/                     Eigenständiger lokaler Mock der Katalog-API (Port 4040)
10-ai-in-the-app/
  01-tool-calling-basics/     Demo: Tool-Calling-Schleife als CLI
  02-chatbot-vercel-ai-sdk/   Übung: Chatbot im Webshop (Starter)
  02-chatbot-vercel-ai-sdk-solution/
  03-chatbot-tanstack-ai/     Alternative Übung: TanStack AI (Starter)
  03-chatbot-tanstack-ai-solution/  Musterlösung und Vergleichsdemo
20-app-in-the-ai/
  01-hello-mcp/               Demo: minimaler MCP-Server (stdio + Streamable HTTP)
  02-webshop-mcp-server/      Übung: Webshop als MCP-Server mit expliziter loginId (Starter)
  02-webshop-mcp-server-solution/
  03-webshop-mcp-app/         Übung: MCP-App mit eingebetteter UI (Starter)
  03-webshop-mcp-app-solution/
30-webmcp/
  01-hello-webmcp/            Demo: deklarative und imperative WebMCP-Tools auf einer statischen Seite
  02-webshop-webmcp/          Übung: Webshop-Tools per WebMCP exponieren (Starter)
  02-webshop-webmcp-solution/
README_SETUP.md               Minimale Vorbereitung
slides/                       Folien
slides.md                     Stichworte zu allen Theorieblöcken
```

Jedes Projekt ist eigenständig installierbar und hat ein `README.md` mit lokaler Konfiguration, Startbefehl und sichtbarem Ergebnis. Übungen trennen kleine Pflichtschritte mit direkter Prüfung von Bonusaufgaben; die Musterlösung liegt im Ordner mit Suffix `-solution`.

Alle kumulativen Webshop-Stufen verwenden dieselben drei Demo-Konten. Es gibt keine echte Authentifizierung: Im Browser wird ein Konto ausgewählt, MCP-Aufrufe nennen dessen `loginId` ausdrücklich. Checkout wandelt den aktiven Cart in eine Order um; der nächste Artikel beginnt einen neuen Cart.

## Ports

| Anwendung | Port |
|---|---|
| Katalog-Mock-API | 4040 |
| 01 · Chatbot Vercel AI SDK (Starter / Lösung) | 3031 / 3032 |
| 01 · Chatbot TanStack AI (Starter / Lösung) | 3033 / 3034 |
| 02 · Hello MCP | 3040 |
| 02 · Webshop MCP-Server (Starter / Lösung) | 3041 / 3042 |
| 02 · Webshop MCP-App (Starter / Lösung) | 3043 / 3044 |
| 03 · Hello WebMCP | 3050 |
| 03 · Webshop WebMCP (Starter / Lösung) | 3051 / 3052 |
