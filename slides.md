# Vom KI-Chatbot zur MCP-App – Stichworte für die Folien

> Diese Datei ist die aktuelle Vortragsquelle. `slides/mcp-jugs-2026.pdf` ist ein historischer Keynote-Export vom 21. Mai 2026. Die Keynote-Quelldatei und ein reproduzierbarer Export-Workflow liegen nicht im Repository; deshalb kann die PDF nicht zuverlässig aus dieser Markdown-Quelle regeneriert werden und bleibt bis zum manuellen Keynote-Export sichtbar veraltet.

Vorlage für die grafische Ausarbeitung. Pro Folie ein Abschnitt mit Titel und Bullet Points. Reihenfolge entspricht dem Tagesprogramm.

---

## 0 · Einstieg

### Titel
- Vom KI-Chatbot zur MCP-App
- Erst kommt die KI in die App – dann die App in die KI
- CH Open Workshop-Tage 2026

### Die Geschichte in einem Satz
- "We used to add chatbots to our apps. Now we add our apps to the chatbots." (Kent C. Dodds)
- Drei Mechanismen, wie KI eine Applikation bedienen kann:
  - KI in der App (Chatbot)
  - App in der KI (MCP, MCP Apps)
  - Agent-gesteuerte App (WebMCP)

### Ausgangslage: ein herkömmlicher Webshop
- Einstieg auf `https://mcp-webshop-demo.fly.dev`: zuerst nur Login, Suche, Cart und Orders zeigen
- Browser-Oberfläche: Suche, Artikeldetails, Warenkorb, Checkout
- HTTP-API: `/api/search`, `/api/cart`, `/api/cart/checkout`
- Domain-Logik lokal in jedem eigenständigen Workshop-Projekt
- Demo: klassische Webshop-Funktionen im 1b-Starter

### Roter Faden
- Ein Tool-Contract, ein Domain-Core, drei Transportwege
- Tools: `searchProducts`, `getCart`, `addToCart`, `removeFromCart`, `checkout`
- Dieselben Tools werden dreimal registriert: im AI SDK, im MCP-Server, im Browser

### Architekturbild (drei Spalten)
- KI in der App: Browser → App-Server → LLM (App bezahlt das Modell)
- App in der KI: KI-Host (Claude, ChatGPT) → MCP-Server → App-Logik (Benutzer bezahlt das Modell)
- Agent-gesteuerte App: Browser-Agent → WebMCP-Tools auf der Seite → App-API (Browser bringt das Modell mit)

---

## 1 · KI in der App

### Tool Calling: das Fundament
- Moderne LLMs sind darauf trainiert, Funktionen aufzurufen
- Tool = Name + Beschreibung + Eingabe-Schema (JSON Schema) + Implementierung
- Das Modell ruft nichts selbst auf: Es erzeugt eine strukturierte Aufruf-Anfrage, die Applikation führt aus
- Die Beschreibung ist das "User Interface" des Tools für das Modell

### Die Agent-Schleife
- Prompt + Tool-Definitionen → Modell
- Modell antwortet mit Text oder Tool-Aufruf
- Applikation führt das Tool aus, hängt das Resultat an die Konversation
- Wiederholen, bis das Modell ohne Tool-Aufruf antwortet (oder Schritt-Limit)
- Demo: `01-tool-calling-basics` (jeder Schritt wird protokolliert)

### Geschichte
- 2022: ReAct, Prompt-basierte "Werkzeuge"
- 2023: OpenAI Function Calling
- 2024: Anthropic Tool Use, MCP (November)
- 2025/26: Apps SDK, MCP Apps, WebMCP

### Vercel AI SDK
- Provider-neutral: OpenAI, Anthropic, Google über `@ai-sdk/*`
- `generateText` / `streamText`, `tool()` mit Zod-Schema, `stopWhen: stepCountIs(n)`
- UI-Messages mit Parts: Text, Tool-Aufruf, Tool-Resultat
- `useChat` im Browser, `toUIMessageStreamResponse()` auf dem Server
- Demo/Übung: `02-chatbot-vercel-ai-sdk`

### Chatbot in der App: Architektur
- Chat-Route auf dem Server hält den API-Key; der Browser spricht nie direkt mit dem Provider
- Tools laufen serverseitig und greifen auf die bestehende Session zu (Warenkorb = Benutzer)
- Tool-Resultate werden in der UI als Komponenten gerendert (Produktkarten, Warenkorb)
- Die Oberfläche reagiert auf Tool-Aufrufe (Suche anzeigen, Warenkorb aktualisieren)

### Worauf achten
- Kosten und Missbrauch: Rate Limits, Schritt-Limits, kurze Tool-Resultate
- Human-in-the-loop: Checkout nur nach Bestätigung (Tool-Approval)
- Resultate für das Modell klein halten, Resultate für die UI vollständig
- Prompt Injection über Tool-Resultate (Produktbeschreibungen sind Fremddaten)

### TanStack AI
- Gleiche Konzepte, anderes SDK: Tool-Definitionen, Adapter, Chat-Hook
- Erkenntnis: Die Patterns sind SDK-unabhängig
- Demo: `03-chatbot-tanstack-ai-solution`

### Erkenntnisse Block 1
- Tool Calling ist die Basis aller weiteren Blöcke
- Die Tool-Schicht ist dünn, die Domain-Logik bleibt in der App
- Die App bezahlt das Modell und trägt die Verantwortung für Sicherheit und Kosten

---

## 2 · App in der KI

### Was ist MCP
- Model Context Protocol: offener Standard für die Verbindung von KI-Applikationen mit externen Systemen
- November 2024 von Anthropic veröffentlicht; seit Dezember 2025 in der Agentic AI Foundation (Linux Foundation)
- Rollen: Host (Claude, ChatGPT, IDE), Client (im Host), Server (stellt Tools bereit)
- Primitives: Tools, Resources, Prompts
- Transporte: stdio (lokal), Streamable HTTP (remote)

### Wer nutzt MCP
- Assistenten: Claude, ChatGPT, Copilot, Gemini
- IDEs und Coding-Agenten: VS Code, Cursor, Claude Code
- Remote-Server von Atlassian, GitHub, Oracle, Stripe, ...

### Spezifikation 2026-07-28: MCP wird stateless
- Kein `initialize`-Handshake, keine `Mcp-Session-Id`
- Jede Anfrage trägt Protokollversion und Client-Capabilities in `_meta`
- `server/discover` zur Abfrage von Version und Capabilities
- Pflicht-Header `Mcp-Method` und `Mcp-Name` auf Streamable HTTP
- Listen-Resultate sind cachebar (`ttlMs`, `cacheScope`) und pro Server identisch

### Spezifikation 2026-07-28: weitere Änderungen
- Multi-Round-Trip-Requests (`resultType: "input_required"`) ersetzen Server-initiierte Anfragen (Elicitation, Sampling, Roots)
- `subscriptions/listen` ersetzt GET-Stream und Resource-Subscriptions
- Tasks und Apps als offizielle Extensions
- Roots, Sampling, Logging deprecated (12 Monate Übergangsfrist)
- Feature-Lifecycle und Deprecation-Policy

### Was stateless für die Applikation bedeutet
- Jede Anfrage kann auf jeder Server-Instanz landen (Round-Robin, Serverless, Edge)
- Demo-Identität wird explizit: `loginId` in jedem kontogebundenen MCP-Aufruf, keine Authentifizierung
- Erstes Add erzeugt Cart; Checkout übernimmt dessen ID als Order-ID; nächstes Add erzeugt einen neuen Cart
- Erkenntnis: Browser, Chat, MCP und MCP App sehen denselben kontogebundenen Zustand

### TypeScript SDK v2
- Packages: `@modelcontextprotocol/server`, `/client`, `/express`, `/node`
- `createMcpHandler(factory, { legacy: 'reject' })` – ein Server pro Anfrage
- `registerTool(name, { inputSchema, outputSchema, annotations }, handler)`
- `inputRequired()` für Rückfragen an den Benutzer
- Demo: `01-hello-mcp`, Übung: `02-webshop-mcp-server`

### Tool-Design für Modelle
- Beschreibung sagt, wann und wofür das Tool zu verwenden ist
- Kleine, klar strukturierte Resultate: `structuredContent` für Code, `content` (Text) für das Modell
- Annotations: `readOnlyHint`, `destructiveHint`
- Deterministische Tool-Listen (Prompt-Caching)

### Testen und Anbinden
- MCP Inspector 2.x (`protocolEra: "modern"`), curl mit `_meta`-Envelope, SDK-Client
- ChatGPT und Claude: verpflichtende Remote-Abnahme für Tools und MCP Apps
- Goose: Best Effort mit demselben modernen Endpunkt, Ergebnis protokollieren, kein eigener Legacy-Transport
- Authorization: OAuth 2.1, Client ID Metadata Documents statt Dynamic Client Registration

### MCP Apps: Tools mit UI
- Ein Tool liefert Daten und eine renderbare Oberfläche
- `ui://`-Resource (HTML) wird vom Host in einem sandboxed iframe gerendert
- Verknüpfung über `_meta.ui.resourceUri` am Tool
- Die UI ist Renderer der Tool-Resultate und gleichzeitig Client (`callServerTool`)
- Entstanden aus MCP-UI und OpenAI Apps SDK; offizielle Extension seit Januar 2026

### MCP Apps: Host-Kommunikation
- `useApp()` aus `@modelcontextprotocol/ext-apps/react`
- `ontoolinput`, `ontoolresult`: Resultate empfangen
- `callServerTool`, `sendMessage`, `updateModelContext`: zurück zum Server und Modell
- Host-Kontext: Theme, Display-Mode, Sprache
- Übung: `03-webshop-mcp-app`

### Deployment und Distribution
- MCP-Server werden wie Web-Services betrieben; stateless vereinfacht Skalierung
- Benutzer "installieren" Apps im Host (Claude Connectors, ChatGPT Apps)
- Proprietäre Verzeichnisse, Hosting-Plattformen (z. B. alpic)
- Ausblick: öffentliche Registry, Discovery

### MCP vs. CLI + Skills
- Trend im Agentic Engineering: lokale stdio-Server werden durch CLI + Skills ersetzt (Token-Effizienz, einfache Auth)
- Remote Streamable-HTTP-Server bleiben wertvoll: zentral betrieben, für Endbenutzer-Assistenten
- Erkenntnis: MCP ist für Endbenutzer-Szenarien relevanter als für Entwickler-Werkzeuge

### Erkenntnisse Block 2
- Derselbe Tool-Contract wie in Block 1, anderer Transport
- Der Benutzer bringt das Modell mit; die App stellt Funktionalität bereit
- Zustand explizit über Handles, nicht über Sessions
- UI wandert als Resource in den Host

---

## 3 · WebMCP

### Was ist WebMCP
- Vorgeschlagener Web-Standard (W3C Web Machine Learning CG), getrieben von Google und Microsoft
- Web-Seiten exponieren strukturierte Tools für Browser-Agenten
- Clientseitig, DOM-API, kein Transportprotokoll
- Nicht Teil des MCP-Standards, aber gleiche Idee: Tools für Agenten

### Zwei APIs
- Imperativ: `document.modelContext.registerTool({ name, description, inputSchema, execute })`
- Deklarativ: `<form toolname tooldescription>` mit `toolparamdescription` auf Feldern
- Rückgabe: beliebiger JSON-Wert; der Browser serialisiert
- Abmelden über `AbortSignal`; `annotations.readOnlyHint`

### Stand August 2026
- Workshop-Browser: Chrome mit `chrome://flags/#enable-webmcp-testing` und Inspector-Extension
- Kein Origin-Trial-Token im Workshop
- Andere Browser sind kein Workshop-Abnahmepfad
- Firefox, Safari: in Diskussion, keine Implementierung
- API ist von `navigator.modelContext` nach `document.modelContext` gewandert
- Agenten: Inspector-Extension, Gemini in Chrome angekündigt

### Agent-gesteuerte App: Architektur
- Der Agent sitzt im Browser und sieht die Tools der Seite
- Tools rufen die bestehende App-API auf und aktualisieren die Oberfläche
- Der Benutzer sieht, was der Agent tut
- Demo: `01-hello-webmcp`, Übung: `02-webshop-webmcp`

### Sicherheit
- Tools laufen mit den Rechten der Seite und des angemeldeten Benutzers
- `untrustedContentHint`, `agentInvoked` beim Submit
- Permissions-Policy `tools` für iframes
- Nur exponieren, was auch über die Oberfläche möglich ist

### Erkenntnisse Block 3
- Dritte Registrierung desselben Tool-Contracts
- Kein Server, kein Protokoll: die Seite selbst ist der Tool-Server
- Der Browser bringt das Modell mit; die App bezahlt nichts

---

## 4 · Zusammenfassung

### Drei Mechanismen im Vergleich
- KI in der App: App bezahlt, volle Kontrolle, eigene UI
- App in der KI: Benutzer bezahlt, Host-UI, Distribution über Verzeichnisse
- Agent-gesteuerte App: Browser bezahlt, bestehende UI, Standard noch in Entstehung

### Patterns
- Tool = Beschreibung + Schema + Funktion; das Schema ist UI für das Modell
- Domain-Logik in einem Core, Tool-Schicht dünn
- Demo-Identität explizit: Browser-Session, MCP-`loginId`, ausgewähltes Konto im Tab
- Resultate dual: strukturiert für Code und UI, Text für das Modell
- Human-in-the-loop bei Seiteneffekten (Bestätigung, MRTR, Annotations)
- Fremddaten in Tool-Resultaten sind nicht vertrauenswürdig

### Neue UI-Paradigmen
- Wie navigiert man in einem Chatbot?
- "Components will kill pages": Komponenten statt Seiten
- Persönliche Einschätzung: Browser werden nicht so bald ersetzt

### Produktionsreife
- Abschlusslösung auf Fly: Live-Katalog, genau eine Machine, flüchtiger In-Memory-State
- Provider-Key als Secret; Provider, Modell, Limits und Guards als Runtime-Konfiguration
- Manuell deployen, Logs prüfen, auf 0 deaktivieren und auf 1 aktivieren
- Vieles ist experimentell; Spezifikationen ändern sich im Monatsrhythmus
- Stateless MCP macht Betrieb einfacher
- Frameworks und Patterns entwickeln sich schnell; beobachten lohnt sich

### Links
- Repository mit Demos und Übungen
- MCP-Spezifikation 2026-07-28: https://modelcontextprotocol.io/specification/2026-07-28/changelog
- MCP Apps: https://modelcontextprotocol.io/extensions/apps/overview
- WebMCP: https://webmachinelearning.github.io/webmcp/
- Vercel AI SDK: https://ai-sdk.dev/ · TanStack AI: https://tanstack.com/ai
